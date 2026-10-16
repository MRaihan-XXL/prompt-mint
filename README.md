# DepthGlow — AI website design prompts

Static gallery of original AI website design prompts with live previews. Free tier copies instantly; Pro and Max unlock the premium vault.

## Stack
- Pure static HTML/CSS/vanilla JS + three.js (vendored locally).
- No build step, no framework, no backend.

## Structure
- `index.html` — gallery, pricing (PayPal), legal links.
- `data/templates.json` — template catalog. **Premium tiers carry no prompt text** (paywall).
- `demos/<id>/index.html` — live previews (2D CSS + real-time three.js 3D).
- `js/vendor/three.min.js` — vendored three.js r160 (WebGL, not WebGPU).
- `_headers` — CSP + security headers (honoured by Cloudflare Pages).

## Paywall
Free prompts live inline in `templates.json`. Pro/Max prompts are stored in the private `prompt-vault` repo and granted to subscribers after payment. The public file must never contain premium prompt text.

## Local preview
```
python -m http.server 8099
```
Then open http://127.0.0.1:8099

## Deploy (GitHub Pages)
1. Push this repo to GitHub.
2. Repo → Settings → Pages → Source: Deploy from a branch → `main` / root.
3. Site appears at `https://<user>.github.io/<repo>/`.

## Adding a template
1. Drop a demo under `demos/<id>/index.html`.
2. Add an entry to `data/templates.json` (omit `prompt` for non-free tiers).
3. For premium, store the full prompt in `prompt-vault/prompts/<tier>/<id>.md`.
