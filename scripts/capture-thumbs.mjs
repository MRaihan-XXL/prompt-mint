// Capture live screenshots of every demo page → assets/thumbs/<id>.webp
// Usage: node scripts/capture-thumbs.mjs  (expects demos/* already static-servable)
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PORT = 8917;
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".json": "application/json", ".md": "text/markdown",
};

const server = createServer(async (req, res) => {
  try {
    const path = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    const data = await readFile(path);
    res.writeHead(200, { "Content-Type": MIME[extname(path)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("nope");
  }
});
await new Promise((r) => server.listen(PORT, r));

const demos = (await readdir(join(ROOT, "demos"))).filter((d) => !d.startsWith("."));
await mkdir(join(ROOT, "assets", "thumbs"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
let ok = 0, fail = 0;
for (const d of demos) {
  try {
    await page.goto(`http://127.0.0.1:${PORT}/demos/${d}/index.html`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1800); // let entrance animations land
    // Heavy-composer canvases capture black via page.screenshot (headless) —
    // capture canvas.toDataURL FIRST when the demo exposes its QA hook.
    const durl = await page.evaluate(() => {
      const hook = window.__dbg;
      if (!hook || !hook.composer) return null; // no QA hook -> page.screenshot path
      hook.composer.render(0.016);
      const c = document.querySelector("canvas");
      if (!c) return null;
      try { return c.toDataURL("image/png"); } catch { return null; }
    }).catch(() => null);
    if (durl && durl.length > 20000) {
      const buf = Buffer.from(durl.split(",")[1], "base64");
      await (await import("node:fs/promises")).writeFile(join(ROOT, "assets", "thumbs", `${d}.png`), buf);
      console.log(`ok  ${d} (gl ${buf.length}b -> png)`);
    } else {
      await page.screenshot({ path: join(ROOT, "assets", "thumbs", `${d}.webp`), type: "webp", quality: 82 });
      console.log(`ok  ${d}`);
    }
    ok++;
  } catch (e) {
    console.error(`FAIL ${d}: ${e.message}`);
    fail++;
  }
}
await browser.close();
server.close();

// Reconcile: register (weekly-batch) selalu menulis thumb .webp, tapi jalur GL QA-hook
// menghasilkan .png (bukti: firefly-meadow.webp tak pernah ada → card thumb 404).
// Kalau file thumb yang dinyatakan hilang tapi varian .png/.webp id sama ada → tambal json.
try {
  const fsP = await import("node:fs/promises");
  const tp = join(ROOT, "data", "templates.json");
  const tpl = JSON.parse(await fsP.readFile(tp, "utf8"));
  let patched = 0;
  for (const t of tpl.templates || tpl) {
    const base = join(ROOT, "assets", "thumbs", t.id);
    if (t.thumb && !(await fsP.stat(t.thumb.startsWith("assets") ? join(ROOT, t.thumb) : t.thumb).then(() => true).catch(() => false))) {
      let fixed = false;
      for (const alt of [".png", ".webp"]) {
        if (await fsP.stat(base + alt).then(() => true).catch(() => false)) {
          console.log(`reconcile ${t.id}: thumb ${t.thumb} -> assets/thumbs/${t.id}${alt}`);
          t.thumb = `assets/thumbs/${t.id}${alt}`;
          patched++;
          fixed = true;
          break;
        }
      }
      if (!fixed) console.warn(`reconcile ${t.id}: TIDAK ADA thumb sama sekali (declared ${t.thumb})`);
    }
  }
  if (patched) { await fsP.writeFile(tp, JSON.stringify(tpl, null, 2) + "\n"); console.log(`reconcile: ${patched} thumb field patched`); }
} catch (e) { console.warn("reconcile skipped: " + e.message); }

console.log(`done: ${ok} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
