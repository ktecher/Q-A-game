-- ════════════════════════════════════════════════════════════════════
--   `authenticated` is now a public role — tighten what it holds
--   Migration: 0015_anon_authenticated_posture
-- ════════════════════════════════════════════════════════════════════
--
-- Every Kout player signs in anonymously (koutPlayerClient.js), and an
-- anonymous Supabase user carries role `authenticated` — same as a real
-- account. 0014 made those signups succeed, which quietly changed what
-- `authenticated` MEANS: it used to require an email account that had
-- clicked a confirmation link, and it now costs one unauthenticated POST
-- with the publishable key that ships in the client bundle. Anything
-- granted to `authenticated` is therefore granted to the public.
--
-- Two places in the schema were written when that was not true.
--
-- ── 1. TRUNCATE/REFERENCES/TRIGGER left on eight tables ──────────────
--
-- 0003 established the posture, in its own words: "authenticated keeps DML
-- (RLS + is_admin() gate it) but never TRUNCATE (bypasses RLS)", and 0006
-- applied it to the two tables 0003 missed. But that sweep only ever
-- covered the CONTENT tables. Supabase's default privileges hand
-- `authenticated` the full set on every new table in `public`, and three
-- later migrations revoked from `anon` while leaving `authenticated` alone:
--
--   0001  profiles, seen_questions, game_sessions
--   0007  seen_wala_kalma_titles      (revoke all ... from anon only)
--   0010  kout_games, kout_seats, kout_hands, kout_results
--                                     (revoke all ... from anon only)
--
-- so all eight still hold TRUNCATE. TRUNCATE is not row-level — it ignores
-- RLS entirely — which means the grant, read literally, lets any holder of
-- `authenticated` empty kout_hands or profiles wholesale. REFERENCES and
-- TRIGGER are the same shape of leftover.
--
-- Not currently reachable: PostgREST exposes only SELECT/INSERT/UPDATE/
-- DELETE/RPC and has no TRUNCATE verb, no exposed function truncates
-- anything, and `authenticated` has no CREATE on any schema (verified on
-- the live project), so it cannot author a function or table to exercise
-- TRIGGER/REFERENCES either. This is defense in depth, not a live hole —
-- exactly what 0006 was. It is worth closing now because the role it is
-- granted to just became public, and because a future RPC or a schema
-- exposed to PostgREST should not be one line away from being the door.
--
-- ── 2. profiles was readable by every signed-in user ─────────────────
--
-- "Profiles readable to authenticated" (0001) used `true`. Verified against
-- the live project: an anonymous session for the test Kout player reads all
-- four profile rows, including the admin's. It is the ONLY policy in the
-- schema that hands an anonymous player a row that is not theirs — every
-- Kout policy is scoped by is_kout_member()/auth.uid(), and the same probe
-- returns zero rows on kout_games/seats/hands/results, game_sessions and
-- seen_questions, with is_admin() false.
--
-- profiles holds no email (auth.users does, and that is not exposed), so
-- the exposure is display names, not credentials. Narrowing it anyway,
-- because nothing needs the width:
--
--   - the game never reads profiles at all — HomeScreen and SetupScreen
--     derive the shown name from user.email, and no other src/ file
--     queries the table;
--   - the /dashboard Users page still sees every row through the separate
--     permissive "Admins manage profiles" policy (FOR ALL, so it covers
--     SELECT), which this does not touch;
--   - profiles is not in the supabase_realtime publication, so no
--     subscription depends on the wider read.
--
-- If a feature ever does need to show one player another's profile name,
-- this reverts to `using (true)` in one line — but it should not, because
-- Kout already carries its own names on kout_seats.name.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. finish the 0003/0006 sweep ───────────────────────────────────
revoke truncate, references, trigger
  on public.profiles, public.seen_questions, public.game_sessions,
     public.seen_wala_kalma_titles,
     public.kout_games, public.kout_seats,
     public.kout_hands, public.kout_results
  from authenticated;

-- ── 2. your profile is yours ────────────────────────────────────────
drop policy if exists "Profiles readable to authenticated" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
