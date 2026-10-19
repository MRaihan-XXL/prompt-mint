// DEPLOY GATE — wajib lulus sebelum deploy (AGENTS.md "DEPLOY GATE").
// Brightness assertion (avg pixel, BUKAN panjang-file), 12s stability,
// 3 viewport (1440/1038x396/390), modal semua template, CTA computed color,
// nFree vs copy konsisten, sitemap == templates.json.
// Usage: node scripts/deploy-gate.mjs [BASE_URL]   (default: local static server)
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { jsSyntaxCheck } from "./lib-js-syntax.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = join(ROOT, "eval-shots");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".json": "application/json", ".md": "text/markdown",
  ".woff2": "font/woff2", ".glb": "model/gltf-binary", ".xml": "application/xml" };

const AVGFLOOR = 8;      // avg sample brightness < 8/255 (~3%) = BLACK = FAIL
const MAXFLOOR = 12;     // max sample < 12 = BLACK = FAIL
const SATFLOOR = 0.05;   // mean HSV-S t9 < 0.05 = GREYBOX/FULL-WHITE (netral) = FAIL
                         // brightness tak bisa menangkap render putih/abu — JEBAKAN BATCH-3 #8
                         // kalibrasi: min sehat live = japan band krem 0.091 (margin 45%);
                         // netral murni putih=0 / greybox≈0.02 — cekup utk kelas bug ini
const STABILITY_S = 12;  // tunggu >=12s — tangkap fade-to-black regression

let fails = 0;
const fail = (msg) => { fails++; console.log(`  FAIL: ${msg}`); };
const pass = (msg) => console.log(`  ok:   ${msg}`);

/* ---------- Part A: static checks (tanpa browser) ---------- */
const tpl = JSON.parse(await readFile(join(ROOT, "data", "templates.json"), "utf8"));
const items = tpl.templates || tpl;
const ids = items.map((t) => t.id);
const sitemap = await readFile(join(ROOT, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>[^<]*\/t\/([^/<]+)<\/loc>/g)].map((m) => m[1]);
const home = await readFile(join(ROOT, "index.html"), "utf8");
const nFree = items.filter((t) => t.tier === "free").length;
const declaredFree = items.filter((t) => t.free).length;
const effectiveFree = Math.max(nFree, declaredFree);
const copySaysFree = /free to try|start free|free prompt/i.test(home);

console.log(`\n== Part A: static (${ids.length} templates, nFree=${effectiveFree}) ==`);
if (JSON.stringify([...ids].sort()) === JSON.stringify([...locs].sort())) pass("sitemap == templates.json");
else fail(`sitemap (${locs.join(",")}) != templates.json (${ids.join(",")})`);
if (copySaysFree === (effectiveFree > 0)) pass(`copy-vs-nFree konsisten (free=${effectiveFree}, copy=${copySaysFree})`);
else fail(`copy janji free=${copySaysFree} tapi nFree=${effectiveFree}`);
for (const t of items) {
  if (!t.id || !t.title || !t.tier || !t.demo) fail(`template ${t.id || "?"}: field wajib hilang`);
  if (!["free", "pro", "max"].includes(t.tier)) fail(`template ${t.id}: tier tidak dikenal "${t.tier}"`);
}

// site-ness per demo (JEBAKAN BATCH-3 #10 / audit 18 Okt): tiap template HARUS
// berupa SITUS (ada judul, deskripsi, headline, tombol, lang) — bukan kanvas polos.
// Prompt vault wajib minta chrome ini; test ini yang menegakkan bar-nya.
for (const t of items) {
  try {
    const html = await readFile(join(ROOT, t.demo, "index.html"), "utf8");
    const miss = [];
    if (!/<title>[^<]{3,}/.test(html)) miss.push("title");
    if (!/<meta name="description" content="[^"]{10,}"/.test(html)) miss.push("meta-desc");
    if (!/<h1[\s>]/i.test(html)) miss.push("h1");
    if (!/<button[\s>]/i.test(html) && !/<a\s[^>]*>[^<]{2,}/i.test(html)) miss.push("cta");
    if (!/<html[^>]*\slang=/.test(html)) miss.push("lang");
    if (miss.length) fail(`${t.id}: BUKAN SITUS — hilang: ${miss.join(", ")}`);
    else pass(`${t.id}: site-ness ok (title+desc+h1+cta+lang)`);
    // JS syntax check (shared lib; bukti: firefly-meadow lolos site-ness tapi scene hitam)
    const jsErrs = jsSyntaxCheck(html);
    if (jsErrs.length) fail(`${t.id}: JS SYNTAX ERROR — ${jsErrs[0]}`);
    else pass(`${t.id}: js syntax ok`);
    // KIBLAT bar: wajib interaction kit (reticle cursor + magnetic buttons + reveal)
    const kitMiss = [];
    if (!html.includes("js/kit/kit.css")) kitMiss.push("kit.css");
    if (!html.includes("js/kit/motion.js")) kitMiss.push("motion.js");
    if (!/<button[^>]*class="[^"]*btn/i.test(html) && !/class="btn/i.test(html)) kitMiss.push("btn");
    if (kitMiss.length) fail(`${t.id}: KIBLAT BAR — kit hilang: ${kitMiss.join(", ")}`);
    else pass(`${t.id}: kiblat kit ok (reticle+magnetic+reveal)`);
    // Tier feature contract (spec pemilik round-7): pro=max pengubah tampilan (data-dc);
    // free dilarang. Legacy 4 di-exempt — dirakit sebelum kontrak ada (retrofit: lihat MEMO §L).
    const LEGACY_NO_DC = new Set(["japan-island", "ocean-shallows", "ghost-pirate-ship", "nexus"]);
    if (!LEGACY_NO_DC.has(t.id)) {
      const dcCount = (html.match(/\sdata-dc=/g) || []).length;
      const dcNeed = t.tier === "max" ? 4 : t.tier === "pro" ? 2 : 0;
      if (dcCount < dcNeed) fail(`${t.id}: tier ${t.tier} — display-changers ${dcCount} < ${dcNeed} (wajib data-dc)`);
      else if (t.tier === "free" && dcCount > 0) fail(`${t.id}: free tier tidak boleh punya display-changers (${dcCount})`);
      else pass(`${t.id}: tier feature ok (data-dc=${dcCount}, butuh ${dcNeed})`);
    } else pass(`${t.id}: legacy exempt (tanpa display-changers)`);
  } catch (e) {
    fail(`${t.id}: baca demo gagal: ${e.message}`);
  }
}

// Larangan protocol eksternal di demo (round-4b / "klik = error"): mailto/tel/http
// bergantung handler OS di mesin user → dialog error Windows. CTA harus in-page.
for (const t of items) {
  try {
    const html = await readFile(join(ROOT, t.demo, "index.html"), "utf8");
    const bad = [...html.matchAll(/href="(mailto:[^"]*|tel:[^"]*|javascript:[^"]*|https?:\/\/[^"]*)"/g)].map((m) => m[1].slice(0, 48));
    if (bad.length) fail(`${t.id}: link eksternal/protocol di demo: ${bad.join(" | ")}`);
    else pass(`${t.id}: tanpa mailto/tel/http eksternal`);
  } catch { /* error baca sudah dilaporkan di site-ness */ }
}

/* ---------- Part B+C: browser checks ---------- */
const argBase = process.argv[2];
let base, server = null;
if (argBase) {
  base = argBase.replace(/\/$/, "");
} else {
  const PORT = 8941;
  server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (path === "/" || path.endsWith("/")) path += "index.html";
      const p = join(ROOT, path);
      const data = await readFile(p);
      res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
      res.end(data);
    } catch { res.writeHead(404); res.end("nope"); }
  });
  await new Promise((r) => server.listen(PORT, r));
  base = `http://127.0.0.1:${PORT}`;
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// brightness sampler: render frame + readPixels dalam SATU evaluate (sync = reliable)
// canvas DIPILIH via renderer.domElement — querySelector("canvas") bisa kena
// canvas2D grain (japan #paper) → readPixels salah buffer = false-black.
const SAMPLE = () => {
  const d = window.__dbg;
  const c = (d && d.renderer && d.renderer.domElement)
    || [...document.querySelectorAll("canvas")].find((el) => {
      try { return !el.getContext("2d"); } catch { return true; } // non-2d = calon webgl
    })
    || document.querySelector("canvas");
  if (!c) return { max: -1, avg: -1, err: "no-canvas" };
  if (d && d.composer) d.composer.render(0.016);
  else if (d && d.renderer && d.scene && d.camera) {
    d.renderer.setRenderTarget(null);
    d.renderer.render(d.scene, d.camera);
  }
  const pts = [];
  for (const fy of [.15, .4, .65, .9]) for (const fx of [.1, .3, .5, .7, .9]) pts.push([fx, fy]);
  let max = 0, sum = 0, n = 0, satSum = 0;
  const acc = (r, g, b) => {
    max = Math.max(max, r, g, b);
    sum += (r + g + b) / 3; n++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    satSum += mx === 0 ? 0 : (mx - mn) / mx;
  };
  const gl = (d && d.renderer && d.renderer.getContext()) || c.getContext("webgl2") || c.getContext("webgl");
  if (gl) {
    const buf = new Uint8Array(4);
    for (const [fx, fy] of pts) {
      gl.readPixels((c.width*fx)|0, (c.height*fy)|0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      acc(buf[0], buf[1], buf[2]);
    }
  } else {
    // 2D fallback — demo non-WebGL (pulseops/aether/robot-foundry): getImageData.
    // Canvas yang sudah punya webgl context tidak bisa getContext("2d") → null → err.
    const ctx = c.getContext("2d");
    if (!ctx) return { max: -1, avg: -1, err: "no-gl-2d" };
    for (const [fx, fy] of pts) {
      const px = ctx.getImageData((c.width*fx)|0, (c.height*fy)|0, 1, 1).data;
      acc(px[0], px[1], px[2]);
    }
  }
  // sat: mean saturasi — render greybox / program-corrupt putih → jatuh ~0
  return { max, avg: +(sum / n).toFixed(1), sat: +(satSum / n).toFixed(3) };
};

const viewports = [{ n: "1440", w: 1440, h: 900 }, { n: "1038x396", w: 1038, h: 396 }, { n: "390", w: 390, h: 844 }];

console.log(`\n== Part B: direct-load ${ids.length} demo x ${viewports.length} viewport, stability ${STABILITY_S}s ==`);
for (const id of ids) {
  for (const v of viewports) {
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
    try {
      await page.goto(`${base}/demos/${id}/index.html`, { waitUntil: "networkidle", timeout: 30000 });
      // t0 di ~6s: (a) watchdog bypass butuh ~100ms + (b) cold-load init scene
      // berat (GLB+mesher) bisa >3s — ghost live: t@3s = 1.7/6, sehat di 6s.
      // Assert <6s = flake vs jaringan, bukan bug (JEBAKAN BATCH-3 #9).
      await page.waitForTimeout(6000);
      const t0 = await page.evaluate(SAMPLE);
      await page.waitForTimeout(3000);                       // ~9s
      const t1 = await page.evaluate(SAMPLE);
      await page.waitForTimeout(STABILITY_S * 1000 - 9000);  // ~12s
      const t2 = await page.evaluate(SAMPLE);
      await page.screenshot({ path: join(OUT, `gate-${id}-${v.n}.png`) });
      const bad = (s) => s.err || s.avg < AVGFLOOR || s.max < MAXFLOOR;
      const line = `${id} @${v.n}: t6=${t0.avg}/${t0.max} t9=${t1.avg}/${t1.max} t12=${t2.avg}/${t2.max} sat9=${t1.sat}`;
      if (bad(t0) || bad(t1) || bad(t2)) fail(`${line} (BLACK)`);
      else if (t1.sat < SATFLOOR) fail(`${line} (GREYBOX sat<${SATFLOOR})`); // JEBAKAN BATCH-3 #8
      else if (t2.avg < t0.avg * 0.1) fail(`${line} (FADE>90%)`);
      else pass(line);
      const realErrors = errors.filter((e) => !/GPU stall|Automatic fallback|GroupMarkerNotSet|WebGL.*warning/i.test(e));
      if (realErrors.length) fail(`${id} @${v.n}: console ${realErrors.length} error: ${realErrors.slice(0, 2).join(" || ")}`);
      await page.close();
    } catch (e) {
      fail(`${id} @${v.n}: ${e.message}`);
      try { await page.close(); } catch {}
    }
  }
}

console.log(`\n== Part B2: interaksi demo (native click, CTA bg, panel toggle, diversity, contrast) ==`);
const CHROME7 = ["ghost-pirate-ship", "molten-forge", "aurora-ridge", "neon-alley", "pulseops", "aether", "robot-foundry"];
const sigs = {};
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(`${base}/demos/${id}/index.html`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2500);
    // sig hero diukur di POSISI DEFAULT (sebelum sweep klik) — kontrak diversity =
    // tampilan pertama saat user buka. Post-klick tak deterministik (toggle layout
    // + focus-scroll bisa menggeser h1 — kasus neon round-9).
    sigs[id] = await page.evaluate(() => {
      const h = document.querySelector("h1");
      if (!h) return null;
      const r = h.getBoundingClientRect();
      return { x: +((r.x + r.width / 2) / innerWidth).toFixed(3), y: +((r.y + r.height / 2) / innerHeight).toFixed(3) };
    });
    // native click semua button VISIBLE — 0 pageerror (bug "klik = error" round-4b).
    // Button tersembunyi (fallback #lost/#nogl, panel tertutup) di-skip: user tak bisa meng-kliknya.
    const clickLog = await page.evaluate(() => {
      const log = [];
      for (const b of document.querySelectorAll("button")) {
        if (b.id === "briefClose") continue;
        if (b.closest("[hidden], #lost, #nogl, aside[aria-hidden='true']")) continue;
        if (!(b.offsetWidth || b.offsetHeight || b.getClientRects().length)) continue; // tidak visible
        try { b.click(); log.push("ok"); } catch (e) { log.push("throw:" + e.message); }
        const x = document.getElementById("briefClose");
        if (x && document.getElementById("brief") && !document.getElementById("brief").hidden) x.click();
      }
      return log;
    });
    if (clickLog.some((r) => r !== "ok")) fail(`${id}: native click throw: ${clickLog.filter((r) => r !== "ok").join(",")}`);
    // CTA primary tidak boleh transparan (bug aether round-4b: --acc undefined di nav)
    const ctaBg = await page.evaluate(() => {
      const el = document.querySelector(".btn.primary, nav .btn-primary, .nav .btn-primary");
      if (!el) return null;
      return { bg: getComputedStyle(el).backgroundColor, label: (el.textContent || "").trim().slice(0, 18) };
    });
    if (ctaBg) {
      const al = (ctaBg.bg.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/) || [])[1];
      const alpha = al === undefined ? 1 : parseFloat(al);
      if (alpha < 0.5) fail(`${id}: CTA primary "${ctaBg.label}" transparan (${ctaBg.bg})`);
      else pass(`${id}: CTA bg ok (${ctaBg.bg})`);
    }
    // panel toggle utk chrome (CTA → brief terbuka, close → tertutup)
    if (CHROME7.includes(id)) {
      const r = await page.evaluate(async () => {
        const p = document.getElementById("brief");
        if (!p) return { has: false };
        const cta = [...document.querySelectorAll(".btn.primary, button[data-brief]")].find((b) => b.hasAttribute("data-brief"));
        if (!cta) return { has: true, cta: false };
        cta.click();
        // Panel boleh diimplementasi dgn .hidden property ATAU class "open" + aria-hidden;
        // open bisa ASYNC (rAF menambah class) → tunggu 1 frame; close bisa ASYNC juga → 700ms.
        await new Promise((r) => setTimeout(r, 120));
        const openNow = () => !p.hidden && p.getAttribute("aria-hidden") !== "true";
        const opened = openNow();
        const x = document.getElementById("briefClose"); if (x) x.click();
        await new Promise((r) => setTimeout(r, 700));
        return { has: true, cta: true, opened, closed: !openNow() };
      });
      if (!r.has) fail(`${id}: #brief panel hilang`);
      else if (!r.cta) fail(`${id}: tidak ada button[data-brief] utk buka panel`);
      else if (!r.opened || !r.closed) fail(`${id}: panel toggle gagal (open=${r.opened} close=${r.closed})`);
      else pass(`${id}: CTA→panel toggle ok`);
    }
    // contrast WARN (WCAG approx): bg lokal di balik h1 (h1 disembunyikan saat sampel)
    try {
      const rect = await page.evaluate(() => {
        const h = document.querySelector("h1");
        if (!h) return null;
        const r = h.getBoundingClientRect();
        return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: Math.min(innerWidth - Math.max(0, r.x - 8), r.width + 16), height: Math.min(innerHeight - Math.max(0, r.y - 8), r.height + 16) };
      });
      if (rect && rect.width >= 8 && rect.height >= 8) {
        const colors = await page.evaluate(() => {
          const h = document.querySelector("h1"); if (!h) return [];
          const em = h.querySelector("em");
          return [getComputedStyle(h).color, em ? getComputedStyle(em).color : null].filter(Boolean);
        });
        await page.evaluate(() => { const h = document.querySelector("h1"); if (h) h.style.visibility = "hidden"; });
        const buf = await page.screenshot({ clip: rect });
        await page.evaluate(() => { const h = document.querySelector("h1"); if (h) h.style.visibility = ""; });
        const meanL = await page.evaluate(async (d) => {
          const img = new Image(); img.src = "data:image/png;base64," + d; await img.decode();
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
          const x = c.getContext("2d"); x.drawImage(img, 0, 0);
          const px = x.getImageData(0, 0, c.width, c.height).data;
          const linf = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          let s = 0, n = 0;
          for (let i = 0; i < px.length; i += 16) { s += 0.2126 * linf(px[i]) + 0.7152 * linf(px[i + 1]) + 0.0722 * linf(px[i + 2]); n++; }
          return s / n;
        }, buf.toString("base64"));
        let min = 99;
        for (const css of colors) {
          const [rr, gg, bb] = (css.match(/\d+/g) || []).map(Number);
          const L = 0.2126 * lin(rr) + 0.7152 * lin(gg) + 0.0722 * lin(bb);
          min = Math.min(min, (Math.max(meanL, L) + 0.05) / (Math.min(meanL, L) + 0.05));
        }
        min = +min.toFixed(2);
        if (min < 3) console.log(`  WARN: ${id}: h1 contrast ~${min} (<3) — perbaiki scrim/sebelum deploy`);
        else pass(`${id}: h1 contrast ~${min}`);
      }
    } catch { /* contrast = WARN saja, tak memblokir */ }
    if (errors.length) fail(`${id}: pageerror ${errors.slice(0, 2).join(" || ")}`);
    else pass(`${id}: native click 0 pageerror`);
  } catch (e) {
    fail(`${id}: ${e.message}`);
  }
  await page.close();
}
// diversity: sig h1 chrome7 — 4 absolute hero punya kontrak posisi (anti kembali seragam)
{
  const sideOf = (s) => (s.x < 0.40 ? "L" : s.x > 0.60 ? "R" : "C");
  const vertOf = (s) => (s.y < 0.33 ? "T" : s.y > 0.62 ? "B" : "M");
  const sig = {};
  for (const [id, s] of Object.entries(sigs)) sig[id] = s ? sideOf(s) + vertOf(s) : "?";
  const EXPECT = { "ghost-pirate-ship": "LM", "molten-forge": "LB", "aurora-ridge": "CM", "neon-alley": "RM" };
  for (const [id, want] of Object.entries(EXPECT)) {
    if (sig[id] !== want) fail(`diversity: ${id} sig=${sig[id]} (kontrak: ${want}) — layout bergeser/seragam`);
  }
  const sides = new Set(Object.values(sig).map((v) => v[0]));
  const verts = new Set(Object.values(sig).map((v) => v[1]));
  if (sides.size < 3) fail(`diversity: hanya ${sides.size} sisi hero (${[...sides].join("")}) — layout mulai seragam (round-4b)`);
  if (verts.size < 3) fail(`diversity: hanya ${verts.size} tier vertikal (${[...verts].join("")})`);
  pass(`diversity sig: ${Object.entries(sig).map(([k, v]) => k.split("-")[0] + "=" + v).join(" ")}`);
}

console.log(`\n== Part C: homepage + modal semua template + CTA ==`);
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 30000 });

    // CTA nav: kontras teks vs background WCAG (>=4.5).
    // Ganti cek lama "lum teks <= 0.3" (premis: header gradien terang, round-4b) —
    // header kini flat ink, yang menentukan keterbacaan = ratio teks:bg.
    const cta = await page.evaluate(() => {
      const el = document.querySelector("nav .btn-primary, .nav-links a.btn-primary");
      if (!el) return null;
      const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = (rgb) => {
        const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const cs = getComputedStyle(el);
      let fg = parse(cs.color); if (fg.length === 3) fg.push(1);
      let bg = parse(cs.backgroundColor); if (bg.length === 3) bg.push(1);
      // walk up sampai ketemu background opak (bg button bisa transparan)
      for (let n = el.parentElement; n && bg[3] === 0; n = n.parentElement) {
        const p = parse(getComputedStyle(n).backgroundColor); if (p.length === 3) p.push(1);
        if (p[3] > 0) bg = p;
      }
      const L1 = lum(fg.slice(0, 3)), L2 = lum(bg.slice(0, 3));
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      return { color: cs.color, bg: `rgb(${bg.slice(0, 3).join(",")})`, ratio: +ratio.toFixed(2) };
    });
    if (!cta) fail("CTA nav .btn-primary tidak ditemukan");
    else if (cta.ratio < 4.5) fail(`CTA kontras rendah: ${cta.color} on ${cta.bg} = ${cta.ratio} (<4.5)`);
    else pass(`CTA kontras ok (${cta.color} on ${cta.bg} = ${cta.ratio})`);

    // modal per template: deep-link via pushState+popstate (app.js hanya dengar popstate)
    for (const id of ids) {
      await page.evaluate((tid) => {
        history.pushState({}, "", "#t/" + tid);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, id);
      await page.waitForTimeout(1500);
      const modalOpen = await page.evaluate(() => {
        const m = document.querySelector("#modal");
        return !!(m && m.classList.contains("open")) || !!document.querySelector("iframe#mFrame[src]");
      });
      if (!modalOpen) { fail(`modal #t/${id} tidak terbuka`); continue; }
      await page.waitForTimeout(4500); // tunggu scene iframe stabil + watchdog sempat jalan
      const s = await page.evaluate(() => {
        const f = document.querySelector("iframe#mFrame");
        if (!f || !f.contentDocument) return { max: -1, avg: -1, err: "no-iframe-doc" };
        const w = f.contentWindow;
        const d = w.__dbg;
        const c = (d && d.renderer && d.renderer.domElement) || f.contentDocument.querySelector("canvas");
        if (!c) return { max: -1, avg: -1, err: "no-canvas" };
        if (d && d.composer) d.composer.render(0.016);
        else if (d && d.renderer && d.scene && d.camera) {
          d.renderer.setRenderTarget(null); d.renderer.render(d.scene, d.camera);
        }
        const pts = [[.5,.5],[.3,.4],[.7,.6],[.5,.3],[.2,.7],[.8,.3]];
        let max = 0, sum = 0, n = 0;
        const acc = (r, g, b) => { max = Math.max(max, r, g, b); sum += (r+g+b)/3; n++; };
        const gl = (d && d.renderer && d.renderer.getContext()) || c.getContext("webgl2") || c.getContext("webgl");
        if (gl) {
          const buf = new Uint8Array(4);
          for (const [fx, fy] of pts) {
            gl.readPixels((c.width*fx)|0, (c.height*fy)|0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            acc(buf[0], buf[1], buf[2]);
          }
        } else {
          const ctx = c.getContext("2d");
          if (!ctx) return { max: -1, avg: -1, err: "no-gl-2d" };
          for (const [fx, fy] of pts) {
            const px = ctx.getImageData((c.width*fx)|0, (c.height*fy)|0, 1, 1).data;
            acc(px[0], px[1], px[2]);
          }
        }
        return { max, avg: +(sum/n).toFixed(1) };
      });
      if (s.err || s.avg < AVGFLOOR || s.max < MAXFLOOR) fail(`modal #t/${id}: ${s.err || `avg=${s.avg} max=${s.max} BLACK`}`);
      else pass(`modal #t/${id}: avg=${s.avg} max=${s.max}`);
    }
    if (errors.length) fail(`homepage pageerror: ${errors.slice(0, 2).join(" || ")}`);
  } catch (e) {
    fail(`homepage: ${e.message}`);
  }
  await page.close();
}

await browser.close();
if (server) server.close();
console.log(fails ? `\nGATE REJECTED — ${fails} masalah` : "\nGATE PASSED — aman deploy");
process.exit(fails ? 1 : 0);
