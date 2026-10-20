// DepthGlow Worker: API router + static assets (Cloudflare Workers with Assets).
// Pages Functions are deprecated for new projects — this worker reuses the exact
// same handler modules (functions/**) via a thin router, no logic changes.
import { json, type Env } from "../functions/_lib/api";
import { onRequestGet as statusGet } from "../functions/api/status";
import { onRequestPost as webhookPost } from "../functions/api/paypal/webhook";
import { onRequestGet as promptGet } from "../functions/api/prompt/[id]";
import templatesData from "../data/templates.json";

// Shared Env + the Workers Assets binding (only exists in the Worker runtime).
type WorkerEnv = Env & {
  ASSETS: { fetch(request: Request): Promise<Response> };
};

// ---- Static-asset response headers (single source of truth) ----
// The old `_headers` file stacked duplicate CSP/X-Frame-Options on /demos/*
// (Cloudflare merges ALL matching rules), so iframe previews were always
// rejected (frame-ancestors 'none' + 'self', DENY + SAMEORIGIN). Set once here.
const CSP_MAIN =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.paypal.com; " +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.paypalobjects.com; font-src 'self'; " +
  "connect-src 'self' https://www.paypal.com https://api-m.paypal.com https://api-m.sandbox.paypal.com; " +
  "frame-src 'self' https://www.paypal.com; object-src 'none'; base-uri 'self'; " +
  "form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
const CSP_DEMO =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'self'; " +
  // GLTFLoader picks ImageBitmapLoader in Chrome, which fetch()es the embedded
  // texture's blob: URL — without this the fetch falls back to default-src
  // 'self' and every textured GLB renders texture-less on the live site.
  "connect-src 'self' blob:; " +
  "frame-ancestors 'self'; upgrade-insecure-requests";

function assetHeaders(pathname: string): Record<string, string> {
  const isDemo = pathname.startsWith("/demos/");
  let cache = "public, max-age=300";
  if (isDemo) cache = "public, max-age=3600";
  else if (pathname.startsWith("/js/vendor/")) cache = "public, max-age=604800";
  else if (pathname.startsWith("/data/")) cache = "public, max-age=60";
  return {
    "Content-Security-Policy": isDemo ? CSP_DEMO : CSP_MAIN,
    "X-Frame-Options": isDemo ? "SAMEORIGIN" : "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cache-Control": cache,
  };
}

// ---- /t/<id> shareable template page (SEO + social preview) ----
interface Tpl {
  id: string;
  title: string;
  category: string;
  tier: string;
  tags: string[];
  blurb: string;
  demo: string;
  thumb: string;
  accent: string;
}
const TPL_MAP: Map<string, Tpl> = new Map(
  ((templatesData as { templates?: Tpl[] }).templates || []).map((t) => [t.id, t])
);

function esc(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c as keyof Record<string, string>
      ] || c
  );
}

function templatePage(origin: string, t: Tpl): Response {
  const url = `${origin}/t/${t.id}`;
  const demoUrl = `${origin}/${t.demo}`;
  const thumbUrl = `${origin}/${t.thumb}`;
  const tierLabel = t.tier.charAt(0).toUpperCase() + t.tier.slice(1);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `DepthGlow — ${t.title}`,
    description: t.blurb,
    category: t.category,
    image: thumbUrl,
    url,
    brand: { "@type": "Brand", name: "DepthGlow" },
    offers: {
      "@type": "Offer",
      price: t.tier === "free" ? "0" : t.tier === "pro" ? "7" : "15",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url,
    },
  };
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.title)} — DepthGlow ${esc(tierLabel)} prompt</title>
<meta name="description" content="${esc(t.blurb)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:title" content="${esc(t.title)} — DepthGlow ${esc(tierLabel)} prompt">
<meta property="og:description" content="${esc(t.blurb)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(thumbUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)} — DepthGlow ${esc(tierLabel)} prompt">
<meta name="twitter:description" content="${esc(t.blurb)}">
<meta name="twitter:image" content="${esc(thumbUrl)}">
<meta name="theme-color" content="#07070b">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◈</text></svg>">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#07070b;color:#eef1f8;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{max-width:560px;width:100%;background:#0d0e14;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.card img{width:100%;display:block;aspect-ratio:16/10;object-fit:cover;border-bottom:1px solid rgba(255,255,255,.06)}
.body{padding:26px 28px 30px}
.tag{display:inline-block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd;border:1px solid rgba(167,139,250,.45);padding:5px 12px;border-radius:999px;background:rgba(124,58,237,.12)}
h1{font-size:clamp(1.5rem,4vw,2.1rem);letter-spacing:-.02em;margin:16px 0 10px}
p{color:#9aa3ba;line-height:1.6;font-size:1rem}
.cta{margin-top:22px}
a.btn{display:inline-block;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:12px;margin-right:10px;margin-top:8px}
a.solid{background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#04060d}
a.ghost{border:1px solid rgba(255,255,255,.18);color:#eef1f8}
.foot{margin-top:18px;color:#5f6b85;font-size:12px}
</style>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<div class="card">
  <img src="${esc(thumbUrl)}" alt="${esc(t.title)} preview" loading="lazy">
  <div class="body">
    <span class="tag">DepthGlow · ${esc(tierLabel)}</span>
    <h1>${esc(t.title)}</h1>
    <p>${esc(t.blurb)}</p>
    <div class="cta">
      <a class="btn solid" href="${esc(origin)}/#pricing">Get this prompt</a>
      <a class="btn ghost" href="${esc(demoUrl)}">Live preview</a>
    </div>
    <div class="foot">Copy the prompt, paste it into your AI, ship a site that glows.</div>
  </div>
</div>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method.toUpperCase();

    // API routes — never let a handler exception become a CF HTML 500; return JSON.
    try {
      if (pathname.replace(/\/+$/, "") === "/api/status" && method === "GET") {
        return statusGet({ request, env });
      }
      if (pathname.replace(/\/+$/, "") === "/api/paypal/webhook" && method === "POST") {
        return webhookPost({ request, env });
      }
      const m = pathname.match(/^\/api\/prompt\/([^/]+)\/?$/);
      if (m && method === "GET") {
        let id = "";
        try {
          id = decodeURIComponent(m[1]);
        } catch {
          return json({ error: "bad id" }, 400);
        }
        return promptGet({ request, env, params: { id } });
      }
    } catch (e) {
      // Log the real error server-side; clients only ever see "internal".
      console.error("worker handler error:", pathname, e);
      return json({ error: "internal" }, 500);
    }
    if (pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, 404);
    }

    // /t/<id> — shareable template page (SEO + social preview + JSON-LD).
    if (method === "GET") {
      const tm = pathname.match(/^\/t\/([^/]+)\/?$/);
      if (tm) {
        let id = "";
        try {
          id = decodeURIComponent(tm[1]);
        } catch {
          return new Response("bad id", { status: 400 });
        }
        const tpl = TPL_MAP.get(id);
        if (!tpl) return new Response("not found", { status: 404 });
        const origin = new URL(request.url).origin;
        return templatePage(origin, tpl);
      }
    }

    // Everything else = static assets (index.html at "/", 404.html for misses).
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    // Normalize first: drop anything stacked/duplicated, then set ours exactly once.
    headers.delete("content-security-policy");
    headers.delete("x-frame-options");
    headers.delete("cache-control");
    for (const [k, v] of Object.entries(assetHeaders(pathname))) headers.set(k, v);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  },
};
