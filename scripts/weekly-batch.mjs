// weekly-batch.mjs — DepthGlow recurring template pipeline
// Runs every Saturday 17:00 via Task Scheduler. Generates queued templates,
// gates them, deploys only what passes, tracks results for adaptation.
//
// Usage: node scripts/weekly-batch.mjs [--dry-run] [--limit N] [--only id1,id2]
// Queue: prompt-vault/queue/*.md  (moved to queue/done/ or queue/failed/ after run)
// Log:   eval-shots/batch-log.jsonl  (one JSON line per template attempt)
//
// Adaptation v1:
// - Retry failed generation up to RETRY_MAX times (fresh claude session each time)
// - Track per-template success/fail in batch-log.jsonl
// - Skip templates that already succeeded this week (idempotent re-run)
// - Deploy ONLY after gate passes (never ship broken)

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { jsSyntaxCheck } from "./lib-js-syntax.mjs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VAULT = path.resolve(ROOT, "..", "prompt-vault", "prompts");
const QUEUE = path.join(VAULT, "queue");
const QUEUE_DONE = path.join(QUEUE, "done");
const QUEUE_FAILED = path.join(QUEUE, "failed");
const LOG_FILE = path.join(ROOT, "eval-shots", "batch-log.jsonl");

// ---- args ----
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const LIMIT = parseInt(args.find(a => a.startsWith("--limit"))?.split("=")[1] || "99", 10);
const onlyArg = args.find(a => a.startsWith("--only"));
const ONLY = onlyArg
  ? (onlyArg.includes("=") ? onlyArg.split("=")[1] : args[args.indexOf(onlyArg) + 1])?.split(",")
  : null;
const FORCE = args.includes("--force"); // remake: ignore already-succeeded-this-week

// ---- config ----
const RETRY_MAX = 2;              // total attempts per template = 1 + RETRY_MAX
const CONCURRENCY = parseInt(process.env.BATCH_CONCURRENCY || "3", 10); // parallel claude instances
const GEN_TIMEOUT_MS = 25 * 60 * 1000;   // 25 min per claude run (fresh)
const CONT_TIMEOUT_MS = 45 * 60 * 1000;  // 45 min per continue run
const MIN_HTML_BYTES = 8000;      // generated index.html must be > 8KB

// ---- helpers ----
const log = (tag, msg) => console.log(`[${new Date().toISOString().slice(11,19)}] [${tag}] ${msg}`);
function appendLog(entry) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}
function readLog() {
  try { return fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse); }
  catch { return []; }
}

// ---- parse vault .md -> { prompt, tier, title } ----
export function parseVaultMd(mdPath) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const titleM = raw.match(/^#\s+(.+)$/m);
  const tierM = raw.match(/\*\*Tier:\*\*\s*(\w+)/i);
  const promptM = raw.match(/## Prompt\s*\n+```\r?\n([\s\S]*?)\r?\n```/);
  if (!promptM) return null;
  return {
    title: titleM?.[1]?.trim() || path.basename(mdPath, ".md"),
    tier: (tierM?.[1] || "pro").toLowerCase(),
    prompt: promptM[1].trim(),
  };
}

// ---- gen adapter (CSP-safe + KIBLAT quality bar) ----
export function buildAdapter(prompt, tier) {
  const mvNote = tier === "max"
    ? `\n10. For model-viewer heroes: vendor model-viewer.min.js to ../../js/vendor/model-viewer.min.js (CSP blocks CDN). Load GLB from a local file in this folder (e.g. model.glb). Add a full-viewport 2D <canvas id="bg"> BEHIND the model-viewer that draws an animated background (brightness gate samples this canvas — model-viewer's canvas is in shadow DOM and unreachable).`
    : "";
  // Spec pemilik (round-7, DEFINITIF): FREE = 2D+animasi (tanpa pengubah tampilan),
  // PRO = 3D+animasi + BEBERAPA pengubah, MAX = 3D+animasi + FULL pengubah + selebihnya.
  const heroBar = tier === "free"
    ? `A. SIGNATURE ANIMATED 2D HERO: a rich, fully animated 2D hero (canvas 2D / SVG / CSS choreography — your choice) as the visual focus — not a static image, not a plain gradient. Multiple animated elements, reacting to pointer AND scroll. FREE tier is 2D-only: do NOT add a WebGL/three.js scene.`
    : `A. SIGNATURE 3D HERO: a real three.js (r170) WebGL scene as the hero background/focus — not a static image, not a CSS gradient. It must have at least one clearly animated element and respond to pointer/scroll. This is the hero-moment.`;
  const dcTypes = [
    `i.  theme/color switcher — 2-3 NAMED palette themes (labels that belong to this scene) that repaint the scene + UI`,
    `ii. asset/model swap — the hero object visibly changes (different geometry/variant/material/model)`,
    `iii. time/season/weather — a state that visibly changes lighting, particles, fog, or sky`,
    `iv. layout/variant — an alternate arrangement of the hero or a content block`,
  ].join("\n");
  const tierContract = tier === "free"
    ? `=== TIER FEATURE CONTRACT (free = 2D + animation ONLY) ===
NO display-changer controls of any kind: no theme switcher, no asset swap, no time/weather controls, no layout variants. Spend the interaction budget on MOTION quality instead (parallax, staggered reveals, particle choreography).`
    : `=== TIER FEATURE CONTRACT (${tier}: 3D + animation + display-changers, themed to THIS scene) ===
Display-changers are CONTROLS that visibly rewrite the rendered scene. ${tier === "max"
      ? "Implement ALL 4 types below (max = full set, plus everything else complete)."
      : "Implement EXACTLY 2 types below — pick the 2 that fit THIS scene's theme best (pro = some display-changers)."}
${dcTypes}
Rules for EVERY display-changer:
- Real controls: in-page <button> elements in a visible hero control bar — NO mailto/tel/external links.
- Each control MUST visibly change the rendered scene/UI (lighting, palette, geometry, layout). Controls that do nothing are a FAIL.
- Every display-changer button carries a data-dc attribute (e.g. <button data-dc="time">Dawn</button>) so it can be verified.
- Theme them: labels/presentation must belong to THIS scene (e.g. "Sandstorm"/"Dawn" for a desert, "Slack tide"/"Storm swell" for an ocean) — never generic "Option A/B".`;
  return `Create ./index.html in the current working directory. This is a zero-CDN single-file demo project; the site that serves it runs under a strict CSP with NO external requests allowed.

OUTPUT CONTRACT
- Produce ./index.html only (plus local assets like .glb in this folder ONLY if truly needed). No README, no extra files.
- Must open from a local static server AND behave under strict CSP.

=== KIBLAT QUALITY BAR (MANDATORY — this is what makes it competitive) ===
The bar is set by premium competitor sites (horizonx.so, motionsites.ai, getlayers.ai) and refined interactive refs (reactbits.dev). A template that only has "h1 + flat button + a canvas" is a FAIL. Every template MUST include ALL of:
${heroBar}
B. INTERACTION LAYER (use the shared kit — do NOT hand-roll):
   - In <head>: <link rel="stylesheet" href="../../js/kit/kit.css">
   - Before </body>: <script src="../../js/kit/motion.js"></script>
   - This gives you: a reticle cursor that SNAPS around hovered buttons (reactbits target-cursor style), MAGNETIC buttons (pull toward cursor), reveal-on-scroll, and premium button/glass styling. Do not override these with flat defaults.
C. FLUID TYPE + MICRO-INTERACTIONS: use the kit's --step-4..--step--1 fluid type scale (clamp) for headings; add data-reveal to major sections for scroll entrance; buttons must feel springy (the kit handles it). Hover states on nav links. Every clickable thing gives feedback.
D. SCROLL/POINTER CHOREOGRAPHY: the hero must react to scroll (dolly/pan/reveal) AND pointer (parallax/tilt/stir). Not a static loop.
E. BUTTONS: DISTINCTIVE OR FAIL. The default flat "primary + ghost" rectangle pair is BANNED. Design a button treatment that belongs to THIS scene's theme — e.g. notched/clipped corners, pill with inner glow, underline-with-arrow, stencil/tick-mark labels, holo-border that fills on hover, bracketed [CTA] label. Vary it across the page: nav CTA, hero CTA, and card/footer buttons must not all look identical. A sibling template will pick a different treatment — never ship the generic look.
F. LAYOUT RICHNESS: nav + hero + at least 2-3 content sections (features/specs/story) + CTA + footer. Feels like a real product/landing page, not a toy.
${tierContract}

=== BLUEPRINT DNA (MANDATORY — this is what separates us from generic AI templates) ===
Every decision is PRE-DECIDED with concrete numbers. Vague poetry ("beautiful", "smooth", "stunning") without parameters is a FAIL. Treat this as an engineering blueprint, not a mood board:
1. CAMERA/FRAME (3D: exact height, FOV, target, near/far, damping numbers. 2D: exact canvas coordinate system, scale math, zoom/parallax deltas.)
2. MOTION CONSTANTS: real numbers — easing curves, spring stiffness/damping/mass (e.g. 200/18/1), velocity decay (e.g. velocity *= 0.9935), clamped delta-time.
3. COMPOSITE ORDER: list the draw/composite passes in order (e.g. depth -> scene -> glow -> bloom -> grade). 2D canvas: layer paint order.
4. MATERIAL/ATMOSPHERE CONSTANTS: concrete values — fog color+density, exposure, tone mapping, absorption tint vectors (e.g. vec3(0.30,0.058,0.04)), noise scales.
5. PROCEDURAL GEOMETRY: name the generator (Catmull-Rom spline, fBm noise octaves, InstancedMesh) + parameters (segment count, amplitude, seed).
6. DATA LAYOUT: typed arrays / instanced attributes (e.g. 4 vec4 per instance: position, orientation, color, state). Zero allocation in the hot loop.
7. BEHAVIOR UNITS: if multiple agents/variants exist, list each with mass, speed, pattern numbers — not "fish swim around".
8. ENTRY/PHYSICS: per-unit gravity, flight/phase time, entry orientation numbers when units or particles enter or move.
9. UI SPEC: exact position, size, typeface, color, interaction for EVERY control — including the brief panel.
10. ROBUSTNESS: adaptive pixel ratio (drop PR when fps < 50), resize handler, prefers-reduced-motion (keep scene visible, stop auto-motion), graceful fallback when WebGL unavailable (static styled poster + short message), context-loss handler.
11. PERF RULES: zero GC in hot loop (reuse arrays/object pools), NaN guards on every accumulate, devicePixelRatio capped at 2.
12. FAILURE MODES: define fallback for missing GLB, low memory, context loss — explicitly, not "just in case".

=== PROJECT ADAPTATIONS (delivery mechanics) ===
1. three.js (REQUIRED for pro/max; FREE tier must NOT use WebGL): native ES modules with import map: "three": "../../js/vendor/three.module.min.js" (r170) and "three/addons/": "../../js/vendor/jsm/". OrbitControls: "three/addons/controls/OrbitControls.js". BufferGeometryUtils: "three/addons/utils/BufferGeometryUtils.js".
1b. Motion libraries (VENDORED locally — use them, do NOT reinvent): Lenis smooth scroll: <script src="../../js/vendor/lenis.min.js"></script> then new Lenis({ smoothWheel:true }) + raf loop syncing update. GSAP 3.13 + ScrollTrigger + SplitText: <script src="../../js/vendor/gsap.min.js"></script>, ScrollTrigger.min.js, SplitText.min.js — use GSAP for hero typographic choreography (SplitText char stagger), scroll-pinned sections, and shared-element card→panel transitions. Lenis + ScrollTrigger: lenis.on('scroll', ScrollTrigger.update).
2. Fonts: NEVER Google Fonts/CDN. Use @font-face with relative paths: Fraunces -> ../../fonts/Fraunces-var.woff2; Nunito Sans -> ../../fonts/NunitoSans-var.woff2; Clash Display -> ../../fonts/ClashDisplay-600.woff2 / ClashDisplay-700.woff2; Satoshi -> ../../fonts/Satoshi-400.woff2 / -500.woff2 / -700.woff2; Zen Old Mincho -> ../../fonts/ZenOldMincho-700.woff2.
3. Assets: 100% procedural unless tier=max with GLB (see note 10). No remote images, no data-URLs from the net.
4. Performance: clamp devicePixelRatio <= 2; handle resize; prefers-reduced-motion -> keep scene visible but stop auto-motion; at 390px no horizontal scroll; touch/pointer works.
5. Zero console errors.
6. Write INCREMENTALLY (head/CSS, markup, JS in blocks). Never one giant paste. After finishing, re-read and verify.
7. SITE-NESS (mandatory): html lang=en, non-empty <title>, <meta name="description" content="10+ chars">, one <h1>, at least one <button> and one real anchor as CTAs, a top nav with brand, a footer credit. All CTAs are in-page <button> elements — NO mailto/tel/javascript/external href. Include a hidden <aside id="brief"> panel that opens on button[data-brief] click and closes on #briefClose or ESC. CTA primary (.btn.primary) must have a solid (alpha >= 0.5) background using a CSS variable --acc defined in a GLOBAL scope (e.g. :root or .ui), not only inside a section.${mvNote}
8. MUST include the interaction kit (kit.css + motion.js) per rule B above. Do not reimplement cursor/magnetic/reveal yourself — load the kit.
9. Final reply: ONLY a 5-line summary (path, lines, features, deviations, limits). Do not echo the code.

=== ORIGINAL PROMPT (authoritative spec) ===
${prompt}`;
}

// ---- generate one template ----
function generateTemplate(id, parsed) {
  const demoDir = path.join(ROOT, "demos", id);
  fs.mkdirSync(demoDir, { recursive: true });
  const adapter = buildAdapter(parsed.prompt, parsed.tier);

  for (let attempt = 1; attempt <= 1 + RETRY_MAX; attempt++) {
    log("gen", `${id} attempt ${attempt}/${1 + RETRY_MAX}`);
    const r = spawnSync("claude", ["-p", "--permission-mode", "acceptEdits", "--allowedTools", "Write,Edit,Read,Glob,Grep"], {
      cwd: demoDir, input: adapter, stdio: ["pipe", "pipe", "pipe"],
      timeout: GEN_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, windowsHide: true,
    });
    const idx = path.join(demoDir, "index.html");
    if (fs.existsSync(idx)) {
      const size = fs.statSync(idx).size;
      const body = fs.readFileSync(idx, "utf8");
      if (size >= MIN_HTML_BYTES && !body.includes("@@NEXT@@")) {
        log("gen", `${id} OK (${size} bytes, attempt ${attempt})`);
        return { ok: true, attempt, size };
      }
      log("gen", `${id} incomplete (size=${size}, marker=${body.includes("@@NEXT@@")}) — retrying`);
    } else {
      log("gen", `${id} no index.html (claude exit=${r.status}) — retrying`);
    }
  }
  return { ok: false, attempt: 1 + RETRY_MAX };
}

// ---- main ----
async function main() {
  fs.mkdirSync(QUEUE_DONE, { recursive: true });
  fs.mkdirSync(QUEUE_FAILED, { recursive: true });

  // list queue
  let queueFiles = [];
  try { queueFiles = fs.readdirSync(QUEUE).filter(f => f.endsWith(".md")); } catch {}
  if (ONLY) queueFiles = queueFiles.filter(f => ONLY.includes(path.basename(f, ".md")));
  queueFiles = queueFiles.slice(0, LIMIT);

  const logHistory = readLog();
  const succeededThisWeek = new Set(
    logHistory.filter(e => e.ok && Date.now() - new Date(e.ts).getTime() < 7 * 24 * 3600 * 1000).map(e => e.id)
  );

  log("batch", `queue: ${queueFiles.length} files | already-succeeded-this-week: ${succeededThisWeek.size}`);
  if (queueFiles.length === 0) { log("batch", "nothing to do"); return; }

  // Phase 1: generate + fast-gate CONCURRENTLY (worker pool). Collect successes.
  const results = [];
  const toRegister = []; // {id, parsed} — applied sequentially after (avoid templates.json race)
  let idx = 0;
  async function worker() {
    while (idx < queueFiles.length) {
      const qf = queueFiles[idx++];
      const id = path.basename(qf, ".md");
      const qPath = path.join(QUEUE, qf);

      if (!FORCE && succeededThisWeek.has(id)) {
        log("batch", `${id} already succeeded this week — skipping`);
        fs.renameSync(qPath, path.join(QUEUE_DONE, qf));
        continue;
      }
      const parsed = parseVaultMd(qPath);
      if (!parsed) {
        log("batch", `${id} parse failed (no prompt fence) — moving to failed/`);
        fs.renameSync(qPath, path.join(QUEUE_FAILED, qf));
        appendLog({ id, ok: false, reason: "parse-failed" });
        results.push({ id, ok: false });
        continue;
      }
      if (DRY) {
        log("batch", `${id} DRY-RUN — would generate (${parsed.tier}: ${parsed.title})`);
        results.push({ id, dry: true });
        continue;
      }

      const genResult = generateTemplate(id, parsed);
      appendLog({ id, ok: genResult.ok, attempt: genResult.attempt, size: genResult.size, phase: "gen" });
      if (!genResult.ok) {
        log("batch", `${id} GENERATION FAILED after ${genResult.attempt} attempts — moving to failed/`);
        fs.renameSync(qPath, path.join(QUEUE_FAILED, qf));
        results.push({ id, ok: false, phase: "gen" });
        continue;
      }

      // fast gate (site-ness + kiblat kit + no protocol leak)
      const html = fs.readFileSync(path.join(ROOT, "demos", id, "index.html"), "utf8");
      const miss = [];
      if (!/<title>[^<]{3,}/.test(html)) miss.push("title");
      if (!/<meta name="description" content="[^"]{10,}"/.test(html)) miss.push("meta-desc");
      if (!/<h1[\s>]/i.test(html)) miss.push("h1");
      if (!/<button[\s>]/i.test(html)) miss.push("cta");
      if (!/<html[^>]*\slang=/.test(html)) miss.push("lang");
      if (!html.includes("js/kit/kit.css") || !html.includes("js/kit/motion.js")) miss.push("kiblat-kit");
      // Tier feature contract (spec pemilik round-7): pro/max wajib pengubah tampilan
      // ber-marker data-dc; free dilarang punya. Enforced at gen-time (new templates only).
      const dcCount = (html.match(/\sdata-dc=/g) || []).length;
      const dcNeed = parsed.tier === "max" ? 4 : parsed.tier === "pro" ? 2 : 0;
      if (dcCount < dcNeed) miss.push(`display-changers(${dcCount}<${dcNeed})`);
      if (parsed.tier === "free" && dcCount > 0) miss.push(`free-has-display-changers(${dcCount})`);
      // JS syntax check (bukti: firefly-meadow "site-ness OK" tapi scene hitam krn SyntaxError)
      const jsErrs = jsSyntaxCheck(html);
      if (jsErrs.length) miss.push(`js-syntax(${jsErrs[0]})`);
      const bad = [...html.matchAll(/href="(mailto:[^"]*|tel:[^"]*|javascript:[^"]*|https?:\/\/[^"]*)"/g)];
      if (miss.length || bad.length) {
        log("batch", `${id} SITE-NESS FAIL: missing=${miss.join(",")} external-links=${bad.length}`);
        appendLog({ id, ok: false, phase: "gate", reason: "site-ness" });
        fs.renameSync(qPath, path.join(QUEUE_FAILED, qf));
        results.push({ id, ok: false, phase: "gate" });
        continue;
      }
      log("batch", `${id} site-ness OK`);
      appendLog({ id, ok: true, phase: "gate" });
      toRegister.push({ id, parsed, qf, qPath });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queueFiles.length) }, worker));
  log("batch", `phase 1 done: ${toRegister.length} to register, ${results.filter(r => !r.ok && !r.dry).length} failed`);

  // Phase 2: register successes SEQUENTIAL (read-modify-write templates.json + sitemap)
  for (const { id, parsed, qf, qPath } of toRegister) {
    const tplPath = path.join(ROOT, "data", "templates.json");
    const tpl = JSON.parse(fs.readFileSync(tplPath, "utf8"));
    if (!tpl.templates.find(t => t.id === id)) {
      tpl.templates.push({
        id, date: new Date().toISOString().slice(0, 10), title: parsed.title,
        category: "3D", tier: parsed.tier, tags: ["3D", "Interactive"],
        demo: `demos/${id}/`, accent: "#8b5cf6",
        blurb: parsed.prompt.slice(0, 140).replace(/\n/g, " ") + "...",
        // prompt field: only for free tier (pro/max gated via Supabase Storage)
        ...(parsed.tier === "free" ? { prompt: parsed.prompt } : {}),
        thumb: `assets/thumbs/${id}.webp`,
      });
      fs.writeFileSync(tplPath, JSON.stringify(tpl, null, 2) + "\n");
      const smPath = path.join(ROOT, "sitemap.xml");
      let sm = fs.readFileSync(smPath, "utf8");
      if (!sm.includes(`/t/${id}`)) {
        sm = sm.replace("</urlset>",
          `  <url><loc>https://depthglow.m-raihan-izudin.workers.dev/t/${id}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
        fs.writeFileSync(smPath, sm);
      }
      log("batch", `${id} registered in templates.json + sitemap`);
    }
    // Vault copy utk sync-vault → Supabase private (pro/max gated). Free = prompt field
    // di templates.json saja (lead magnet). Tanpa ini, /api/prompt/:id 404 utk subscriber.
    if (parsed.tier !== "free") {
      const vaultTierDir = path.join(VAULT, parsed.tier);
      fs.mkdirSync(vaultTierDir, { recursive: true });
      const vPath = path.join(vaultTierDir, `${id}.md`);
      if (!fs.existsSync(vPath) && fs.existsSync(qPath)) fs.copyFileSync(qPath, vPath);
    }
    fs.renameSync(qPath, path.join(QUEUE_DONE, qf));
    results.push({ id, ok: true });
  }

  // summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok && !r.dry).length;
  log("batch", `DONE: ${passed} passed, ${failed} failed, ${results.filter(r => r.dry).length} dry-run`);
  log("batch", `Next: run deploy-gate.mjs, then capture-thumbs, then sync-vault, then wrangler deploy`);
}

// main() hanya jalan saat dieksekusi langsung (bukan saat di-import utk testing adapter)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log("batch", "FATAL: " + e.message); process.exit(1); });
}
