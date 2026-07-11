-- ════════════════════════════════════════════════════════════════════
--   Drop unused emoji columns
--   Migration: 0009_drop_emoji_columns
-- ════════════════════════════════════════════════════════════════════
--
-- The product never renders any emoji: profile avatars and team badges show
-- name + color only. These columns were carried since 0001 but never read by
-- the app, and never written outside the admin CRUD form (now also removed).
--
-- Safe to drop: both tables hold 0 rows in the live DB at time of writing, so
-- there is no data to migrate or lose.
--   - profiles.emoji          (had default '🎲')
--   - game_sessions.team1_emoji / team2_emoji  (were NOT NULL; never inserted
--     by any client code path)
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles       drop column if exists emoji;
alter table public.game_sessions  drop column if exists team1_emoji;
alter table public.game_sessions  drop column if exists team2_emoji;
