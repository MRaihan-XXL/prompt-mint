// Shared helpers for DepthGlow API (Cloudflare Pages Functions).
// Env vars required (set in CF Pages dashboard > Settings > Environment variables):
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
// Optional overrides: PRO_PLAN_ID, MAX_PLAN_ID
//   PAYPAL_MODE = "sandbox" | "live" (default "live") — swap API base for e2e testing

export interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  PRO_PLAN_ID?: string;
  MAX_PLAN_ID?: string;
  PAYPAL_MODE?: string;
}

const DEFAULT_PRO_PLAN = "P-11T043662M944992ANLIMV2Y";
const DEFAULT_MAX_PLAN = "P-1HB67148EX8070019NLIMWIY";

// PayPal API base — driven by PAYPAL_MODE so e2e never touches live money.
export function ppApi(env: Env): string {
  return env.PAYPAL_MODE === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

let _token: { value: string; exp: number } | null = null;

export async function paypalToken(env: Env): Promise<string> {
  if (_token && _token.exp > Date.now() + 5000) return _token.value;
  const basic = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${ppApi(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token failed: ${res.status}`);
  const data: any = await res.json();
  _token = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return _token.value;
}

export function planTier(env: Env, planId: string): string | null {
  const pro = env.PRO_PLAN_ID || DEFAULT_PRO_PLAN;
  const max = env.MAX_PLAN_ID || DEFAULT_MAX_PLAN;
  if (planId === max) return "max";
  if (planId === pro) return "pro";
  return null;
}

// PayPal subscription ids look like "I-3KJ..." — reject anything else early so we
// never spend API quota (or upsert garbage) on arbitrary strings.
export function looksLikeSubscriptionId(id: string): boolean {
  return /^I-[A-Za-z0-9]+$/.test(id);
}

// Verify a PayPal webhook per
// https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
export async function verifyPaypalWebhook(
  env: Env,
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const token = await paypalToken(env);
  const payload = {
    auth_algo: headers.get("paypal-auth-algo") || "",
    cert_url: headers.get("paypal-cert-url") || "",
    transmission_id: headers.get("paypal-transmission-id") || "",
    transmission_sig: headers.get("paypal-transmission-sig") || "",
    transmission_time: headers.get("paypal-transmission-time") || "",
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    event_body: rawBody,
  };
  const res = await fetch(`${ppApi(env)}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return false;
  const out: any = await res.json();
  return out.verification_status === "SUCCESS";
}

// Validate a Supabase access token and return the user.
export async function supabaseUser(
  env: Env,
  bearer: string | null
): Promise<{ id: string; email: string } | null> {
  if (!bearer) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) return null;
  const u: any = await res.json();
  if (!u || !u.id) return null;
  return { id: u.id, email: u.email || "" };
}

export interface Access {
  tier: "pro" | "max";
  subId: string;
  rowUserId: string | null;
}

// Return the active subscription for a user, or null.
//
// Implementation note: we deliberately do NOT filter by email inside the query
// string. Filtering on values that contain "@" behaved inconsistently from the
// workerd runtime (identical URLs returned rows via one code path and empty via
// another). So we fetch recent ACTIVE rows (plain status filter only — no
// special characters) and match email / user_id in code. Fine for a payment
// table of this size; revisit if subscriptions ever approach the limit.
const ACTIVE_SUB_SCAN_LIMIT = "200";

export async function activeTier(
  env: Env,
  userId: string,
  email: string
): Promise<Access | null> {
  const em = (email || "").trim().toLowerCase();
  const url =
    `${env.SUPABASE_URL}/rest/v1/subscriptions?` +
    new URLSearchParams({
      select: "status,plan,paypal_sub_id,user_id,email",
      status: "eq.ACTIVE",
      order: "updated_at.desc",
      limit: ACTIVE_SUB_SCAN_LIMIT,
    }).toString();
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error("activeTier query failed:", res.status, await res.text());
    return null;
  }
  const rows: any[] = (await res.json()) || [];
  const row =
    rows.find(
      (r) =>
        (em && ((r.email || "").trim().toLowerCase() === em)) ||
        (userId && r.user_id === userId)
    ) || null;
  if (!row) {
    console.error("activeTier miss:", JSON.stringify({ email: em, userId }));
    return null;
  }
  const tier = planTier(env, row.plan);
  if (tier !== "pro" && tier !== "max") return null;
  return { tier, subId: row.paypal_sub_id || "", rowUserId: row.user_id || null };
}

// Upsert a subscription row (idempotent on paypal_sub_id — must be PRIMARY KEY).
export async function upsertSubscription(
  env: Env,
  row: Record<string, unknown>
): Promise<void> {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?on_conflict=paypal_sub_id`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(row),
    }
  );
}

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}
