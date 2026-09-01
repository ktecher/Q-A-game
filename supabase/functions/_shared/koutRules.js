/* Kout (كوت) rules — pure functions, no I/O.
   Imported by BOTH the Deno Edge Function and vitest, which is why it lives
   under supabase/functions/_shared/ and uses nothing but standard ESM. */

export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS_BO6 = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RANKS_BO4 = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RED_JOKER = 'JR';
export const BLACK_JOKER = 'JB';
export const HAND_SIZE = 9;

export function isJoker(card) {
  return card === RED_JOKER || card === BLACK_JOKER;
}

export function suitOf(card) {
  return isJoker(card) ? null : card[1];
}

export function rankOf(card) {
  return isJoker(card) ? null : card[0];
}

/* Bo-4 removes 2-5 outright AND the two RED sixes. Both matter: dropping only
   2-5 leaves 38 cards, which does not divide by 4. The red-six removal is what
   makes the deal come out exactly. */
export function buildDeck(seatCount) {
  if (seatCount !== 4 && seatCount !== 6) {
    throw new Error(`buildDeck: seatCount must be 4 or 6, got ${seatCount}`);
  }
  const ranks = seatCount === 6 ? RANKS_BO6 : RANKS_BO4;
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      if (seatCount === 4 && rank === '6' && (suit === 'H' || suit === 'D')) continue;
      deck.push(rank + suit);
    }
  }
  deck.push(RED_JOKER, BLACK_JOKER);
  return deck;
}

/* mulberry32 — small, fast, seedable. Tests pass a seed; production passes a
   crypto-backed rng so a shuffle is not predictable from the game id. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    // Clamp: a hostile or buggy rng returning >= 1 must not index out of range.
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* The single point where deck integrity is enforced. Nothing writes a hand to
   the database without passing through here, so "no repeated card" is a
   property of one tested function rather than of every query. */
export function dealHands(seatCount, rng) {
  const deck = shuffle(buildDeck(seatCount), rng);
  const hands = [];
  for (let seat = 0; seat < seatCount; seat++) {
    hands.push(deck.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE));
  }
  const flat = hands.flat();
  if (flat.length !== seatCount * HAND_SIZE || new Set(flat).size !== flat.length) {
    throw new Error('dealHands: corrupt deal — duplicate or missing cards');
  }
  return hands;
}

/* Power bands, so comparisons never need branching at the call site:
     4000  red joker
     3000  ace of hukm
     2000  black joker
     1000+ other hukm, by rank
      100+ lead suit, by rank
         0 cannot win
   A joker is always in the top band regardless of what was led — jokers have
   no suit and are never "off-suit". */
export function cardPower(card, { hukm, leadSuit, seatCount }) {
  if (card === RED_JOKER) return 4000;
  if (card === BLACK_JOKER) return 2000;
  const ranks = seatCount === 6 ? RANKS_BO6 : RANKS_BO4;
  const r = ranks.indexOf(rankOf(card));
  const s = suitOf(card);
  if (s === hukm) return rankOf(card) === 'A' ? 3000 : 1000 + r;
  if (s === leadSuit) return 100 + r;
  return 0;
}

export function trickWinner(trick, ctx) {
  let best = null;
  let bestPower = -1;
  for (const { seat, card } of trick) {
    const p = cardPower(card, ctx);
    if (p > bestPower) {
      bestPower = p;
      best = seat;
    }
  }
  return best;
}

/* A joker has no suit and can never be hukm. Two consequences, both house rule
   (design round 7), and both deliberately simpler than Jawaker's published
   variant — which gates a joker lead behind the hukm honours or a bid of 8/9:

     1. Leading is completely unrestricted. Any card, any time.
     2. A joker-led trick sets NO lead suit, so nobody has anything to follow
        and every player may play whatever they like into it. Only a
        higher-power card can take it — see cardPower. */

export function leadSuitFor(trick) {
  if (!trick || trick.length === 0) return null;
  const first = trick[0].card;
  return isJoker(first) ? null : suitOf(first);
}

export function legalPlays(hand, { trick }) {
  const lead = leadSuitFor(trick);
  if (lead === null) return [...hand];        // leading, or a joker was led
  const following = hand.filter((c) => suitOf(c) === lead);
  return following.length > 0 ? following : [...hand];
}
