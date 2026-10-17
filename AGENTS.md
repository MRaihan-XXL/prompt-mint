# DepthGlow — Aturan Proyek (Memory Permanen)

## Pelajaran wajib (dari pemilik, Okt 2026)
> **Jangan sok kreatif tanpa dasar.** Selalu benchmark dulu ke standar industri yang
> SUDAH TERBUKTI (bukti nyata: kualitas, performa, adopsi), tiru fondasinya, baru
> kembangkan jadi lebih baik. Tanpa fondasi = karya tanpa dasar.

Berlaku untuk setiap keputusan teknologi baru, desain, dan konten.

## Stack teknologi WAJIB (dipilih berdasarkan bukti, Okt 2026)
- **Grafis 2D**: WebGL + GLSL fragment shader (fullscreen quad).
- **Grafis 3D**: three.js **r170+ ESM** (import-map) + EffectComposer chain
  (ACES tone mapping + UnrealBloomPass + vignette + grain). Jangan pakai build UMD
  lama (deprecated r160) dan jangan fake-bloom.
- **Scroll-story**: Lenis (vendored) hanya untuk demo berbasis scroll; easing
  hand-rolled (lerp/cubic-bezier) untuk sisanya. GSAP tidak wajib — pakai hanya jika
  hand-rolled tween sudah tidak cukup.
- **WebGPU DITUNDA** — alasan: (1) in-app webview (Instagram/X/LINE) + iPhone lama +
  Linux Firefox masih gagal; (2) AI codegen menulis GLSL/WebGL jauh lebih andal
  daripada WGSL. **Re-evaluasi berkala** saat ketiga celah itu tertutup — kalau sudah,
  adaptasi naik ke WebGPU.
- Prompt premium yang dijual boleh rujuk three.js via CDN (situs user sendiri);
  demo di repo ini tetap vendored (CSP zero-CDN).

## Prioritas produk
1. Kualitas website, template, dan teknologi dulu (fokus utama saat ini).
2. Ekspansi (domain beli, lifetime, search, affiliate, dsb) = TUNDA sampai semua
   20 template + 20 prompt 100% jalan dan direview pemilik.
3. Jangan pernah menurunkan standar kualitas; kalau template gagal ≥3 iterasi,
   jujur turunkan klaim tier-nya (Cell rule), bukan standarnya.

## Aturan konten
- Prompt 7 bagian: purpose bisnis → deliverable → scene spec → motion spec →
  interaction spec → responsive/a11y → swappability.
- Parameter parity: warna hex / jumlah partikel / durasi / easing / interaksi di
  prompt HARUS sama persis dengan kode demo. Prompt = preview, terukur.
- Dilarang nama IP asli di nama/judul/template.
- Bahasa respons pemilik: Indonesia, jujur, tanpa ngalor-ngidul.

## Cara kerja
- PLANNING dulu sampai 100% paham → baru BUILD. Kalau bingung, tanyakan dulu —
  jangan langsung eksekusi.
- Kualitas bar demo: 60fps laptop mid · ≤150KB · zero CDN · indah di 1440px & 390px ·
  `prefers-reduced-motion` dihormati · screenshot "layak dijual".
- Deploy: `$env:CLOUDFLARE_API_TOKEN` + `npx wrangler deploy` dari root repo.
  Live: `https://depthglow.m-raihan-izudin.workers.dev` (worker `depthglow`).
