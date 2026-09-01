/* Presentation only. Kept out of supabase/functions/_shared/koutRules.js so
   the rules module stays free of anything browser-shaped. */
export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_AR = { S: 'بستوني', H: 'كوبة', D: 'ديناري', C: 'سباتي' };

export const suitLabelAr = (suit) => SUIT_AR[suit] ?? '';

export function cardFace(card) {
  if (card === 'JR') return { rank: '★', suit: null, glyph: '★', red: true, joker: true };
  if (card === 'JB') return { rank: '★', suit: null, glyph: '★', red: false, joker: true };
  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1];
  return { rank, suit, glyph: SUIT_GLYPH[suit], red: suit === 'H' || suit === 'D', joker: false };
}
