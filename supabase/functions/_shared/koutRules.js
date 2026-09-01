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
