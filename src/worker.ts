// DepthGlow Worker: API router + static assets (Cloudflare Workers with Assets).
// Pages Functions are deprecated for new projects — this worker reuses the exact
// same handler modules (functions/**) via a thin router, no logic changes.
import { json, type Env } from "../functions/_lib/api";
import { onRequestGet as statusGet } from "../functions/api/status";
import { onRequestPost as webhookPost } from "../functions/api/paypal/webhook";
import { onRequestGet as promptGet } from "../functions/api/prompt/[id]";

// Shared Env + the Workers Assets binding (only exists in the Worker runtime).
type WorkerEnv = Env & {
  ASSETS: { fetch(request: Request): Promise<Response> };
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method.toUpperCase();

    // API routes — never let a handler exception become a CF HTML 500; return JSON.
    try {
      if (pathname === "/api/debug/env" && method === "GET") {
        // TEMP: what env keys does the live worker actually see? (remove after)
        const keys = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_MODE", "PAYPAL_WEBHOOK_ID", "PAYPAL_CLIENT_SECRET"];
        const seen: Record<string, number> = {};
        for (const k of keys) seen[k] = ((env as any)[k] || "").length;
        return json({ keys: seen });
      }
      if (pathname === "/api/status" && method === "GET") {
        return statusGet({ request, env });
      }
      if (pathname === "/api/paypal/webhook" && method === "POST") {
        return webhookPost({ request, env });
      }
      const m = pathname.match(/^\/api\/prompt\/([^/]+)\/?$/);
      if (m && method === "GET") {
        return promptGet({ request, env, params: { id: decodeURIComponent(m[1]) } });
      }
    } catch (e) {
      return json({ error: "internal", detail: String((e as Error)?.message || e) }, 500);
    }
    if (pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, 404);
    }

    // Everything else = static assets (index.html at "/", 404.html for misses).
    return env.ASSETS.fetch(request);
  },
};
