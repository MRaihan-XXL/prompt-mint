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
    await page.screenshot({ path: join(ROOT, "assets", "thumbs", `${d}.webp`), type: "webp", quality: 82 });
    console.log(`ok  ${d}`);
    ok++;
  } catch (e) {
    console.error(`FAIL ${d}: ${e.message}`);
    fail++;
  }
}
await browser.close();
server.close();
console.log(`done: ${ok} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
