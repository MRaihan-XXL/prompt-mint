import {
  Env,
  paypalToken,
  planTier,
  upsertSubscription,
  supabaseUser,
  looksLikeSubscriptionId,
  ppApi,
  json,
} from "../_lib/api";

// GET /api/status?sub_id=... — used by thanks.html to confirm activation.
// Checks PayPal directly (works even if the webhook is delayed) and syncs to Supabase.
//
// Public by design: the sub_id is a high-entropy capability token that only the
// buyer/PayPal know, and the response is minimal (active + status only).
// tier is included ONLY when the caller passes a valid Supabase Bearer token,
// so no third party can enumerate plan details of someone else's subscription.

interface Ctx {
  request: Request;
  env: Env;
}

export async function onRequestGet(context: Ctx): Promise<Response> {
  const { request, env } = context;
  const subId = new URL(request.url).searchParams.get("sub_id") || "";
  if (!subId) return json({ error: "missing sub_id" }, 400);
  if (!looksLikeSubscriptionId(subId)) return json({ error: "bad sub_id" }, 400);

  let sub: any;
  try {
    const token = await paypalToken(env);
    const res = await fetch(
      `${ppApi(env)}/v1/billing/subscriptions/${encodeURIComponent(subId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return json({ active: false, status: "UNKNOWN" });
    sub = await res.json();
  } catch {
    return json({ active: false, status: "ERROR" });
  }

  const status =
    sub.status === "ACTIVE"
      ? "ACTIVE"
      : sub.status === "APPROVED" || sub.status === "APPROVAL_PENDING"
      ? "PENDING"
      : "INACTIVE";

  // Sync so the prompt gate (which reads Supabase) sees it even if webhook lagged.
  await upsertSubscription(env, {
    paypal_sub_id: subId,
    email: ((sub.subscriber && sub.subscriber.email_address) || "").trim().toLowerCase(),
    plan: sub.plan_id || "",
    status,
    next_billing_time: sub.next_billing_time || null,
    updated_at: new Date().toISOString(),
  });

  // tier only for an authenticated caller (signed-in buyer)
  const bearer =
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || null;
  const user = bearer ? await supabaseUser(env, bearer) : null;

  return json({
    active: status === "ACTIVE",
    status,
    ...(user ? { tier: planTier(env, sub.plan_id) } : {}),
  });
}
