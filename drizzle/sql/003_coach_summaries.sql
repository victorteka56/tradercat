-- 003_coach_summaries.sql
--
-- The cross-history AI coach's cached summary — one row per user. Created here
-- (idempotently) rather than via drizzle-kit push so the DB is reproducible
-- from version control, and RLS is enabled inline to match every other table.
--
-- Idempotent: safe to re-run via `npm run db:setup`.

create table if not exists public.coach_summaries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  input_hash text not null,
  model text not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same tenant policy as the rest: the app (postgres, BYPASSRLS) is unaffected;
-- this closes the PostgREST path for anon/authenticated.
alter table public.coach_summaries enable row level security;
drop policy if exists tenant_isolation on public.coach_summaries;
create policy tenant_isolation on public.coach_summaries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
