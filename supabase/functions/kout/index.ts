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
    case 'startRound': return startRound(uid, args);
    case 'bid': return bid(uid, args);
    case 'setHukm': return setHukm(uid, args);
    case 'play': return play(uid, args);
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

async function startRound(uid: string, { gameId }: any) {
  const { data: game } = await admin.from('kout_games').select('*').eq('id', gameId).single();
  if (!game) return fail('no such game', 404);
  if (game.host_id !== uid) return fail('only the host starts a round', 403);

  const { data: seats } = await admin
    .from('kout_seats').select('*').eq('game_id', gameId).order('seat');
  if (!seats || seats.some((s) => !s.user_id)) return fail('every seat must be claimed');

  // dealHands throws rather than emit a corrupt deal — see koutRules.js.
  const hands = dealHands(game.seat_count, secureRng);

  const { error: handErr } = await admin.from('kout_hands').upsert(
    hands.map((cards, seat) => ({
      game_id: gameId, seat, user_id: seats[seat].user_id, cards,
    })),
    { onConflict: 'game_id,seat' },
  );
  if (handErr) return fail(handErr.message, 500);

  const dealer = game.round_no === 0 ? game.dealer_seat
                                     : nextSeat(game.dealer_seat, game.seat_count);

  await admin.from('kout_seats')
    .update({ bid: null, card_count: HAND_SIZE }).eq('game_id', gameId);

  const { error } = await admin.from('kout_games').update({
    status: 'bidding',
    round_no: game.round_no + 1,
    dealer_seat: dealer,
    // Bidding opens to the dealer's RIGHT and runs counterclockwise.
    turn_seat: nextSeat(dealer, game.seat_count),
    bid: null, bidder_seat: null, mulzum: false, hukm: null,
    trick: [], played_cards: [], tricks_won: [0, 0],
    updated_at: new Date().toISOString(),
  }).eq('id', gameId);
  if (error) return fail(error.message, 500);

  return json({ ok: true });
}

/* Shared preamble: load the game, find the caller's seat, refuse if it is not
   their turn. Every mutating action starts here — turn order is enforced on
   the server, never trusted from the client. */
async function atTurn(uid: string, gameId: string, wantStatus: string[]) {
  const { data: game } = await admin.from('kout_games').select('*').eq('id', gameId).single();
  if (!game) return { err: fail('no such game', 404) };
  if (!wantStatus.includes(game.status)) return { err: fail(`not in ${wantStatus}`) };
  const { data: seat } = await admin
    .from('kout_seats').select('*')
    .eq('game_id', gameId).eq('user_id', uid).maybeSingle();
  if (!seat) return { err: fail('you hold no seat here', 403) };
  if (game.turn_seat !== seat.seat) return { err: fail('not your turn') };
  return { game, seat };
}

async function bid(uid: string, { gameId, bid: value }: any) {
  const { game, seat, err } = await atTurn(uid, gameId, ['bidding']);
  if (err) return err;

  const isPass = value === PASS;
  if (!isPass && (value < MIN_BID || value > MAX_BID)) return fail('bid must be 5-9 or pass');

  await admin.from('kout_seats')
    .update({ bid: value }).eq('game_id', gameId).eq('seat', seat.seat);

  const dealer = game.dealer_seat;
  const lastSeat = dealer; // bidding opened to the dealer's right, so it closes ON the dealer
  if (seat.seat !== lastSeat) {
    await admin.from('kout_games')
      .update({ turn_seat: nextSeat(seat.seat, game.seat_count) }).eq('id', gameId);
    return json({ ok: true });
  }

  // Everyone has bid. Resolve.
  const { data: seats } = await admin
    .from('kout_seats').select('seat,bid').eq('game_id', gameId).order('seat');
  const bids = seats!.map((s) => s.bid);
  const result = resolveBidding(bids, { seatCount: game.seat_count, lastSeat });

  await admin.from('kout_games').update({
    status: 'hukm',
    bid: result.bid,
    bidder_seat: result.winnerSeat,
    mulzum: result.mulzum,
    turn_seat: result.winnerSeat,
  }).eq('id', gameId);

  return json({ ok: true, ...result });
}

async function setHukm(uid: string, { gameId, hukm }: any) {
  const { game, seat, err } = await atTurn(uid, gameId, ['hukm']);
  if (err) return err;
  if (!['S', 'H', 'D', 'C'].includes(hukm)) return fail('hukm must be S, H, D or C');
  if (game.bidder_seat !== seat.seat) return fail('only the high bidder names hukm');

  await admin.from('kout_games').update({
    status: 'playing', hukm, turn_seat: game.bidder_seat, // the bidder leads
  }).eq('id', gameId);
  return json({ ok: true });
}

async function play(uid: string, { gameId, card }: any) {
  const { game, seat, err } = await atTurn(uid, gameId, ['playing']);
  if (err) return err;

  const { data: hand } = await admin
    .from('kout_hands').select('cards').eq('game_id', gameId).eq('seat', seat.seat).single();
  if (!hand?.cards.includes(card)) return fail('that card is not in your hand');

  const legal = legalPlays(hand.cards, {
    trick: game.trick, seatCount: game.seat_count,
  });
  if (!legal.includes(card)) return fail('illegal play');

  const cards = hand.cards.filter((c: string) => c !== card);
  const trick = [...game.trick, { seat: seat.seat, card }];
  const playedCards = [...game.played_cards, card];

  await admin.from('kout_hands')
    .update({ cards }).eq('game_id', gameId).eq('seat', seat.seat);
  await admin.from('kout_seats')
    .update({ card_count: cards.length }).eq('game_id', gameId).eq('seat', seat.seat);

  // Trick still in progress.
  if (trick.length < game.seat_count) {
    await admin.from('kout_games').update({
      trick, played_cards: playedCards,
      turn_seat: nextSeat(seat.seat, game.seat_count),
      updated_at: new Date().toISOString(),
    }).eq('id', gameId);
    return json({ ok: true });
  }

  // Trick complete.
  const leadSuit = leadSuitFor(trick);
  const winner = trickWinner(trick, {
    hukm: game.hukm, leadSuit, seatCount: game.seat_count,
  });
  const tricksWon = [...game.tricks_won];
  tricksWon[teamOf(winner)] += 1;
  const tricksPlayed = tricksWon[0] + tricksWon[1];

  if (tricksPlayed < HAND_SIZE) {
    await admin.from('kout_games').update({
      trick: [], played_cards: playedCards, tricks_won: tricksWon,
      turn_seat: winner, updated_at: new Date().toISOString(),
    }).eq('id', gameId);
    return json({ ok: true, trickWinner: winner });
  }

  // Round complete.
  const delta = scoreRound({
    bid: game.bid, bidderSeat: game.bidder_seat, mulzum: game.mulzum, tricksWon,
  });
  const score = [game.score[0] + delta[0], game.score[1] + delta[1]];
  const winnerTeam = checkGameOver(score, {
    roundNo: game.round_no, bid: game.bid, tricksWon, bidderSeat: game.bidder_seat,
  });

  await admin.from('kout_games').update({
    status: winnerTeam === null ? 'round_end' : 'finished',
    trick: [], played_cards: playedCards, tricks_won: tricksWon,
    score, winner_team: winnerTeam, turn_seat: null,
    updated_at: new Date().toISOString(),
  }).eq('id', gameId);

  if (winnerTeam !== null) {
    const { data: seats } = await admin
      .from('kout_seats').select('seat,name').eq('game_id', gameId).order('seat');
    await admin.from('kout_results').insert({
      host_id: game.host_id, seat_count: game.seat_count, rounds: game.round_no,
      score, winner_team: winnerTeam,
      players: seats!.map((s) => ({ seat: s.seat, name: s.name, team: teamOf(s.seat) })),
    });
    // Hands are deliberately not kept.
    await admin.from('kout_hands').delete().eq('game_id', gameId);
  }

  return json({ ok: true, trickWinner: winner, roundScore: delta, score, winnerTeam });
}
