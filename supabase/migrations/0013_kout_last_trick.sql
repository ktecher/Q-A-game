-- ════════════════════════════════════════════════════════════════════
--   Kout — let the room see the card that just won the trick
--   Migration: 0013_kout_last_trick
-- ════════════════════════════════════════════════════════════════════
--
-- kout/index.ts clears `trick` to '[]' in the SAME update that completes a
-- trick (a full trick and "trick just cleared" are one write, never two
-- states a client can observe in between). That means no client ever reads
-- a full trick — the card that decides who won is the one card the room
-- never sees, which the grid layout turned into a permanent empty cell.
--
-- `last_trick` rides that same write: index.ts sets it to the just-completed
-- trick alongside `trick: []`, and TrickArea.jsx falls back to it whenever
-- `trick` is empty so the room gets a brief look at the winning card before
-- the next one is led. No new write, no new error path — the value is
-- already in hand at the point the existing update happens.
--
-- No winner column needed alongside it: `turn_seat` already IS the trick
-- winner during that pause (they lead next), so nothing new to derive it.
--
-- Additive only — every existing column, policy, index and is_kout_member()
-- is untouched.
-- ════════════════════════════════════════════════════════════════════

alter table public.kout_games
  add column if not exists last_trick jsonb not null default '[]'::jsonb;
