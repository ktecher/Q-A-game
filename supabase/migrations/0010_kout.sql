-- ════════════════════════════════════════════════════════════════════
--   Kout (كوت) — server-authoritative card game
--   Migration: 0010_kout
-- ════════════════════════════════════════════════════════════════════
--
-- The whole design turns on one idea: the deck is owned by the server, so
-- a client can neither invent a card nor read someone else's hand.
--
--   kout_games  — one row per game. Public to everyone seated in it.
--   kout_seats  — one row per seat. Public columns only: who, which team,
--                 what they bid, how many cards they hold. NO card faces.
--   kout_hands  — the secret. One row per seat, RLS'd to that seat's own
--                 auth uid. This single policy is what stops a player from
--                 reading another hand, AND what stops Realtime delivering
--                 another player's row to them.
--   kout_results— the tombstone kept after a game ends. Hands are dropped.
--
-- Clients NEVER write these tables. Every mutation goes through the `kout`
-- Edge Function, which holds the service-role key and is the only place
-- that knows what a legal play is. Hence: no insert/update/delete policies
-- for `authenticated` anywhere below. Read-only is the whole client story.
-- ════════════════════════════════════════════════════════════════════

-- ── kout_games ─────────────────────────────────────────────────────
create table if not exists public.kout_games (
  id            uuid primary key default gen_random_uuid(),
  join_code     text not null unique,
  host_id       uuid not null,
  seat_count    int  not null check (seat_count in (4, 6)),
  status        text not null default 'lobby'
                  check (status in ('lobby','bidding','hukm','playing','round_end','finished')),
  round_no      int  not null default 0,
  dealer_seat   int  not null default 0,
  turn_seat     int,
  bidder_seat   int,
  bid           int,
  mulzum        boolean not null default false,
  hukm          text check (hukm in ('S','H','D','C')),
  trick         jsonb not null default '[]'::jsonb,   -- [{seat, card}]
  played_cards  jsonb not null default '[]'::jsonb,   -- this round, all tricks
  tricks_won    int[] not null default '{0,0}',
  score         int[] not null default '{0,0}',
  team_names    text[] not null default '{"فريق ١","فريق ٢"}',
  team_colors   text[] not null default '{"#3A7BC8","#9B2D3A"}',
  winner_team   int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists kout_games_join_code_idx on public.kout_games (join_code);

-- ── kout_seats ─────────────────────────────────────────────────────
-- Everything here is safe for the mirrored TV to render.
create table if not exists public.kout_seats (
  game_id     uuid not null references public.kout_games(id) on delete cascade,
  seat        int  not null,
  user_id     uuid,
  name        text not null default '',
  bid         int,                       -- null = not yet bid, -1 = طاف
  card_count  int  not null default 0,
  connected   boolean not null default false,
  primary key (game_id, seat)
);

create index if not exists kout_seats_user_idx on public.kout_seats (user_id);

-- One phone, one seat. Without this a player can claim two seats in the same
-- game and thereby hold an opponent's hand — defeating kout_hands' RLS at the
-- seating layer rather than the query layer. Partial, because unclaimed seats
-- all carry a null user_id and nulls must not collide.
create unique index if not exists kout_seats_one_seat_per_user
  on public.kout_seats (game_id, user_id)
  where user_id is not null;

-- ── kout_hands ─────────────────────────────────────────────────────
-- The secret table. user_id is denormalised onto the row on purpose so the
-- policy is an index-backed equality check with no join.
create table if not exists public.kout_hands (
  game_id  uuid not null references public.kout_games(id) on delete cascade,
  seat     int  not null,
  user_id  uuid not null,
  cards    jsonb not null default '[]'::jsonb,
  primary key (game_id, seat)
);

create index if not exists kout_hands_user_idx on public.kout_hands (user_id);

-- ── kout_results ───────────────────────────────────────────────────
create table if not exists public.kout_results (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null,
  played_at   timestamptz not null default now(),
  seat_count  int not null,
  rounds      int not null,
  score       int[] not null,
  winner_team int not null,
  players     jsonb not null default '[]'::jsonb   -- [{seat, name, team}]
);

create index if not exists kout_results_host_played_idx
  on public.kout_results (host_id, played_at desc);

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.kout_games   enable row level security;
alter table public.kout_seats   enable row level security;
alter table public.kout_hands   enable row level security;
alter table public.kout_results enable row level security;

-- Membership check used by both kout_games and kout_seats policies below.
-- It CANNOT be inlined as a subquery in either policy: "Members read game"
-- would query kout_seats and "Members read seats" would query kout_games,
-- and each of those tables' own policy queries the other right back —
-- Postgres detects the cycle and raises "infinite recursion detected in
-- policy for relation kout_seats" at query time. security definer runs
-- this check with RLS bypassed, breaking the cycle. Do not "simplify" this
-- back into a direct subquery in the policies.
create or replace function public.is_kout_member(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.kout_seats s
    where s.game_id = p_game_id and s.user_id = auth.uid()
  ) or exists (
    select 1 from public.kout_games g
    where g.id = p_game_id and g.host_id = auth.uid()
  );
$$;

revoke all on function public.is_kout_member(uuid) from public;
grant execute on function public.is_kout_member(uuid) to authenticated;

-- A game is readable by its host and by anyone holding a seat in it.
drop policy if exists "Members read game" on public.kout_games;
create policy "Members read game" on public.kout_games
  for select to authenticated
  using (public.is_kout_member(id));

-- Seats are public to members — names, bids and card counts, nothing secret.
drop policy if exists "Members read seats" on public.kout_seats;
create policy "Members read seats" on public.kout_seats
  for select to authenticated
  using (public.is_kout_member(game_id));

-- ★ The policy the whole design rests on. One line, one job: your hand is
--   yours. It gates both the SELECT and what Realtime is allowed to deliver.
--   The host is deliberately NOT granted access — the host screen is mirrored
--   to a television.
drop policy if exists "Own hand only" on public.kout_hands;
create policy "Own hand only" on public.kout_hands
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Host reads own results" on public.kout_results;
create policy "Host reads own results" on public.kout_results
  for select to authenticated
  using (host_id = (select auth.uid()));

-- ── Grants ─────────────────────────────────────────────────────────
-- Read only. Every write is the Edge Function's service-role client.
-- Revoke anon first (Supabase's default table grant gives anon select) to
-- match the posture on every other user-data table (0006/0007 precedent).
revoke all on public.kout_games, public.kout_seats,
               public.kout_hands, public.kout_results from anon;
grant select on public.kout_games, public.kout_seats,
                public.kout_hands, public.kout_results to authenticated;

-- ── Realtime ───────────────────────────────────────────────────────
-- Guarded from the start (not just on re-run failure): these migrations
-- may be re-applied, and `alter publication ... add table` errors if the
-- table is already a member.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kout_games'
  ) then
    alter publication supabase_realtime add table public.kout_games;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kout_seats'
  ) then
    alter publication supabase_realtime add table public.kout_seats;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kout_hands'
  ) then
    alter publication supabase_realtime add table public.kout_hands;
  end if;
end $$;
