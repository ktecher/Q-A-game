-- ════════════════════════════════════════════════════════════════════
--   Kout — players confirm they're actually looking at their phone
--   Migration: 0012_kout_seat_ready
-- ════════════════════════════════════════════════════════════════════
--
-- Claiming a seat only proves a phone scanned the QR and picked a spot —
-- not that the player is still holding the phone when the host deals.
-- `ready` closes that gap: a seated player flips it on their own phone,
-- and startRound (kout/index.ts) refuses to deal the first hand until
-- every seat is both claimed AND ready.
--
-- Lives on kout_seats, not kout_hands: it's public information (anyone
-- can see who's dawdling) with nothing secret about it, same tier as
-- name or bid. Additive only — every existing column, policy, index and
-- is_kout_member() is untouched; the "Members read seats" policy from
-- 0010_kout.sql already covers this column for free.
-- ════════════════════════════════════════════════════════════════════

alter table public.kout_seats
  add column if not exists ready boolean not null default false;
