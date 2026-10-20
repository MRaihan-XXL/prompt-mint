// DepthGlow e2e — anti-regression suite (Stage 3 permanen).
// Run: node scripts/e2e.mjs            (defaults to live workers.dev)
//      BASE_URL=http://127.0.0.1:8787 node scripts/e2e.mjs
import { request as httpsRequest } from "node:https";
import { request as nodeHttpRequest } from "node:http";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "https://depthglow.m-raihan-izudin.workers.dev").replace(/\/+$/, "");
let failed = 0;
const ok = (cond, label, extra = "") => {
  console.log((cond ? "PASS" : "FAIL") + "  " + label + (extra ? "  [" + extra + "]" : ""));
  if (!cond) failed++;
};

/** Raw HEAD-ish probe (GET, body drained) so duplicate headers stay countable. */
function rawGet(path) {
  const url = new URL(BASE + path);
  const fn = url.protocol === "http:" ? nodeHttpRequest : httpsRequest;
  return new Promise((resolve, reject) => {
    const req = fn(url, (res) => {
      res.resume();
      const pairs = [];
      for (let i = 0; i < res.rawHeaders.length; i += 2) {
        pairs.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
      }
      resolve({ status: res.statusCode, headers: pairs });
    });
    req.on("error", reject);
    req.end();
  });
}
const getAll = (r, name) =>
  r.headers.filter(([k]) => k.toLowerCase() === name.toLowerCase()).map(([, v]) => v);

/** Fetch response body as text (for HTML/XML assertions). */
async function getText(path) {
  const url = new URL(BASE + path);
  const fn = url.protocol === "http:" ? nodeHttpRequest : httpsRequest;
  return new Promise((resolve, reject) => {
    const req = fn(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

// ---------- 1. Header contract (the _headers stacking bug must never return) ----------
{
  const demo = await rawGet("/demos/ocean-shallows/");
  const demoCsp = getAll(demo, "content-security-policy");
  const demoXfo = getAll(demo, "x-frame-options");
  const demoCc = getAll(demo, "cache-control");
  ok(demo.status === 200, "demo status 200", String(demo.status));
  ok(demoCsp.length === 1, "demo: exactly 1 CSP header", "got " + demoCsp.length);
  ok(demoCsp[0]?.includes("frame-ancestors 'self'"), "demo: frame-ancestors 'self'");
  ok(demoXfo.length === 1 && demoXfo[0] === "SAMEORIGIN", "demo: 1 XFO=SAMEORIGIN", demoXfo.join("|"));
  ok(demoCc.length === 1 && /max-age=3600/.test(demoCc[0]), "demo: Cache-Control 3600", demoCc.join("|"));

  const main = await rawGet("/");
  const mainCsp = getAll(main, "content-security-policy");
  const mainXfo = getAll(main, "x-frame-options");
  ok(mainCsp.length === 1, "main: exactly 1 CSP header", "got " + mainCsp.length);
  ok(mainCsp[0]?.includes("frame-ancestors 'none'"), "main: frame-ancestors 'none'");
  ok(mainXfo.length === 1 && mainXfo[0] === "DENY", "main: 1 XFO=DENY", mainXfo.join("|"));
  ok(mainCsp[0]?.includes("www.paypal.com"), "main: PayPal allowed in CSP");

  const vendor = await rawGet("/js/app.js");
  ok(getAll(vendor, "cache-control")[0]?.includes("max-age=300"), "app.js cache 300", getAll(vendor, "cache-control").join("|"));
}

// ---------- 3. SEO + /t/<id> shareable template page ----------
{
  const sitemap = await getText("/sitemap.xml");
  ok(sitemap.status === 200, "sitemap 200", String(sitemap.status));
  ok(sitemap.body.includes(BASE), "sitemap uses live origin (no dead depthglow.dev)");
  ok(!/depthglow\.dev/.test(sitemap.body), "sitemap free of depthglow.dev");
  const urlCount = (sitemap.body.match(/<loc>/g) || []).length;
  ok(urlCount >= 4, "sitemap lists home + 3 template pages", "got " + urlCount + " <loc>");

  const robots = await getText("/robots.txt");
  ok(robots.status === 200 && robots.body.includes(BASE + "/sitemap.xml"), "robots points at live sitemap");

  const home = await getText("/");
  ok(home.body.includes('rel="canonical"') && home.body.includes(BASE + "/"), "home canonical = live origin");
  ok(!/depthglow\.dev/.test(home.body), "home free of depthglow.dev in meta/JSON-LD");

  const tpl = await getText("/t/ocean-shallows");
  ok(tpl.status === 200, "/t/<id> 200", String(tpl.status));
  ok(tpl.body.includes('rel="canonical" href="' + BASE + '/t/ocean-shallows"'), "/t/<id> canonical self-referencing");
  ok(tpl.body.includes('application/ld+json'), "/t/<id> has JSON-LD block");
  ok(tpl.body.includes('"@type":"Product"'), "/t/<id> JSON-LD is Product");
  ok(tpl.body.includes("og:image"), "/t/<id> has og:image");
  const thumbRef = (tpl.body.match(/assets\/thumbs\/ocean-shallows\.webp/) || []).length;
  ok(thumbRef >= 1, "/t/<id> references template thumbnail", "matches=" + thumbRef);

  const missing = await getText("/t/does-not-exist-xyz");
  ok(missing.status === 404, "/t/<unknown> → 404", String(missing.status));
}

// ---------- 4. Preview modal actually loads the demo (frame not rejected) ----------
{
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });

    const firstCard = page.locator('[aria-label^="Open "]').first();
    await firstCard.waitFor({ state: "visible", timeout: 15000 });

    const demoDoc = page.waitForResponse(
      (r) => /\/demos\//.test(r.url()) && r.request().resourceType() === "document" && r.status() === 200,
      { timeout: 20000 }
    );
    await firstCard.click();
    const demoResp = await demoDoc;
    ok(demoResp.status() === 200, "demo document loaded via iframe", "status " + demoResp.status() + " " + new URL(demoResp.url()).pathname);

    await page.locator("#modal.open").waitFor({ state: "visible", timeout: 10000 });
    // give the frame a beat to attach
    let demoFrame = null;
    for (let i = 0; i < 20 && !demoFrame; i++) {
      demoFrame = page.frames().find((f) => f.url().includes("/demos/"));
      if (!demoFrame) await page.waitForTimeout(250);
    }
    ok(!!demoFrame, "iframe attached with /demos/ url", demoFrame ? demoFrame.url() : "no frame");

    let loaded = false;
    if (demoFrame) {
      try {
        await demoFrame.waitForLoadState("domcontentloaded", { timeout: 15000 });
        loaded = await demoFrame.evaluate(
          () => document.readyState !== "loading" && document.body.children.length > 0
        );
      } catch (e) { loaded = false; }
    }
    ok(loaded, "demo document rendered inside sandboxed iframe");

    const iframeVisible = await page.frameLocator("#mFrame").locator("body").isVisible().catch(() => false);
    ok(iframeVisible, "iframe content visible in modal");

    const badErrors = consoleErrors.filter((e) => /refused|frame-ancestors|Content Security Policy/i.test(e));
    ok(badErrors.length === 0, "no CSP/frame console errors", badErrors.slice(0, 2).join(" | "));
  } finally {
    await browser.close();
  }
}

// ---------- 5. 3D (ES-module) preview actually renders — black-canvas regression guard ----------
// Regression this guards: a sandboxed opaque-origin iframe CORS-blocked the
// three.js ES-module import, so every 3D preview showed a black box. The WebGL
// canvas is only appended AFTER the module imports, so canvas presence === fix.
{
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });

    const card3d = page.locator('[aria-label="Open Japan Island Jelly preview"]');
    await card3d.waitFor({ state: "visible", timeout: 15000 });
    await card3d.click();

    let frame = null;
    for (let i = 0; i < 40 && !frame; i++) {
      frame = page.frames().find((f) => f.url().includes("/demos/japan-island"));
      if (!frame) await page.waitForTimeout(250);
    }
    ok(!!frame, "3D preview frame attached", frame ? frame.url() : "no frame");

    let canvasOk = false;
    if (frame) {
      try {
        await frame.waitForSelector("canvas", { timeout: 15000 });
        canvasOk = await frame.evaluate(() => {
          const c = document.querySelector("canvas");
          return !!c && c.width > 0 && c.height > 0;
        });
      } catch (e) { canvasOk = false; }
    }
    ok(canvasOk, "WebGL canvas in 3D preview (module loaded, not black)", canvasOk ? "" : "no canvas");

    const modErrors = consoleErrors.filter((e) =>
      /module|import|cross-origin|resource-policy|CORS|Failed to fetch|dynamically imported/i.test(e)
    );
    ok(modErrors.length === 0, "no module/CORS errors in 3D preview", modErrors.slice(0, 2).join(" | "));
  } finally {
    await browser.close();
  }
}

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
