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
      await upsertSubscription(env, {
        paypal_sub_id: subId,
        email: ((res.subscriber && res.subscriber.email_address) || "").trim().toLowerCase(),
        plan: res.plan_id || "",
        status: mapStatus(res.status || ""),
        next_billing_time: res.next_billing_time || null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return json({ received: true });
}
