-- ════════════════════════════════════════════════════════════════════
--   Drift reconciliation — tables that existed only in the live DB
--   Migration: 0002a_drift_tables
-- ════════════════════════════════════════════════════════════════════
--
-- challenge_prompts and wala_kalma_titles were created out-of-band (Supabase
-- SQL editor / uncommitted migrations) before the admin-dashboard work, so no
-- repo migration ever created them. 0003_admin_dashboard.sql REFERENCES both
-- (admin RLS policies + grants) and 0007 FKs seen_wala_kalma_titles to
-- wala_kalma_titles — meaning a fresh `supabase db reset` from the repo failed
-- at 0003. This file recreates them (structure + RLS + public-read policy) and
-- is numbered 0002a so it replays AFTER 0002 and BEFORE 0003.
--
-- Reconstructed from the live schema (project fdckxorflxrtrqabxozr) on
-- 2026-06-21. The admin "manage" policies and the anon/authenticated grants for
-- these tables remain in 0003 (left intact). categories.image_url, also
-- live-only, is added here too (categories is created in 0001).
-- ════════════════════════════════════════════════════════════════════

-- ── categories.image_url ────────────────────────────────────────────
-- Read by useCategories() in src/lib/queries.js; was live-only.
alter table public.categories
  add column if not exists image_url text;

-- ── challenge_prompts ───────────────────────────────────────────────
-- Naming-challenge prompt pool (managed in the /dashboard "Challenge Prompts" page).
create table if not exists public.challenge_prompts (
  id            uuid primary key default gen_random_uuid(),
  prompt_ar     text not null,
  prompt_en     text not null,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists challenge_prompts_active_order_idx
  on public.challenge_prompts (is_active, display_order);

alter table public.challenge_prompts enable row level security;

-- Public (guest + authenticated) read; the admin write policy + grants live in 0003.
drop policy if exists "Challenge prompts public read" on public.challenge_prompts;
create policy "Challenge prompts public read" on public.challenge_prompts
  for select to anon, authenticated
  using (true);

-- ── wala_kalma_titles ───────────────────────────────────────────────
-- Wala-Kalma (charades) title pool, by category slug + difficulty tier.
create table if not exists public.wala_kalma_titles (
  id            uuid primary key default gen_random_uuid(),
  category_slug text not null,
  difficulty    integer not null check (difficulty = any (array[200, 400, 600])),
  title_ar      text not null,
  title_en      text not null,
  origin        text,
  kind          text,
  year          integer,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists wala_kalma_titles_lookup_idx
  on public.wala_kalma_titles (category_slug, difficulty, is_active);

alter table public.wala_kalma_titles enable row level security;

drop policy if exists "Wala Kalma titles public read" on public.wala_kalma_titles;
create policy "Wala Kalma titles public read" on public.wala_kalma_titles
  for select to anon, authenticated
  using (true);
