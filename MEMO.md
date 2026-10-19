# MEMO — DepthGlow (dibaca sebelum kerja template apapun)

> File INI = ingatan permanen. Ditambah otomatis tiap ada insight/link/direktif penting.
> Jangan dihapus. Jangan bocorkan ke publik (diblok dari deploy via .assetsignore).

## A. Direktif PEMILIK (permanen, urut prioritas)

1. **KUALITAS DULU**: evaluasi 3D + UI/UX + fungsionalitas + "buat apa tujuannya"
   SEBELUM aspek lain. Template = "website yang punya tujuan", bukan screensaver.
2. **ANALISIS 3 KIBLAT DULU → baru buat template** (jangan asal generate).
3. **Jangan YES-MEN, jangan PEMBANGKANG** — kalau ada cara jauh lebih
   efisien/efektif di atas segala aspek → WAJIB usulkan ke atasan dengan
   alasan data, bukan basa-basi.
4. **Roadmap pemilik**: (a) buat 9 sampel dulu (beragam + kombinasi AI sebanyak
   mungkin); (b) SETELAH 9 → storage template luas (cloud; pakai yang sudah ada
   dulu: Supabase Storage/R2); (c) generator OTOMATIS ~20 template/minggu
   kualitas tinggi (n8n / atau lebih baik kalau ketemu). Jangan langkah (b)(c)
   sebelum (a) rapi.
5. **Strategi multi-AI massal** (ribuan/jutaan AI paralel) = niat pemilik.
   Catatan jujur: paralelisme TANPA spec seragam = sampah seragam (bukti:
   hasil 6 template kemarin sama-rata). Urutan benar: SPEC KUAT dulu (satu
   blueprint) → paralel massal → GATE otomatis filter → baru massal berarti.
6. **Skor apapun <8 dari 10 = GAGAL** (bar: minimal 10 aspek dinilai, semua ≥8).

## B. Link penting (riset tersimpan)

### Kiblat utama (3 pilar) — analisis mendalam 18 Okt 2026
1. **https://horizonx.so** — library UI kit + kode + Figma, $24.99-99.99/bln,
   KATEGORI: Explore/Tools/Textures/Shaders + MCP utk AI agent, testi 5.0
   (14 review Gumroad, 3500+ download), weekly drops, lisensi komersial.
   Pelajaran: NARASI per item ("A 3D credit card floats over a live sunset
   sea...") + social proof nyata + tools in-browser + jalur MCP.
2. **https://motionsites.ai** (+ .org, motionsite.ai) — 570+ prompt, kategori
   kaya (Hero/Landing/SaaS/3D/Fintech/Travel...), Academy video tutorial,
   MCP, Backgrounds, Restyle, "Fresh Drops Everyday", testi panjang.
   Pelajaran: edukasi (academy) + drop harian + kategori industri.
3. **https://www.getlayers.ai** (Textura Agency) — 55 template + 114 3D scenes
   + Sections + Backgrounds + Gradients + 12 AI design tools + Figma plugin +
   MCP kaya, FREE tier capped (1 prompt/hari), PageSpeed PUBLIK
   (mobile 98/desktop 100/SEO 100), posisi: "layer = fondasi, ganti subjek".
   Pelajaran: diversitas FORMAT (bukan cuma scene), free tier terukur,
   metrik performa dipublikasikan, sistem palettes/fonts/compositions.

### Link pemilik (wajib simpan)
- **TikTok 1**: https://www.tiktok.com/@metadigital.az/video/7684990467439840519
  — "PPT bisa diubah jadi video informatif sekeren ini pakai Google Flow".
- **TikTok 2**: https://www.tiktok.com/@harlionapatra/video/7682640299746741524
  — "Ubah PPT jadi video dengan AI". Kreator: Harli Ona Patra (140K TikTok/
  200K IG, edukasi presentasi).
  **Kesimpulan sendiri**: keduanya satu tema = REFORMATASET jadi media baru
  (PPT → video sinematik via Google Flow/Vids/Veo, kredit harian gratis).
  Manfaat utk kita: (1) LOOP MARKETING — tiap template bisa diubah jadi video
  vertikal 15-30s utk TikTok/Reels → funnel ke site (biaya ~0); (2) metodologi
  — repackaging > bikin dari nol; (3) pasar SEA doyan "edukasi + visual wow".
- **https://robot-heads.fayaz.workers.dev/?shape=rectangle** — generator kepala
  robot SVG interaktif (param shape). Kegunaan nanti: aset dekoratif generatif
  (avatar, maskot, cursor companion, elemen free-template toy) + inspirasi
  "tool kecil yang bisa dimainkan" utk free tier.

## C. Temuan audit 18 Okt 2026 (bukti data)

| template | h1 | button | nav | <title> | meta desc | verdict |
|---|---|---|---|---|---|---|
| molten-forge | 0 | 0 | 0 | ✓ | ✓ | SCREENSAVER |
| aurora-ridge | 0 | 0 | 0 | ✗ | ✗ | SCREENSAVER + SEO mati |
| neon-alley | 0 | 0 | 0 | ✗ | ✗ | SCREENSAVER + SEO mati |
| ghost-pirate-ship | 0 | 0 | 0 | ✓ | ✗ | SCREENSAVER + a11y (aria) kosong |
| japan-island | 1 | 7 | 1 | ✓ | ✓ | mini-site ✓ (acuan) |
| ocean-shallows | 1 | 12 | 1 | ✓ | ✓ | mini-site ✓ (acuan) |

- **Akar masalah = BLUEPRINT (prompt vault)**: prompt japan minta
  headline/eyebrow/CTA/nav/footer/brand → jadi situs. 4 prompt lain TIDAK
  minta chrome sama sekali → AI bikin kanvas polos. Bukan salah AI.
- **Gate kemarin TIDAK mengecek "site-ness"** (title/h1/CTA/SEO per demo) →
  lolos tanpa ketahuan. Test permanen ditambahkan: deploy-gate site-ness.

## D. Rencana 9 template — STATUS: SELESAI ✅ (18 Okt 2026, deploy v42ba3d6b)

**Hasil:** semua rencana di bawah DIEKSEKUSI penuh → 9 template LIVE
(2 free / 2 pro / 5 max), gate lokal + LIVE PASSED (site-ness 9/9 hijau,
sat floor, 3 viewport, modal, CTA), typecheck OK, thumbs 9 webp, vault 8 md
sync. Chrome: title+meta-desc+nav+hero+fitur+brief panel+footer di 4 revisi;
3 baru dibangun dari nol dengan PAGE SPEC. Prompt vault lama sudah diperbaiki
(bullet "No text..." → PAGE SPEC chrome). Entri TRACKING + AGENTS.md ditulis.

Revisi 4 (beri TUJUAN + chrome penuh):
- molten → "Caldera Energy" — perusahaan energi geotermal (stats, solusi, CTA).
- aurora → "Nordlys Expeditions" — tur pengejar aurora (tanggal, paket, CTA).
- neon → "Midnight Signal" — label rekaman/venue malam (events, rilis, CTA).
- ghost → "Blackwake Charters" — kapal hantu dinner cruise / game landing (wishlist/booking).

3 baru (tema bebas, wajib tujuan, diversitas FORMAT):
- PRO-1 "PulseOps" — landing SaaS/AI dashboard (hero dashboard hidup +
  features + pricing preview) = tujuan: jual ke startup SaaS/AI.
- PRO-2 "Aether" — scroll-driven product story (cinematic one-pager) =
  tujuan: brand/e-commerce storytelling (kiblat punya, kita belum punya).
- FREE-1 generatif toy — terinspirasi robot-heads (kepala karakter SVG
  yang bisa dimainkan/di-generate) = tujuan: lead magnet + viral + pamer
  "free kita benar-benar bisa dipakai".

## E. Pipeline target (setelah 9) — ide efisien

Sudah DIMILIKI (jangan bikin baru): gen.tmp.mjs (generate), deploy-gate.mjs
(brightness+sat+3VP+modal), capture-thumbs, sync-vault, wrangler deploy.
Yang perlu: orkestrasi n8n/queue → generate batch → gate auto → thumb →
staging → APPROVAL MANUSIA → prod. Storage: Supabase Storage/R2 (yang ada).
Marketing loop: template → screenshot/video (Google Flow/Vids) → TikTok/Reels.

## F. Ronde 4b — evaluasi keras pemilik (18 Okt 2026, deploy a6d081b1) [PENTING]

**Evaluasi pemilik**: #3-#9 "letak tombol/tulisan seragam & tidak kreatif";
klik tombol = error; #4-#9 menurun drastis vs #1-#3 → #4-#9 DISKUALIFIKASI.
#1-#3 (japan/ocean/ghost) = standar emas yang JANGAN diturunkan.

**Akar masalah JUJUR (bukan Figma/Canva, bukan AI)**:
1. PROSES DRIFT: #7-#9 di-hand-code kilat mengejar deadline tanpa pipeline
   blueprint→gen→QA (kesalahan SAMA seperti screensaver batch sebelumnya —
   sejarah diulang = kegagalan proses, bukan tool). Chrome #4-#6 copy-paste
   blok CSS IDENTIK baris demi baris → "mirip2".
2. GATE TIDAK UKUR YANG PENTING: dulu cuma brightness/sat/site-ness — tidak
   ada kontras teks-scene, keragaman layout, collision, click behavior,
   validitas CTA. Yang tak diukur = lolos.
3. TIDAK ADA adversarial visual review: teks ditaruh di area terang scene
   tanpa cek luminance (aurora "Chase the" putih di white-glow; molten
   eyebrow oranye di langit oranye).

**Bug nyata round-4b — SEMUA SUDAH DIPERBAIKI (LIVE a6d081b1)**:
- 19× mailto = kandidat utama "klik = error" (handler OS user =
  360ExtremeBrowserURL → dialog error Windows). Diganti CTA in-page
  (button data-brief) + "Copy email" (clipboard API + execCommand fallback).
- aether: --acc hanya didefinisikan di `section` → nav/panel CTA transparan;
  fix default di `.ui`.
- robot-foundry: collision teks/gambar (fix split 2 kolom desktop, robot
  atas mobile), grid auto-placement zigzag (fix `.stage>*{grid-column:1}`),
  rAF leak (fix single loop chain).
- pulseops: zigzag menembus teks + kartu placeholder kosong (fix dashboard
  kolom kanan dgn kartu angka nyata; mobile 4 kartu bawah + band bawah).
- Kontras: scrim per template (molten mobile gradient bawah; aurora
  centered-vignette; neon right-rail gradient; ghost gradient kiri+mobile;
  aether radial per-section). Gate kini hitung h1 contrast (WARN <3):
  hasil live 3.14-13.4 semua hijau.
- Diversifikasi arketipe: molten=LB (stats kolom kiri-atas + cerita
  bawah-kiri), aurora=centered-vignette, neon=RIGHT-rail, ghost=left-middle,
  pulseops=dashboard-kanan, aether=chapter-center, robot=split-studio.
  Nav mobile nowrap utk brand panjang.

**GATE BARU permanen (deploy-gate.mjs)**: (A) larangan mailto:/tel:/
javascript:/http(s) di demo; (B2) native click semua button 0 pageerror,
CTA .btn.primary bg alpha ≥.5, CTA→#brief toggle buka/tutup, h1 contrast
WARN (h1 disembunyikan saat sampel bg), diversity sig kontrak quadrant
(ghost=LM molten=LB aurora=CM neon=RM + ≥3 side & ≥3 tier vertikal chrome7).
Modal ghost BLACK live = flake timing dikenal (re-run avg 93.8 ✓).

**PROSES WAJIB ke depan — framework 7-layer anti-drift (milik pemilik)**:
1 filosofi (kualitas = kontrak, bukan target) → 2 rules (MEMO/AGENTS) →
3 implementation (DESIGN BLUEPRINT per template SEBELUM kode: archetype,
palet, text-safe zones, focal) → 4 execution (generate via pipeline, JANGAN
hand-code kilat) → 5 output (gate penuh) → 6 reiteration (skor ≥8 semua
aspek sebelum deploy) → 7 adversarial test (click/contrast/diversity +
screenshot eyeball + collision). Layer 1-2 menolak drift; 3 penghubung
blueprint↔code. APPROVAL MANUSIA = gate akhir (roadmap pemilik).

**Jangan lupa lagi**: (1) template baru WAJIB blueprint dulu; (2) tak boleh
mailto/protocol eksternal di demo; (3) CTA primary wajib bg solid dgn
--acc didefinisikan di scope global (.ui); (4) screenshot mobile WAJIB
(nav wrap, scrim mobile, collision); (5) aether=CM & robot=LM masih kembar
quadrant dgn aurora/ghost — kandidat reiteration, JANGAN dianggap lulus
sempurna.

## G. Keputusan pemilik pasca-evaluasi kiblat (18 Okt 2026) [BARU]

**Evaluasi kiblat kompetitor (free-tier 3 Pillar sudah sangat detail)**:
prompt kompetitor = blueprint lengkap (asset URL + kode verbatim + spring
config + tabel breakpoint). Free-tier mereka sudah punya signature effect
(model-viewer 3D, canvas liquid reveal, WebGL). Kita ketinggalan di
signature effect + motion system + fluid typography + micro-interaction.

**4 keputusan pemilik (sudah dijawab & dikonfirmasi)**:
1. **Signature effect wajib tier pro/max** = **model-viewer 3D product hero**
   (produk GLB tilt mengikuti kursor + choreography interaktif). Paling
   "mahal" dilihat, CDN gratis, single-file friendly.
2. **Nasib #4-#9 (pulseops/aether/robot/molten/aurora/neon)** = **demote** ke
   tier basic/arsip, bangun **2-3 template BARU** di bar kompetitor (dengan
   signature effect) sbg pro/max baru. #1-#3 (japan/ocean/ghost) tetap
   standar emas.
3. **Storage + otomasi** = **Cloudflare R2 + CF Cron / GitHub Actions**
   (satu ekosistem dgn deploy workers.dev, murah, script Node existing
   tinggal dipanggil). BUKAN n8n (overkill).
4. **Urutan eksekusi** = **kualitas dulu → storage → otomasi**. Jangan
   otomasi sebelum bar kualitas naik (hindari produksi massal sampah).

**Standar kualitas PRO/MAX ke depan** (dari analisis 6 prompt kiblat):
- FREE floor = kualitas japan/ocean (jangan turunkan).
- PRO/MAX wajib unggul di: signature 3D hero, motion spring, fluid
  typography (clamp), glassmorphism detail, micro-interaction everywhere,
  asset premium (GLB/HDR), choreography terjadwal.
- Blueprint spec tebal = syarat (bukan cuma "ada h1+button").

**Kandidat template baru (PRO/MAX dgn model-viewer hero)**:
- #10 NEXUS — AR/VR headset brand (DamagedHelmet GLB), tier max. SELESAI & LIVE.

## H. Eksekusi direktif pemilik round-5 (18 Okt 2026, deploy fdaea273) [PENTING]

**Bug modal NEXUS (3D tak muncul di iframe)**: CSP_DEMO worker hanya izinkan
`script-src 'self' 'unsafe-inline'` → model-viewer CDN (ajax.googleapis.com)
DIBLOKIR → custom element tak upgrade → helm tak render. Local test lolos
karena tanpa CSP. FIX: vendor model-viewer.min.js (931KB) ke
`js/vendor/`, script tag pakai path relatif `../../js/vendor/...`.
JANGAN pernah load script eksternal di demo (CSP 'self' only).

**Tier migration (perintah pemilik)**:
- #1-3 (japan/ocean/ghost): free/max → **pro** (standar emas di tier berbayar).
- #4-9 (molten/aurora/neon/pulseops/aether/robot): → **free** (demoted).
- #10 nexus: **max** (signature effect premium).
- nFree: 2 → 6. Gate copy-vs-nFree tetap konsisten ("free to try").

**Prompt security (perintah pemilik "JANGAN BOCOR")**:
- ARSITEKTUR SUDAH BENAR: pro/max prompt disimpan di **Supabase Storage
  private bucket "premium"** (`premium/{id}.md`), di-serve via
  `/api/prompt/:id` SETELAH auth (Supabase JWT) + subscription check
  (COVERS map: free=public, pro=pro|max, max=max only).
- BUG: field `prompt` di `data/templates.json` (publik) MASIH berisi
  prompt pro/max → leak siapa pun bisa fetch JSON. FIX: hapus field
  `prompt` dari entri pro/max di JSON publik. Free tier TETAP punya
  prompt di JSON (untuk copy instan = lead magnet).
- Vault reorganized: `prompt-vault/prompts/pro/{japan,ocean,ghost}.md`,
  `prompt-vault/prompts/max/nexus.md`. sync-vault.mjs upload ke Storage.
- VERIFIED LIVE: public JSON 0 prompt pro/max; modal NEXUS tampilkan
  "Sign in to unlock" (prompt terkunci).

**Verifikasi live (fdaea273)**:
- Modal NEXUS: model-viewer `loaded:true`, `hasModel:true`, 1 material,
  camera orbit aktif, 0 console error, helm render sempurna di iframe.
- Public JSON: `japan=pro ocean=pro ghost=pro molten=free aurora=free
  neon=free pulseops=free aether=free robot=free nexus=max`,
  pro/max tanpa field prompt.
- Gate penuh PASSED (10 template × 3 viewport + interaksi + modal).

**Proses untuk template model-viewer ke depan**:
1. WAJIB vendor model-viewer.min.js lokal (jangan CDN — CSP block).
2. WAJIB ada 2D bg canvas (gate brightness sample canvas ini; canvas
   model-viewer di shadow DOM tak terjangkau querySelector).
3. GLB lokal di folder demo (bukan eksternal URL — CSP connect-src 'self').
4. Prompt pro/max HANYA di vault + Storage, JANGAN di templates.json publik.
- #11 (menunggu approval NEXUS dulu) — kategori lain (sneaker/watch/audio).

## I. OTOMASI MINGGUAN (round-6, 18 Okt 2026)

**Perintah pemilik**: 20 template/minggu, kualitas MINIMAL setara #1-3
(japan/ocean/ghost), recurring SELAMANYA tiap Sabtu 17:00, otomatis +
adaptif + self-upgrading. GLB pakai Khronos samples yg sudah direkomendasikan.

**Arsitektur pipeline** (`scripts/weekly-batch.mjs` + `weekly-run.ps1`):
1. Baca antrian dari `prompt-vault/prompts/queue/*.md` (format vault).
2. Generate tiap prompt via **Claude Code CLI** (`claude -p --permission-mode
   acceptEdits`) dgn ADAPTER CSP-safe (vendored three.js r170, fonts lokal,
   zero-CDN, site-ness contract). Retry s/d 3x kalau incomplete.
3. Gate per-template (site-ness: title/meta/h1/button/lang, no mailto/tel/
   javascript/external-href). Register ke templates.json + sitemap HANYA
   setelah gen+gate success (jangan register duluan — link broken).
4. Wrapper `weekly-run.ps1`: batch → full visual gate (deploy-gate.mjs) →
   thumbs → sync-vault → wrangler deploy (SKIP deploy kalau gate gagal).
5. Log per attempt ke `eval-shots/batch-log.jsonl` (id, ok, attempt, size,
   phase). Idempotent: sukses minggu ini → skip.

**Scheduler**: Task Scheduler `DepthGlow-WeeklyBatch`, trigger Weekly Saturday
17:00, ExecutionTimeLimit 8 jam, RestartCount 2 ( tiap 30 menit), StartWhenAvailable.
Registered & State=Ready (18 Okt 2026).

**Seed prompts (10, kualitas ≥ #1-3)** di `prompt-vault/prompts/queue/`:
- desert-mesa (max) — golden-hour red rock, dust devils, time-of-day slider
- bioluminescent-grotto (max) — sea cave glow, ripple-excites-plankton
- autumn-maple-valley (max) — momiji leaf-fall, floating-on-water, torii
- bamboo-mist-grove (pro) — zen grove, sway, light shafts, koi, WebAudio
- lighthouse-basalt-coast (max) — storm waves, rotating beam, lightning
- floating-sky-islands (max) — rope bridges, waterfalls, bird summon
- crystal-geode-cavern (max) — refraction caustics, pointer spotlight, shimmer pulse
- mushroom-fairy-forest (pro) — glow caps, spore burst, firefly summon
- rice-terraces-dawn (pro) — mirror paddies, mist, heron, time slider
- observatory-milky-way (max) — telescope slew, constellation toggle
Sisa 10 slot → tambah prompt ke queue di sesi berikutnya (sebelum Sabtu).

**Dry-run verified**: 10 prompts parsed OK, tanpa mutasi templates.json/sitemap.
Registration hanya setelah gen+gate success (fix: jangan register sebelum generate).

**To-do sblm Sabtu 24 Okt 17:00**:
- [ ] Tulis 10 prompt lagi ke queue (diverse tema, ≥ #1-3).
- [ ] Test generate 1 prompt end-to-end (claude CLI + gate) utk validasi pipeline real.
- [ ] Pastikan Supabase creds ada di .env utk sync-vault pro/max.
- [ ] (Opsional) Kalau mau GLB product-hero: tambah 2-3 prompt max dgn Khronos
      GLB (BoomBox/WaterBottle/ToyCar/MaterialsVariantsShoe/Drone) — vendor
      model-viewer.min.js + GLB lokal, ikuti checklist §H.

## J. DIREKTIF PEMILIK round-7 (18 Okt 2026) — MANDIRI, JANGAN MINTA DISUAPIN

**Sikap wajib**: agent harus MANDIRI — kerjakan sampai JADI, jangan tanya
"mau lanjut A atau B". Pemilik hanya kasih input kalau kebetulan nemu.
Program otomasi = sudah jadi 100%, siap evaluasi tiap Sabtu.

1. **Upgrade template #3-10** (ghost, molten, aurora, neon, pulseops, aether,
   robot): TAMBAH FITUR2 selevel #1-2 (japan/ocean). "MASA GITU AJA" = terlalu
   polos/kurang fitur. Contoh fitur #1-2: seasons/tides slider, creature
   interactions, click-ripple, scroll-narrative, ambient audio toggle.
2. **TOMBOL = TEMPLATE BANGET → DIUBAH**: CTA tombol sekarang kelihatan
   generic/templated. Redesign jadi khas tiap template (custom shape/glow/
   micro-interaction), bukan tombol rounded-standar.
3. **Re-analisis #4-10 vs 3 KIBLAT** (horizonx.so, motionsites.ai, getlayers.ai)
   sampai tahap EVALUASI. Ambil contoh dari 3 pillar → bikin yang LEBIH UNGGUL.
   Jangan ulangi kesalahan kualitas yg sama — saingan banyak.
4. **Program otomasi = 100% jadi** (tools apa + semuanya). Pemilik evaluasi
   Sabtu, cek berkala tiap minggu.

## K. Eksekusi round-7 (18 Okt 2026, deploy 2c28d797) — KIBLAT BAR + KIT

**Root cause "template banget + kalah fitur"**: buttons flat generic
(`.btn.primary` solid + `.btn.ghost` glass), default `cursor:pointer`, tanpa
motion/micro-interaction. ADAPTER generator juga gak enforce kualitas →
batch = sampah seragam. FIX di 2 lapis:

**1. Premium Interaction Kit** (`js/kit/kit.css` + `js/kit/motion.js`, ~7kb):
- **Reticle cursor** (reactbits target-cursor style): 4 corner brackets
  follow pointer dgn lerp, **SNAP mengelilingi button/link** saat hover
  (match bounding box), mix-blend-difference, border jadi `--acc` saat snap.
- **Magnetic buttons**: `.btn`/`[data-mag]` pull toward cursor (radius
  0.9× max-dim, force 0.35), spring easing, radial highlight ikut kursor
  (`--mx/--my`).
- **Reveal-on-scroll**: IntersectionObserver toggle `.in` pada `[data-reveal]`.
- **Fluid type scale** `--step-4..--step--1` (clamp), glass panel, spring
  button transition. Respects `prefers-reduced-motion` + `pointer:fine`
  (touch = skip reticle/magnetic).
- Patched ke 10 template existing (`patch-kit.mjs`, idempotent). Gate
  ditambah check **"kiblat kit ok"** (kit.css + motion.js + .btn wajib ada).

**2. ADAPTER generator di-upgrade** enforce KIBLAT QUALITY BAR (MANDATORY):
A. Signature 3D hero (three.js r170, animated + react pointer/scroll).
B. Wajib load kit (jangan hand-roll cursor/magnetic/reveal).
C. Fluid type + micro-interaction (data-reveal, hover feedback).
D. Scroll/POINTER choreography (camera react, bukan static loop).
E. Creative buttons (bukan flat primary+ghost generik).
F. Layout richness (nav + hero + 2-3 section + CTA + footer).
Gate menegakkan A-C via static check; B2+C menegakkan D-E via browser.

**TOOLS PROGRAM OTOMASI (100%, untuk evaluasi Sabtu)**:
| Tool | Fungsi |
|---|---|
| `weekly-batch.mjs` | Orchestrator: baca queue → generate (Claude CLI, **CONCURRENCY=3 parallel**) → gate → register |
| `weekly-run.ps1` | Wrapper Sabtu: batch → full gate → thumbs → sync-vault → deploy |
| Task Scheduler `DepthGlow-WeeklyBatch` | Trigger Weekly Saturday 17:00, 8h limit, restart 2× |
| `claude` CLI v2.1.289 | AI generator (acceptEdits, Write/Edit/Read/Glob/Grep) |
| `js/kit/*` | Premium interaction layer (reticle + magnetic + reveal) |
| `deploy-gate.mjs` | Full visual gate (brightness/CTA/modal/diversity/kiblat-kit) |
| `patch-kit.mjs` | Inject kit ke template existing (idempotent) |
| `smoke-kit.mjs` | Verify kit loads + reticle + magnetic (playwright) |
| `capture-thumbs.mjs` | Thumbnail webp 10 template |
| `sync-vault.mjs` | Upload prompt pro/max → Supabase Storage private |
| playwright (devDep) | Browser automation utk gate/smoke/thumbs |
| wrangler | Deploy Cloudflare Workers + Assets |

**Verified live (2c28d797)**:
- kit.css 200 (2848B) + motion.js 200 (3975B) serve.
- aurora + nexus punya kit.css + motion.js.
- Prompt pro/max: NONE leak di JSON publik.
- Gate PASSED 10/10 (kiblat kit ok ×10, brightness/CTA/modal/diversity pass).
- Smoke kit: reticle snap + magnetic + 0 console error (aurora/nexus/japan).

**Queue prompts = 20** (10 awal + 10 tambahan): desert-mesa, grotto, maple,
bamboo, lighthouse, sky-islands, geode, mushroom, rice, observatory (awal);
sneaker-hero, kelp-dive, night-market, caldera, cloud-temple, firefly,
balloon, ice-cavern, watch-hero, aurora-observatory (tambahan). 2 product-hero
pakai model-viewer+GLB Khronos (user: "pakai GLB yg direkomendasikan").

**Throughput**: `weekly-batch.mjs` generate CONCURRENT (CONCURRENCY=3, env
`BATCH_CONCURRENCY`). ~20 template × ~25min / 3 paralel ≈ 2.8 jam generation +
gate/thumbs/deploy. Task Scheduler limit = 14 jam (restart 3×). Kalau tak semua
selesai dalam 1 window, sisa tetap di `queue/` (idempotent skip yg sudah sukses
minggu ini) → auto-carry ke Sabtu berikutnya = self-adapting.

## L. Eksekusi round-7 gelombang 2 (19 Okt 2026 malam)

**1. Homepage redesign LIVE (v `844da570`) — desain Editorial × Swiss grid**:
- `css/styles.css` full rewrite: flat ink tanpa purple radial glow, hairline
  grid 6-kolom, font lokal Clash Display/Satoshi/Fraunces, hero asymmetric,
  section index "01 /", tombol wipe `background-size` di belakang teks.
- `index.html`: link kit.css+motion.js, `data-idx`, `data-reveal`,
  `<em>made to glow.</em>` (fix period Clash render jadi kotak). Semua ID
  fungsional `app.js` dipertahankan. Screenshot verified hero/pricing/FAQ/footer.

**2. Fix gate CTA**: check Part C lama "lum teks ≤0.3 (harus gelap)" berbasis
premis header gradien lama → diganti **WCAG contrast ratio ≥4.5** (teks vs bg
resolved). Token baru `--acc-btn:#6f4dff` utk fill tombol (putih = 5.02:1;
`--acc #7c5cff` cuma 4.35 → tak cukup). Gate PASSED lokal + LIVE.

**3. Commit `d4bc294`** (github specialist): 3 file (index.html, styles.css,
deploy-gate.mjs), 684+/201-. Catatan: banyak perubahan round-5/6 sebelumnya
BELUM ke-commit (demos, kit/, weekly-batch, fonts/, worker.ts) — commit
terpisah saat aman.

**4. Tier model DEFINITIF (dari pemilik) → diimplementasi di generator**:
- FREE = 2D + animasi keren, TANPA pengubah tampilan.
- PRO = 3D + animasi + TEPAT 2 pengubah tampilan.
- MAX = 3D + animasi + SEMUA 4 pengubah + selebihnya lengkap.
- 4 jenis pengubah (disesuaikan tema tiap template): theme/color switcher,
  ganti model/aset, waktu/musim/cuaca, ganti layout/variant.
- Implementasi: `buildAdapter()` weekly-batch → hero bar kondisional (free=2D
  hero WAJIB tanpa WebGL; pro/max=three.js 3D) + blok "TIER FEATURE CONTRACT"
  (aturan data-dc marker, kontrol in-page nyata mengubah scene, label
  thema-bukan-Option-AB) + rule E diperkuat (tombol generik flat DILARANG;
  treatment thema; nav/hero/card tidak boleh identik).
- Enforcement: fast-gate `data-dc` count (max≥4, pro≥2, free=0); deploy-gate
  Part A check sama dengan **legacy exempt** set: japan-island, ocean-shallows,
  ghost-pirate-ship, nexus (4 pro/max lama dibuat sebelum kontrak — retrofit
  TODO).

**5. 20 prompt queue di-patch** (`scripts/patch-queue-dc.mjs`, idempotent,
verified rerun): tiap prompt dpt paragraf "Tier features" berisi pick pengubah
tampilan spesifik thema (contoh desert-mesa: palettes Burnt Sienna/Ochre Dusk/
Storm Slate + juniper↔stone-arch + time-of-day slider+sandstorm + panorama↔
riverbed) + "Distinctive buttons" treatment unik per template (trail-sign
plaques, noren-curtain, porthole brass, reticle crosshair, dll).

**6. E2E test 1 prompt real (firefly-meadow, pro) → SUKSES**: gen attempt 1
(9 menit, 50.7KB) → fast-gate OK (data-dc=11, kit, three.js) → registered →
thumbs → vault copy → sync-vault (5 prompt premium ke bucket privat Supabase)
→ gate PASSED 11 template (brightness 3 viewport, sat, modal, 0 pageerror) →
deploy **v `57c3e230`** → live verified: 11 card, /t/firefly-meadow 200,
thumb png 200, /api/prompt anon = Unauthorized.

**7. Bug nyata ketangkap & fix saat E2E** (bukti pipeline jalan):
- Scene firefly HITAM: `-(d / 1.7) ** 2` → SyntaxError JS (unary minus sbg
  operand `**`). Fix manual → scene hidup (shot verified: twilight+moon+
  rumput+firefly; klik "Deep night" → scene berubah nyata ✓; mobile 390px
  tanpa overflow ✓).
- Guard baru: **`scripts/lib-js-syntax.mjs`** (ekstrak inline `<script>` →
  `node --check`; skip JSON-LD/importmap) dipakai fast-gate + deploy-gate.
  Verified 11/11 demo bersih + terbukti menangkap pola unary-**.
- Thumb bug: register menulis `.webp` tapi jalur GL QA-hook menghasilkan
  `.png` → reconcile otomatis di ujung `capture-thumbs.mjs` (tambal
  templates.json bila file thumb hilang, varian ext ada). Verified: firefly
  thumb → `.png`, patched=1.
- Vault copy: register kini salin prompt pro/max ke
  `prompt-vault/prompts/{tier}/{id}.md` SEBELUM rename queue→done (tanpa ini
  /api/prompt/:id 404 utk subscriber tiap Sabtu). Backfill firefly verified.

**8. Status Sabtu 19-24 Okt**: queue tersisa **19 file** (7 pro+13 max −
firefly); Task Scheduler `DepthGlow-WeeklyBatch` Sabtu 17:00 (PT14H, restart
3×30menit) → chain batch→gate→thumbs(reconcile)→sync-vault→deploy (deploy
skip kalau gate gagal). Adapter+gate kini enforce tier model.

**9. Sisa TODO**: (a) retrofit 4 legacy pro/max dgn pengubah tampilan
(data-dc) → hapus dari LEGACY_NO_DC; (b) variasi tombol per-template utk 10
template lama (keluhan pemilik "tombol kaku") — baru template BARU yg dijaga
rule E; (c) commit sisa perubahan round-5/6.

## M. Round-9 (19 Okt 2026 malam) — Batch upgrade 8 demo + Gate diversity fix + deploy e11d8ef1

**1. Batch `scripts/batch-upgrade.mjs` (background node PID 19884)** regenerate
8 demo dari prompt vault v2, hasil "Done: 8 ok, 0 fail":
- **max**: neon-alley (54467 B, data-dc 17→18), molten-forge (65766 B, data-dc
  20→21), nexus (41691 B, data-dc 13→14, model-viewer).
- **pro**: firefly-meadow (48979 B, data-dc=12) — **REMAKE v2 Seasons+Weather**:
  4 musim asli (state + SEA lerp), 5 weather system (rain 400 instanced +
  splash, snow 600, leaves 80, petals 120, transisi crossfade), 12000 grass,
  220 fireflies 3 species, 8 trees, 60 flowers, 3 display-changer groups
  (season/weather/wind) — tombol season lama yang PALSU (group tak dikenal
  go()) kini asli. Terbukti visual: eval-shots/fx-winter-snow.png (rumput
  frost + pohon gugur + partikel salju), fx-spring-petals.png (petal pink +
  aksen pink), 0 console error, no hScroll 390.
- **free** (prompt v2 "Creative Fonts + Buttons"): aurora-ridge (42958 B),
  pulseops (30009 B), aether (22958 B), robot-foundry (38638 B) — semua
  data-dc=0 kontrak tier, typography Clash Display/Satoshi anti-system-font,
  button treatments non-pill (ice-facet notch, arcade offset-shadow, bracket
  drift, dll).

**2. Gate diversity REJECTED 3 masalah lalu di-fix**:
- Root cause A: `sigs` (posisi h1 hero) diukur POST-klik-sweep → state setelah
  semua toggle ditekan tidak deterministik (molten mode ring, neon mode roof +
  focus-scroll). FIX: pindahkan ukur sig di deploy-gate.mjs ke SEBELUM sweep
  (kontrak = posisi hero default).
- Root cause B: molten-forge h1 y=0.516 (LM, kontrak LB butuh >0.62) — stats
  strip menahan h1 di tengah. FIX: `@media(min-width:1201px){.hero-copy>.stats{position:absolute;right:28px;bottom:36px}}`
  → h1 y=0.641 LB.
- Root cause C: neon-alley h1 y=0.287 (RT, kontrak RM butuh ≥0.33) + fokus
  panel tanpa preventScroll melompatkan scroll (y=-2.3). FIX: margin-top:150px
  di .hero-copy (mobile reset 0) → y=0.402 RM; `focus({preventScroll:true})`
  di openBrief/closeBrief.
- Root cause D (bug nyata tersembunyi): h1 neon tidak pernah muncul (SplitText
  chars stuck opacity 0/blur 8px) — GSAP `lagSmoothing` default menahan waktu
  saat fps berat (headless 1.6fps). molten/pulseops sudah
  `gsap.ticker.lagSmoothing(0)`, neon belum. FIX: tambah lagSmoothing(0).
  Verifikasi 17/17 char visible di 3s.

**3. Gate run ke-2: GATE PASSED** (eval-shots/gate-batch2.log) — diversity sig:
japan=LT ocean=RT ghost=LM molten=LB aurora=CM neon=RM pulseops=RM aether=RT
robot=LM nexus=LT firefly=LM; Part A 11/11, brightness 12s stability ok, CTA
kontras 5.02, 11 modal brightness ok, 0 pageerror.

**4. `npx wrangler deploy` → `e11d8ef1`**
https://depthglow.m-raihan-izudin.workers.dev — verifikasi HEAD 200 utk / +
5 demo, live firefly punya 4× data-dc season/weather.

**5. Note fps environment**: headless GPU di mesin ini lambat (japan 0.8fps,
ghost 0.7fps) — bukan regresi kode, scene berat + software GL; free demo
32-60fps.

**6. Screenshots bukti**: eval-shots/{fx-summer,fx-winter,fx-winter-snow,
fx-spring-petals,fx-mobile,molten-forge-fix,neon-fix2}.png.
