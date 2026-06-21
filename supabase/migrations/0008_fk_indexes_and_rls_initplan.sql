-- ════════════════════════════════════════════════════════════════════
--   Performance — FK covering indexes + auth_rls_initplan fix
--   Migration: 0008_fk_indexes_and_rls_initplan
-- ════════════════════════════════════════════════════════════════════
--
-- Clears two Supabase performance advisories (applied to the live DB
-- 2026-06-21):
--   - unindexed_foreign_keys: add covering indexes for the two FK columns
--     used by the seen-reset RPCs (0007) and cascade deletes.
--   - auth_rls_initplan: wrap bare auth.uid() in a scalar subquery so the
--     planner evaluates it once per statement, not once per row. Semantically
--     identical; only the four owner policies regressed (admin policies were
--     already written with the (select ...) form).
-- ════════════════════════════════════════════════════════════════════

create index if not exists seen_questions_question_id_idx
  on public.seen_questions (question_id);
create index if not exists seen_wala_kalma_titles_title_id_idx
  on public.seen_wala_kalma_titles (title_id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users manage own seen list" on public.seen_questions;
create policy "Users manage own seen list" on public.seen_questions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own sessions" on public.game_sessions;
create policy "Users manage own sessions" on public.game_sessions
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users manage own seen titles" on public.seen_wala_kalma_titles;
create policy "Users manage own seen titles" on public.seen_wala_kalma_titles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
