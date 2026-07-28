-- 002_enable_rls.sql
--
-- Enable Row-Level Security on every public table.
--
-- WHY THIS EXISTS
-- All application data access runs server-side through Drizzle as the `postgres`
-- role, which has BYPASSRLS — so none of these policies ever affect the app.
-- Their sole job is to close the PostgREST hole: Supabase exposes the `public`
-- schema over its REST API to the browser-shipped `anon` key. With RLS off, any
-- visitor can grab that key from the page source and read or write every user's
-- trades, fills, positions and encrypted broker secrets directly, bypassing the
-- Next.js app and all of its careful userId filtering. RLS is the only thing
-- that gates that path — app-layer scoping does not reach it.
--
-- SHAPE
-- Tenant tables get a policy for the `authenticated` role only, scoped to the
-- caller's own rows. `anon` is granted no policy, so RLS denies it every row.
-- The two global cache tables get RLS with no policy at all: no client should
-- read the raw caches, and the server (BYPASSRLS) still fills them.
--
-- `(select auth.uid())` is the Supabase-recommended form — it evaluates the
-- claim once per query rather than once per row.
--
-- Idempotent: safe to re-run via `npm run db:setup` (drop-then-create policies,
-- and ENABLE is a no-op when already on).

-- Tenant tables — one row-owner column, `user_id`, so one identical policy.
do $$
declare
  t text;
  tenant_tables text[] := array[
    'ai_analyses',
    'brokerage_accounts',
    'brokerage_connections',
    'fills',
    'import_batches',
    'import_row_errors',
    'positions',
    'reconstruction_runs',
    'snaptrade_users',
    'tags',
    'trade_legs',
    'trade_notes',
    'trade_tags',
    'trades'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format(
      'create policy tenant_isolation on public.%I '
      || 'for all to authenticated '
      || 'using ((select auth.uid()) = user_id) '
      || 'with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;

-- profiles is keyed on the auth user id itself, not a `user_id` column.
alter table public.profiles enable row level security;
drop policy if exists tenant_isolation on public.profiles;
create policy tenant_isolation on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Global caches: shared, non-user data. RLS on + no policy denies anon and
-- authenticated entirely; only the server (BYPASSRLS) reads or writes them.
alter table public.price_candles enable row level security;
alter table public.symbol_news enable row level security;
