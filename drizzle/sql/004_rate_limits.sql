-- 004_rate_limits.sql
--
-- Fixed-window rate-limit counters. Server-only infrastructure, so RLS is on
-- with no policy: only the app (postgres / service_role, BYPASSRLS) touches it,
-- and the PostgREST path stays closed like every other table.
--
-- Idempotent: safe to re-run via `npm run db:setup`.

create table if not exists public.rate_limits (
  bucket text primary key,
  count integer not null default 0,
  expires_at timestamptz not null
);

-- Lets the opportunistic cleanup delete expired rows cheaply.
create index if not exists rate_limits_expires_idx on public.rate_limits (expires_at);

alter table public.rate_limits enable row level security;
