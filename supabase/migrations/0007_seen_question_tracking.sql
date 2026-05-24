-- ════════════════════════════════════════════════════════════════════
--   Per-user no-repeat rotation across games
--   Migration: 0007_seen_question_tracking
-- ════════════════════════════════════════════════════════════════════
--
-- Until now, `gameSeed` only prevented duplicate questions WITHIN a
-- single game. Across games, a logged-in user picking the same category
-- (e.g. "flags") would frequently see the same questions again because
-- each tier only holds ~6 rows — random reshuffling collides often.
--
-- This migration powers a per-user "seen list" so the client can filter
-- already-served questions out of the pool before the seeded pick runs.
--
--   Regular Q&A questions  →  reuses public.seen_questions (defined in
--                             0001). The table existed but was unused at
--                             runtime; only the admin dashboard read it.
--
--   Wala Kalma (charades)  →  needs a parallel table because charade
--                             titles live in wala_kalma_titles (not in
--                             questions), so seen_questions.question_id
--                             can't FK them. We mirror the shape and RLS
--                             of seen_questions.
--
-- When the user has seen every row in a category and that category is
-- picked for a new game, the client triggers the matching reset RPC
-- below, which clears the user's seen rows for that one category only,
-- starting a fresh cycle. The deletes are scoped to the caller via
-- `auth.uid()` so a missing or hostile p_slug cannot delete other users'
-- rows.
-- ════════════════════════════════════════════════════════════════════

-- ── seen_wala_kalma_titles ─────────────────────────────────────────
-- Mirrors seen_questions: composite PK so re-marking is idempotent,
-- cascade-delete from both sides so user removal / title removal don't
-- leave orphan history.
create table if not exists public.seen_wala_kalma_titles (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  title_id  uuid not null references public.wala_kalma_titles(id) on delete cascade,
  seen_at   timestamptz not null default now(),
  primary key (user_id, title_id)
);

alter table public.seen_wala_kalma_titles enable row level security;

-- Owner self-management — matches the seen_questions policy from 0001.
drop policy if exists "Users manage own seen titles" on public.seen_wala_kalma_titles;
create policy "Users manage own seen titles"
  on public.seen_wala_kalma_titles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin override — matches the parallel pattern added by 0003 on every
-- user-data table. `(select public.is_admin())` is the wrapped form so
-- Postgres caches the function result per statement.
drop policy if exists "Admins manage seen titles" on public.seen_wala_kalma_titles;
create policy "Admins manage seen titles"
  on public.seen_wala_kalma_titles for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Grants: anon gets nothing on user-data tables (0001 precedent);
-- authenticated gets DML but never TRUNCATE/REFERENCES/TRIGGER
-- (0003/0006 precedent). Supabase's default table grant gives anon SELECT,
-- so we explicitly revoke it to match seen_questions' posture and silence
-- the pg_graphql_anon_table_exposed advisor.
revoke all on public.seen_wala_kalma_titles from anon;
grant select, insert, update, delete on public.seen_wala_kalma_titles to authenticated;

-- ── reset_seen_for_category(slug) ──────────────────────────────────
-- Clears the caller's seen list for one regular-question category, so
-- the next game in that category begins a fresh cycle. SECURITY INVOKER
-- so the existing seen_questions RLS still applies (auth.uid() = user_id),
-- which means even if the function leaks the body to a non-owner, RLS
-- prevents it from deleting another user's rows. Returns the row count
-- so the client can log / observe how many were cleared.
create or replace function public.reset_seen_for_category(p_slug text)
returns int
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted int;
begin
  if auth.uid() is null then
    raise exception 'reset_seen_for_category: must be authenticated';
  end if;
  delete from seen_questions
    where user_id = auth.uid()
      and question_id in (
        select q.id from questions q
        join categories c on c.id = q.category_id
        where c.slug = p_slug
      );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.reset_seen_for_category(text) from public;
grant execute on function public.reset_seen_for_category(text) to authenticated;

-- ── reset_seen_wala_kalma_for_category(slug) ───────────────────────
-- Parallel of the above for the three wala-kalma category slugs. Same
-- guarantees, same shape, different target table.
create or replace function public.reset_seen_wala_kalma_for_category(p_slug text)
returns int
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted int;
begin
  if auth.uid() is null then
    raise exception 'reset_seen_wala_kalma_for_category: must be authenticated';
  end if;
  delete from seen_wala_kalma_titles
    where user_id = auth.uid()
      and title_id in (
        select id from wala_kalma_titles
        where category_slug = p_slug
      );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.reset_seen_wala_kalma_for_category(text) from public;
grant execute on function public.reset_seen_wala_kalma_for_category(text) to authenticated;
