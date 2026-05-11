-- ════════════════════════════════════════════════════════════════════
--   Umm Al Hayman City — initial schema
--   Migration: 0001_initial
-- ════════════════════════════════════════════════════════════════════
--
-- Tables in this migration:
--   - profiles         — extends auth.users with display_name + emoji
--   - categories       — 30 bilingual categories (built-in)
--   - questions        — bilingual question pool keyed to (category, difficulty)
--   - seen_questions   — per-user (or per-device) rotation tracking
--   - game_sessions    — final results + stats for played games
--
-- All tables have RLS enabled. Public read on categories + questions.
-- Authenticated users manage only their own rows everywhere else.
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null check (length(display_name) between 2 and 40),
  emoji           text default '🎲',
  preferred_language text default 'ar' check (preferred_language in ('ar', 'en')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create a profile when a user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ────────────────────────────────────────────────────────────────────
-- categories
-- ────────────────────────────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name_ar     text not null,
  name_en     text not null,
  icon_name   text not null default 'BookOpen',
  accent_color text not null default '#173D6E',
  is_featured_for_guests boolean not null default false,
  display_order int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists categories_featured_idx
  on categories (is_featured_for_guests, display_order);

-- ────────────────────────────────────────────────────────────────────
-- questions
-- ────────────────────────────────────────────────────────────────────
create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id) on delete cascade,
  difficulty    int not null check (difficulty in (200, 400, 600)),
  question_ar   text not null,
  question_en   text not null,
  answer_ar     text not null,
  answer_en     text not null,
  hint_ar       text,
  hint_en       text,
  source_url    text,
  verified_by   text,
  created_at    timestamptz not null default now()
);

create index if not exists questions_category_difficulty_idx
  on questions (category_id, difficulty);

-- ────────────────────────────────────────────────────────────────────
-- seen_questions  (per-user rotation)
-- ────────────────────────────────────────────────────────────────────
create table if not exists seen_questions (
  user_id       uuid not null references profiles(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  seen_at       timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ────────────────────────────────────────────────────────────────────
-- game_sessions  (results + stats)
-- ────────────────────────────────────────────────────────────────────
create table if not exists game_sessions (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references profiles(id) on delete cascade,
  team1_name        text not null,
  team2_name        text not null,
  team1_color       text not null,
  team2_color       text not null,
  team1_emoji       text not null,
  team2_emoji       text not null,
  team1_score       int not null,
  team2_score       int not null,
  winning_team      int check (winning_team in (1, 2)),
  questions_answered int not null default 0,
  lifelines_used    int not null default 0,
  longest_streak    int not null default 0,
  category_slugs    text[] not null default '{}',
  difficulty        text check (difficulty in ('easy', 'mixed', 'hard')),
  played_at         timestamptz not null default now()
);

create index if not exists game_sessions_owner_played_idx
  on game_sessions (owner_id, played_at desc);

-- ════════════════════════════════════════════════════════════════════
--   ROW-LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════

alter table profiles        enable row level security;
alter table categories      enable row level security;
alter table questions       enable row level security;
alter table seen_questions  enable row level security;
alter table game_sessions   enable row level security;

-- profiles: public read of safe columns; users update only their own row
-- (We project safe columns via a separate view; the table itself stays
--  readable by authenticated users so the app can fetch own profile.)
drop policy if exists "Profiles readable to authenticated" on profiles;
create policy "Profiles readable to authenticated"
  on profiles for select
  to authenticated
  using (true);

drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- categories + questions: public read (anon and authenticated)
drop policy if exists "Categories public read" on categories;
create policy "Categories public read"
  on categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Questions public read" on questions;
create policy "Questions public read"
  on questions for select
  to anon, authenticated
  using (true);

-- Writes to categories/questions only via service_role (no RLS policy needed —
-- service_role bypasses RLS by default; absence of INSERT/UPDATE/DELETE policy
-- for anon/authenticated means they cannot mutate)

-- seen_questions: user-only read/write of own rows
drop policy if exists "Users manage own seen list" on seen_questions;
create policy "Users manage own seen list"
  on seen_questions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- game_sessions: user-only read/write of own rows
drop policy if exists "Users manage own sessions" on game_sessions;
create policy "Users manage own sessions"
  on game_sessions for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ════════════════════════════════════════════════════════════════════
--   GRANTS
-- ════════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated;
grant select on categories, questions to anon, authenticated;
grant select, insert, update, delete on profiles, seen_questions, game_sessions to authenticated;
