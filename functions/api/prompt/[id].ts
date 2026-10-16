import {
  Env,
  supabaseUser,
  activeTier,
  json,
} from "../../_lib/api";
// Bundle the catalog into the worker at deploy time — no runtime self-fetch
// (fetching our own origin from inside the worker proved unreliable).
import templatesData from "../../../data/templates.json";

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

interface TplInfo {
  tier: string;
  prompt: string | null;
}

// Static catalog map (id -> tier/prompt) built once per isolate from the import.
const TPL: Map<string, TplInfo> = new Map(
  ((templatesData as any).templates || []).map((x: any) => [
    x.id,
    { tier: x.tier, prompt: x.prompt || null } as TplInfo,
  ])
);

export async function onRequestGet(context: Ctx): Promise<Response> {
  const { request, params, env } = context;
  const id = params.id;
  if (!id) return json({ error: "missing id" }, 400);

  // 1) who is calling?
  const bearer =
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || null;
  const user = await supabaseUser(env, bearer);
  if (!user) return json({ error: "auth_required" }, 401);

  // 2) what tier is this template? (bundled public metadata)
  const tpl = TPL.get(id) || null;
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
