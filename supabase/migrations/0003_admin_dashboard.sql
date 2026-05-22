-- ════════════════════════════════════════════════════════════════════
--   Admin dashboard — schema, admin identity, RLS write policies
--   Migration: 0003_admin_dashboard
-- ════════════════════════════════════════════════════════════════════
--
-- Adds:
--   - categories.kind        — marks special category types ('wala-kalma')
--   - app_admins             — allow-list of dashboard administrators
--   - is_admin()             — RLS helper, true when the caller is an admin
--   - admin write policies   — only admins INSERT/UPDATE/DELETE content tables
--   - admin policies         — admins get full read/write on user-data tables
--   - grant tightening       — revoke stray write privileges from anon
--
-- NOTE: the admin auth user itself (admin@ummalhayman.com) is provisioned
-- out-of-band — it is not part of this schema migration and its password
-- is never committed. After creating the user, register it with:
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'admin@ummalhayman.com';
-- ════════════════════════════════════════════════════════════════════

-- ── categories.kind ─────────────────────────────────────────────────
-- Lets the game's wala-kalma routing be driven from the database
-- instead of the data/categories.js code file.
alter table public.categories
  add column if not exists kind text;

update public.categories
  set kind = 'wala-kalma'
  where slug in ('wala-kalma-english', 'wala-kalma-arabic', 'wala-kalma-gulf');

-- ── app_admins ──────────────────────────────────────────────────────
-- RLS enabled with NO policy for anon/authenticated ⇒ only service_role
-- / SQL can read or write it.
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- Fully invisible to the public roles (RLS already blocks rows; this
-- removes the default table grant too — defense in depth).
revoke all on public.app_admins from anon, authenticated;

-- ── is_admin() ──────────────────────────────────────────────────────
-- RLS helper. STABLE, empty search_path, schema-qualified names.
-- SECURITY DEFINER so it can read app_admins (which has no caller policy).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
-- only authenticated needs EXECUTE (RLS policy evaluation); anon never
-- evaluates an is_admin()-gated policy.
grant execute on function public.is_admin() to authenticated;

-- ════════════════════════════════════════════════════════════════════
--   RLS — admin write access (public SELECT policies are left intact)
-- ════════════════════════════════════════════════════════════════════

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins manage questions" on public.questions;
create policy "Admins manage questions" on public.questions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins manage challenge prompts" on public.challenge_prompts;
create policy "Admins manage challenge prompts" on public.challenge_prompts
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins manage wala kalma titles" on public.wala_kalma_titles;
create policy "Admins manage wala kalma titles" on public.wala_kalma_titles
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- user-data tables: admins get full read/write on every row
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins manage game sessions" on public.game_sessions;
create policy "Admins manage game sessions" on public.game_sessions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins manage seen questions" on public.seen_questions;
create policy "Admins manage seen questions" on public.seen_questions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ════════════════════════════════════════════════════════════════════
--   GRANT tightening — the live DB had drifted so anon/authenticated
--   held INSERT/UPDATE/DELETE/TRUNCATE on content tables. Make table
--   grants match intent: anon is read-only; authenticated keeps DML
--   (RLS + is_admin() gate it) but never TRUNCATE (bypasses RLS).
-- ════════════════════════════════════════════════════════════════════

revoke insert, update, delete, truncate, references, trigger
  on public.categories, public.questions,
     public.challenge_prompts, public.wala_kalma_titles
  from anon;

revoke truncate, references, trigger
  on public.categories, public.questions,
     public.challenge_prompts, public.wala_kalma_titles
  from authenticated;

grant select
  on public.categories, public.questions,
     public.challenge_prompts, public.wala_kalma_titles
  to anon, authenticated;

grant insert, update, delete
  on public.categories, public.questions,
     public.challenge_prompts, public.wala_kalma_titles
  to authenticated;
