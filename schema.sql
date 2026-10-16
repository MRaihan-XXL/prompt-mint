-- DepthGlow — Supabase schema (Stage A)
-- Run ONCE in: Supabase Dashboard > SQL Editor > New query > Run.
-- Idempotent: safe to re-run.

-- 1) Subscriptions: written ONLY by our backend (service_role key), read by the
--    prompt gate. PK = PayPal subscription id => webhook / status upserts are
--    idempotent (resolution=merge-duplicates on paypal_sub_id).
create table if not exists public.subscriptions (
  paypal_sub_id     text primary key,
  email             text not null default '',   -- PayPal payer email, stored lowercase
  plan              text not null default '',   -- PayPal plan id (P-...)
  status            text not null default 'PENDING', -- ACTIVE | PENDING | INACTIVE
  user_id           uuid,                        -- auth.users.id; backfilled by the gate on first access
  next_billing_time timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_user_idx   on public.subscriptions (user_id);
create index if not exists subscriptions_email_idx  on public.subscriptions (email);

-- 2) RLS: enabled with NO policies => anon & authenticated are fully blocked.
--    The backend uses the service_role key, which bypasses RLS.
alter table public.subscriptions enable row level security;

-- 3) Storage: bucket "premium" is created PRIVATE by scripts/sync-vault.mjs.
--    Private buckets deny anon/authenticated by default; only service_role can read.
--    Do NOT add any public SELECT policy on storage.objects for 'premium'.

-- 4) Notes
--  - Deliberately NO foreign key to auth.users: payment history survives account deletion.
--  - Emails are lowercased on write (webhook + /api/status) and matched with
--    email=eq.<lowercased> in the prompt gate.
