-- ════════════════════════════════════════════════════════════════════
--   Revoke stray anon write grants on the new content tables
--   Migration: 0006_revoke_anon_writes
-- ════════════════════════════════════════════════════════════════════
--
-- drawing_words (0004) and app_settings (0005) were created with Supabase's
-- default table grants, which leave `anon` holding INSERT/UPDATE/DELETE/
-- TRUNCATE. RLS already blocks anon writes (no write policy for anon), but
-- migration 0003 established that anon must be read-only on content tables as
-- defense in depth. This brings the two new tables in line with that posture:
-- anon is read-only; authenticated keeps DML (RLS + is_admin() gate it) but
-- never TRUNCATE/REFERENCES/TRIGGER.
-- ════════════════════════════════════════════════════════════════════

revoke insert, update, delete, truncate, references, trigger
  on public.drawing_words, public.app_settings
  from anon;

revoke truncate, references, trigger
  on public.drawing_words, public.app_settings
  from authenticated;
