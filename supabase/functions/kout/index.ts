// The single authority on Kout state. Holds the service-role key; every
// mutation the players and host make arrives here as an action.
// All game logic lives in ../_shared/koutRules.js — nothing rule-shaped
// belongs in this file.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  dealHands, legalPlays, leadSuitFor, trickWinner, nextSeat, teamOf,
  resolveBidding, scoreRound, checkGameOver, MIN_BID, MAX_BID, PASS, HAND_SIZE,
} from '../_shared/koutRules.js';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });

const fail = (error: string, status = 400) => json({ ok: false, error }, status);

// Crypto-backed rng — a shuffle must not be predictable from the game id.
const secureRng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

const newJoinCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

async function callerId(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const uid = await callerId(req);
  if (!uid) return fail('not signed in', 401);

  const { action, ...args } = await req.json();

  switch (action) {
    case 'create': return create(uid, args);
    case 'claimSeat': return claimSeat(uid, args);
    default: return fail(`unknown action: ${action}`);
  }
});

async function create(uid: string, { seatCount, teamNames }: any) {
  if (seatCount !== 4 && seatCount !== 6) return fail('seatCount must be 4 or 6');

  const joinCode = newJoinCode();
  const { data: game, error } = await admin
    .from('kout_games')
    .insert({
      join_code: joinCode,
      host_id: uid,
      seat_count: seatCount,
      team_names: teamNames ?? ['فريق ١', 'فريق ٢'],
    })
    .select()
    .single();
  if (error) return fail(error.message, 500);

  const seats = Array.from({ length: seatCount }, (_, seat) => ({
    game_id: game.id, seat,
  }));
  const { error: seatErr } = await admin.from('kout_seats').insert(seats);
  if (seatErr) return fail(seatErr.message, 500);

  return json({ ok: true, gameId: game.id, joinCode });
}

async function claimSeat(uid: string, { joinCode, seat, name }: any) {
  const { data: game } = await admin
    .from('kout_games').select('*').eq('join_code', joinCode).single();
  if (!game) return fail('no such game', 404);
  if (game.status !== 'lobby') return fail('game already started');
  if (seat < 0 || seat >= game.seat_count) return fail('no such seat');

  // Re-joining your own seat after a dead phone is allowed and is the whole
  // point of storing seats server-side. Taking someone else's is not.
  const { data: existing } = await admin
    .from('kout_seats').select('user_id')
    .eq('game_id', game.id).eq('seat', seat).single();
  if (existing?.user_id && existing.user_id !== uid) return fail('seat taken');

  const { error } = await admin
    .from('kout_seats')
    .update({ user_id: uid, name: (name ?? '').slice(0, 20), connected: true })
    .eq('game_id', game.id).eq('seat', seat);
  if (error) return fail(error.message, 500);

  return json({ ok: true, gameId: game.id, seat });
}
