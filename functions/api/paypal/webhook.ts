import {
  Env,
  verifyPaypalWebhook,
  upsertSubscription,
  looksLikeSubscriptionId,
  json,
} from "../../_lib/api";

// POST /api/paypal/webhook — PayPal sends subscription lifecycle events here.
// We verify the signature, then upsert subscription status into Supabase.
// Configure this URL in PayPal Dashboard > Developer > Webhooks:
//   https://<your-domain>/api/paypal/webhook

interface Ctx {
  request: Request;
  env: Env;
}

// Explicit allow-list: PAYMENT.* events share the BILLING.SUBSCRIPTION. prefix but
// carry a PAYMENT resource (no plan_id) — upserting those would corrupt the table.
const SUB_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.APPROVED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAUSED",
]);

function mapStatus(subStatus: string): string {
  if (subStatus === "ACTIVE") return "ACTIVE";
  if (subStatus === "APPROVED" || subStatus === "APPROVAL_PENDING") return "PENDING";
  return "INACTIVE"; // CANCELLED, SUSPENDED, EXPIRED, FAILED, PAUSED
}

// CANCELLED / EXPIRED / SUSPENDED: terms promise access until the end of the
// paid period. PayPal keeps `next_billing_time` (or `expected_cancel_date` on a
// scheduled cancel) on the event resource — if that date is still in the future
// we KEEP the row ACTIVE; activeTier also self-checks the date at read time, so
// no cron is needed for the eventual flip (deny once the date has passed).
function stillPaidUntil(res: any): string | null {
  const candidate = res.expected_cancel_date || res.next_billing_time ||
    (res.billing_info && res.billing_info.next_billing_time) || null;
  if (!candidate) return null;
  const t = Date.parse(candidate);
  return !isNaN(t) && t > Date.now() ? candidate : null;
}

export async function onRequestPost(context: Ctx): Promise<Response> {
  const { request, env } = context;
  const rawBody = await request.text();

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const valid = await verifyPaypalWebhook(env, request.headers, rawBody);
  if (!valid) {
    return json({ error: "invalid signature" }, 401);
  }

  const type: string = event.event_type || "";
  const res: any = event.resource || {};

  if (SUB_EVENTS.has(type)) {
    const subId: string = res.id || "";
    if (subId && looksLikeSubscriptionId(subId) && res.plan_id) {
      let status = mapStatus(res.status || "");
      let nextBilling = res.next_billing_time || null;
      if (status === "INACTIVE") {
        const paidUntil = stillPaidUntil(res);
        if (paidUntil) {
          // Cancelled mid-period: keep access until the paid-through date.
          status = "ACTIVE";
          nextBilling = paidUntil;
        }
      }
      try {
        await upsertSubscription(env, {
          paypal_sub_id: subId,
          email: ((res.subscriber && res.subscriber.email_address) || "").trim().toLowerCase(),
          plan: res.plan_id || "",
          status,
          next_billing_time: nextBilling,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        // Non-2xx → PayPal retries the webhook (up to ~15 times over hours).
        console.error("webhook upsert failed:", e);
        return json({ error: "upsert failed" }, 500);
      }
    }
  }

  return json({ received: true });
}
