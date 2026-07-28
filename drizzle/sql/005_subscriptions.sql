-- 005_subscriptions.sql
--
-- Stripe subscription state, one row per user, mirrored from webhooks. RLS on
-- with a read policy for the owner (the app writes via the webhook as postgres,
-- BYPASSRLS); anon stays denied like every other table.
--
-- Idempotent: safe to re-run via `npm run db:setup`.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists tenant_isolation on public.subscriptions;
create policy tenant_isolation on public.subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
