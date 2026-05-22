-- ════════════════════════════════════════════════════════════════════
--   App settings — admin-controlled feature flags
--   Migration: 0005_app_settings
-- ════════════════════════════════════════════════════════════════════
--
-- Adds:
--   - app_settings   — key/value boolean flags toggled from the dashboard
--                      Settings page
--   - public read + admin write RLS
--   - seed: the two challenge-type toggles
--
-- The game reads these via src/lib/queries.js (useAppSettings) at game start.
-- New flags = a new seeded row; no schema change needed.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.app_settings (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  value         boolean not null default true,
  label         text not null,
  description   text,
  display_order integer not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "App settings public read" on public.app_settings;
create policy "App settings public read" on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage app settings" on public.app_settings;
create policy "Admins manage app settings" on public.app_settings
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;

-- ── seed: the two challenge-type feature flags ──────────────────────
insert into public.app_settings (key, value, label, description, display_order) values
  ('naming_challenge_enabled', true, 'Question Challenge',
   'The word-naming face-off challenge round — two players race to name answers in turn.', 0),
  ('sketch_challenge_enabled', true, 'Drawing Challenge',
   'The Pictionary-style challenge round — a player draws on their phone and the team guesses.', 1)
on conflict (key) do nothing;
