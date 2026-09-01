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

// Wildcard origin is deliberate: players join by scanning a QR code from
// whatever phone is in the room, on whatever network — there is no fixed
// set of origins to allowlist. `apikey` and `x-client-info` are added
// because supabase-js sends them on every functions.invoke() call; a
// preflight asking for a header we don't allow fails the same as a missing
// Authorization header does.
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });

const fail = (error: string, status = 400) => json({ ok: false, error }, status);

// A Postgres/PostgREST error carries column and constraint names — log it
// server-side, never forward it to the caller.
const dbFail = (context: string, error: { message: string }) => {
  console.error(`kout: ${context}:`, error.message);
  return fail('internal error', 500);
};

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
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors });

  const uid = await callerId(req);
  if (!uid) return fail('not signed in', 401);

  // Everything past this point is untrusted client input — never let it
  // escape as an uncaught exception instead of the documented { ok: false } shape.
  try {
    const { action, ...args } = await req.json();

    switch (action) {
      case 'create': return await create(uid, args);
      case 'claimSeat': return await claimSeat(uid, args);
      case 'peekGame': return await peekGame(uid, args);
      case 'setReady': return await setReady(uid, args);
      case 'startRound': return await startRound(uid, args);
      case 'bid': return await bid(uid, args);
      case 'setHukm': return await setHukm(uid, args);
      case 'play': return await play(uid, args);
      default: return fail(`unknown action: ${action}`);
    }
  } catch (e) {
    if (e instanceof SyntaxError) return fail('bad request');
    console.error('kout: unhandled', e);
    return fail('internal error', 500);
  }
});

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

async function create(uid: string, { seatCount, teamNames, teamColors }: any) {
  if (seatCount !== 4 && seatCount !== 6) return fail('seatCount must be 4 or 6');
  if (teamNames !== undefined && !Array.isArray(teamNames)) return fail('teamNames must be an array');
  if (teamColors !== undefined && (
    !Array.isArray(teamColors) || teamColors.length !== 2 ||
    !teamColors.every((c: unknown) => typeof c === 'string' && HEX_COLOR.test(c))
  )) return fail('teamColors must be two #RRGGBB colors');

  const joinCode = newJoinCode();
  const { data: game, error } = await admin
    .from('kout_games')
    .insert({
      join_code: joinCode,
      host_id: uid,
      seat_count: seatCount,
      team_names: teamNames ?? ['فريق ١', 'فريق ٢'],
      team_colors: teamColors ?? ['#3A7BC8', '#9B2D3A'],
    })
    .select()
    .single();
  if (error) return dbFail('create game', error);

  const seats = Array.from({ length: seatCount }, (_, seat) => ({
    game_id: game.id, seat,
  }));
  const { error: seatErr } = await admin.from('kout_seats').insert(seats);
  if (seatErr) return dbFail('create seats', seatErr);

  return json({ ok: true, gameId: game.id, joinCode });
}

async function claimSeat(uid: string, { joinCode, seat, name }: any) {
  if (!Number.isInteger(seat)) return fail('seat must be an integer');
  if (name !== undefined && typeof name !== 'string') return fail('name must be a string');

  const { data: game } = await admin
    .from('kout_games').select('*').eq('join_code', joinCode).single();
  if (!game) return fail('no such game', 404);
  if (seat < 0 || seat >= game.seat_count) return fail('no such seat');

  const { data: existing } = await admin
    .from('kout_seats').select('user_id')
    .eq('game_id', game.id).eq('seat', seat).single();

  // A dead phone must be able to reclaim its own seat in ANY status — that is
  // the whole point of storing seats server-side. An EMPTY seat is only up
  // for grabs before the game starts; someone else's seat is never up for
  // grabs at all.
  if (existing?.user_id && existing.user_id !== uid) return fail('seat taken');
  if (!existing?.user_id && game.status !== 'lobby') return fail('game already started');

  // A double-seated player could read two hands, one of them an opponent's —
  // the exact thing kout_hands' RLS exists to prevent. The unique index on
  // (game_id, user_id) in 0010_kout.sql is the real guarantee; this check
  // only turns that constraint violation into a message a player can act on.
  // Must not fire on the reclaim path above, so it only runs for a fresh claim.
  if (!existing?.user_id) {
    const { data: heldElsewhere } = await admin
      .from('kout_seats').select('seat')
      .eq('game_id', game.id).eq('user_id', uid).maybeSingle();
    if (heldElsewhere) return fail('you already hold a seat in this game');
  }

  const update: Record<string, unknown> = { connected: true };
  if (!existing?.user_id) update.user_id = uid;
  if (name !== undefined) update.name = name.slice(0, 20);

  let query = admin
    .from('kout_seats')
    .update(update)
    .eq('game_id', game.id).eq('seat', seat);

  // A fresh claim races two different phones tapping the same open seat
  // inside one round trip: both read `existing.user_id` as null above, and
  // without this, last-write-wins would seat both — the loser only finds out
  // on their first move, with no way back to the seat picker. Gating on the
  // seat still being empty AT WRITE TIME means only the first write matches;
  // the second affects zero rows and is told the truth. The reclaim path
  // (existing.user_id === uid) stays ungated — it must keep working in any
  // status, which is what lets a dead phone rejoin.
  if (!existing?.user_id) query = query.is('user_id', null);

  const { data: claimed, error } = await query.select('seat');
  if (error) return dbFail('claim seat', error);
  if (!existing?.user_id && (!claimed || claimed.length === 0)) return fail('seat taken');

  return json({ ok: true, gameId: game.id, seat });
}

// RLS hides a game from anyone not already seated in it (see 0010_kout.sql),
// so a player who has only scanned the QR can't read kout_games/kout_seats
// yet — they need the table to pick a seat. This is the one deliberate
// pre-join peephole: a join code is on a QR in the room, so anyone holding
// it is in the room, but that's the only reason names are safe to return
// here. No hands, no scores, no bids, no host_id — ever.
async function peekGame(_uid: string, { joinCode }: any) {
  const { data: game } = await admin
    .from('kout_games').select('id, seat_count, status').eq('join_code', joinCode).single();
  if (!game) return fail('no such game', 404);

  const { data: seats } = await admin
    .from('kout_seats').select('seat, user_id, name, ready').eq('game_id', game.id).order('seat');

  return json({
    ok: true,
    gameId: game.id,
    seatCount: game.seat_count,
    status: game.status,
    seats: (seats ?? []).map((s) => ({ seat: s.seat, taken: Boolean(s.user_id), name: s.name, ready: s.ready })),
  });
}

// Not turn-gated — any seated player may flip this at any point during the
// lobby, in any order, including back off a mis-tap. It only ever matters
// for the FIRST deal (see startRound): once the game is past lobby, nobody
// reads it again, so there's nothing to reset between rounds.
async function setReady(uid: string, { gameId, ready }: any) {
  if (typeof ready !== 'boolean') return fail('ready must be a boolean');

  const { data: game } = await admin.from('kout_games').select('status').eq('id', gameId).single();
  if (!game) return fail('no such game', 404);
  if (game.status !== 'lobby') return fail('ready only matters before the game starts');

  const { data: seat } = await admin
    .from('kout_seats').select('seat')
    .eq('game_id', gameId).eq('user_id', uid).maybeSingle();
  if (!seat) return fail('you hold no seat here', 403);

  const { error } = await admin.from('kout_seats')
    .update({ ready }).eq('game_id', gameId).eq('seat', seat.seat);
  if (error) return dbFail('set ready', error);

  return json({ ok: true });
}

async function startRound(uid: string, { gameId }: any) {
  const { data: game } = await admin.from('kout_games').select('*').eq('id', gameId).single();
  if (!game) return fail('no such game', 404);
  if (game.host_id !== uid) return fail('only the host starts a round', 403);
  // A re-deal mid-round would silently overwrite hands and reset the trick,
  // bid and turn order for a round already in progress — only a brand-new
  // game or the gap between rounds may trigger one.
  if (game.status !== 'lobby' && game.status !== 'round_end') {
    return fail('a round is already in progress');
  }

  const { data: seats } = await admin
    .from('kout_seats').select('*').eq('game_id', gameId).order('seat');
  if (!seats || seats.some((s) => !s.user_id)) return fail('every seat must be claimed');
  // Ready only gates the FIRST deal — between rounds everyone is already
  // sitting there playing, so re-confirming would be friction with no
  // purpose. game.status here is still 'lobby' or 'round_end' (checked
  // above); only 'lobby' means nobody has been dealt in yet.
  if (game.status === 'lobby' && seats.some((s) => !s.ready)) {
    return fail('every player must be ready');
  }

  // dealHands throws rather than emit a corrupt deal — see koutRules.js.
  const hands = dealHands(game.seat_count, secureRng);

  const { error: handErr } = await admin.from('kout_hands').upsert(
    hands.map((cards, seat) => ({
      game_id: gameId, seat, user_id: seats[seat].user_id, cards,
    })),
    { onConflict: 'game_id,seat' },
  );
  if (handErr) return dbFail('deal hands', handErr);

  const dealer = game.round_no === 0 ? game.dealer_seat
                                     : nextSeat(game.dealer_seat, game.seat_count);

  const { error: resetErr } = await admin.from('kout_seats')
    .update({ bid: null, card_count: HAND_SIZE }).eq('game_id', gameId);
  // Silently losing this reset is the dangerous one: a stale `bid` would
  // survive into the new round, and resolveBidding() below would read last
  // round's bid as this round's — awarding the contract to the wrong player
  // at the wrong number while the caller still hears {ok: true}.
  if (resetErr) return dbFail('reset seats for round', resetErr);

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
  if (error) return dbFail('start round', error);

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

// The game row is the lock — not for atomicity between this and whatever
// write follows, but so the LOSER of a race is rejected before it ever
// reaches the seat/hand rows a caller touches next. bid() and play() share
// this: both are read-then-write off atTurn(), so two taps from the same
// seat both pass atTurn() with the same turn_seat and would otherwise both
// write. Gating on turn_seat still matching `atSeat` means only the first
// write matches — and that write is itself what moves turn_seat away, so
// the second matches zero rows and is told 'not your turn' before it can
// touch anything else.
async function claimTurn(gameId: string, atSeat: number, patch: Record<string, unknown>) {
  const { data } = await admin
    .from('kout_games')
    .update(patch)
    .eq('id', gameId)
    .eq('turn_seat', atSeat)
    .select('id');
  return Boolean(data && data.length > 0);
}

async function bid(uid: string, { gameId, bid: value }: any) {
  const { game, seat, err } = await atTurn(uid, gameId, ['bidding']);
  if (err) return err;

  const isPass = value === PASS;
  if (!isPass && (!Number.isInteger(value) || value < MIN_BID || value > MAX_BID)) {
    return fail('bid must be 5-9 or pass');
  }

  const { error: bidErr } = await admin.from('kout_seats')
    .update({ bid: value }).eq('game_id', gameId).eq('seat', seat.seat);
  // A dropped write here means this player's bid is simply absent when
  // resolveBidding() runs below — must not fall through as if it landed.
  if (bidErr) return dbFail('record bid', bidErr);

  const dealer = game.dealer_seat;
  const lastSeat = dealer; // bidding opened to the dealer's right, so it closes ON the dealer
  if (seat.seat !== lastSeat) {
    const claimed = await claimTurn(gameId, seat.seat, {
      turn_seat: nextSeat(seat.seat, game.seat_count),
    });
    if (!claimed) return fail('not your turn');
    return json({ ok: true });
  }

  // Everyone has bid. Resolve.
  const { data: seats } = await admin
    .from('kout_seats').select('seat,bid').eq('game_id', gameId).order('seat');
  const bids = seats!.map((s) => s.bid);
  const result = resolveBidding(bids, { seatCount: game.seat_count, lastSeat });

  // This is the branch that matters most: without the claim, two concurrent
  // resolves could both run resolveBidding() and both write a winner —
  // awarding the contract twice.
  const claimed = await claimTurn(gameId, seat.seat, {
    status: 'hukm',
    bid: result.bid,
    bidder_seat: result.winnerSeat,
    mulzum: result.mulzum,
    turn_seat: result.winnerSeat,
  });
  if (!claimed) return fail('not your turn');

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

  // Two taps from the same player inside one round trip both pass atTurn()
  // above and both read this same hand, so both compute this same `cards`
  // (card removed) from an identical stale read. claimTurn() (above) rejects
  // the loser before it reaches applyHand() below — do not reorder applyHand
  // ahead of the claim. Applies to every branch below that advances the game.

  // Once claimTurn() has succeeded, the game row has already moved past this
  // turn — these are the ONLY writes left that remove the card from the
  // hand and shrink card_count. Silently losing one now would leave a card
  // that's already in the trick still sitting in the hand: the exact
  // corruption the claim above exists to prevent, arriving through this
  // door instead. So, unlike a fire-and-forget write, a failure here must
  // reach the caller as an error, not {ok: true} — even though the game
  // state has already moved and there is no rollback from here. That
  // residual (game advanced, hand write lost) needs a single Postgres
  // transaction to close fully; deliberately out of scope for this fix. For
  // now it leaves the round needing the host to notice and intervene.
  async function applyHand() {
    const { error: handErr } = await admin.from('kout_hands')
      .update({ cards }).eq('game_id', gameId).eq('seat', seat.seat);
    if (handErr) return dbFail('update hand after play', handErr);
    const { error: countErr } = await admin.from('kout_seats')
      .update({ card_count: cards.length }).eq('game_id', gameId).eq('seat', seat.seat);
    if (countErr) return dbFail('update card count after play', countErr);
    return null;
  }

  // Trick still in progress.
  if (trick.length < game.seat_count) {
    const claimed = await claimTurn(gameId, seat.seat, {
      trick, played_cards: playedCards,
      turn_seat: nextSeat(seat.seat, game.seat_count),
      updated_at: new Date().toISOString(),
    });
    if (!claimed) return fail('not your turn');
    const handErr = await applyHand();
    if (handErr) return handErr;
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
    const claimed = await claimTurn(gameId, seat.seat, {
      trick: [], played_cards: playedCards, tricks_won: tricksWon,
      turn_seat: winner, updated_at: new Date().toISOString(),
    });
    if (!claimed) return fail('not your turn');
    const handErr = await applyHand();
    if (handErr) return handErr;
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

  const claimed = await claimTurn(gameId, seat.seat, {
    status: winnerTeam === null ? 'round_end' : 'finished',
    trick: [], played_cards: playedCards, tricks_won: tricksWon,
    score, winner_team: winnerTeam, turn_seat: null,
    updated_at: new Date().toISOString(),
  });
  if (!claimed) return fail('not your turn');
  const handErr = await applyHand();
  if (handErr) return handErr;

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
