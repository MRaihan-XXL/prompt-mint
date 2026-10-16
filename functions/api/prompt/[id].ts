import {
  Env,
  supabaseUser,
  activeTier,
  json,
} from "../../_lib/api";

// GET /api/prompt/:id  (Authorization: Bearer <supabase access token>)
// The paywall gate: only returns a premium prompt when the signed-in user
// has an ACTIVE subscription that covers the template's tier.
//
// Coverage: free = anyone; pro = pro|max; max = max only.

interface Ctx {
  request: Request;
  params: Record<string, string>;
  env: Env;
}

const COVERS: Record<string, string[]> = {
  free: ["free", "pro", "max"],
  pro: ["pro", "max"],
  max: ["max"],
};

// Module-scope cache: templates.json rarely changes and an isolate lives for a
// while — avoids re-fetching it on every gate request (latency + origin load).
interface TplInfo {
  tier: string;
  prompt: string | null;
}
let _tplCache: { t: number; map: Map<string, TplInfo> } | null = null;
const TPL_TTL_MS = 5 * 60 * 1000;

async function getTemplate(origin: string, id: string): Promise<TplInfo | null> {
  const now = Date.now();
  if (!_tplCache || now - _tplCache.t > TPL_TTL_MS) {
    try {
      const res = await fetch(`${origin}/data/templates.json`);
      const data: any = await res.json();
      const map = new Map<string, TplInfo>();
      for (const x of data.templates || []) {
        map.set(x.id, { tier: x.tier, prompt: x.prompt || null });
      }
      _tplCache = { t: now, map };
    } catch {
      _tplCache = null;
    }
  }
  return _tplCache ? _tplCache.map.get(id) || null : null;
}

export async function onRequestGet(context: Ctx): Promise<Response> {
  const { request, params, env } = context;
  const id = params.id;
  if (!id) return json({ error: "missing id" }, 400);

  // 1) who is calling?
  const bearer =
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || null;
  const user = await supabaseUser(env, bearer);
  if (!user) return json({ error: "auth_required" }, 401);

  // 2) what tier is this template? (public metadata, cached)
  const origin = new URL(request.url).origin;
  const tpl = await getTemplate(origin, id);
  if (!tpl) return json({ error: "not_found" }, 404);
  const tier = tpl.tier;

  // 3) free tier → prompt is public anyway.
  if (tier === "free") {
    return json({ id, tier, prompt: tpl.prompt, access: "free" });
  }

  // 4) premium → require an active subscription that covers this tier.
  const access = await activeTier(env, user.id, user.email);
  if (!access || !COVERS[tier].includes(access.tier)) {
    return json({ error: "subscription_required", required: tier, current: access ? access.tier : null }, 402);
  }

  // 4b) lazy backfill: the webhook only knows the payer email — link the row to
  // the Supabase user the first time they actually access a prompt.
  if (!access.rowUserId && access.subId) {
    void fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?paypal_sub_id=eq.${encodeURIComponent(access.subId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ user_id: user.id }),
      }
    ).catch(() => {});
  }

  // 5) fetch the premium prompt from private Supabase Storage.
  let prompt: string;
  try {
    const objRes = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/premium/${encodeURIComponent(id)}.md`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!objRes.ok) {
      return json({ error: "prompt_not_published", id }, 404);
    }
    prompt = await objRes.text();
  } catch {
    return json({ error: "storage_error" }, 500);
  }

  return json({ id, tier, prompt, access: access.tier });
}
