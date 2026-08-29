-- Groupe VGC Stripe payment upgrade (v10)
-- Run ONCE after invoice_upgrade.sql on the existing RBMOving Supabase project.

alter table public.invoices add column if not exists stripe_checkout_session_id text;
alter table public.invoices add column if not exists stripe_payment_intent_id text;
alter table public.invoices add column if not exists stripe_payment_status text;
alter table public.invoices add column if not exists paid_at timestamptz;

create index if not exists invoices_stripe_checkout_session_idx
  on public.invoices(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists invoices_stripe_payment_intent_idx
  on public.invoices(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
