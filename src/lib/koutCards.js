/* Presentation only. Kept out of supabase/functions/_shared/koutRules.js so
   the rules module stays free of anything browser-shaped. */
export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_AR = { S: 'بستوني', H: 'كوبة', D: 'ديناري', C: 'سباتي' };

export const suitLabelAr = (suit) => SUIT_AR[suit] ?? '';

/* The two jokers used to differ by ONE channel — a red star against a black
   star. That is the weakest signal available here: the host screen is mirrored
   to a TV over AirPlay/HDMI, whose 4:2:0 chroma subsampling smears colour
   edges while leaving luminance and geometry intact, so on the one display
   that matters most the two highest cards in the deck looked alike. `jokerAr`
   gives every render site a second, non-colour channel to spell out, and the
   sites fill the card body rather than tinting a glyph so the difference is
   carried by luminance too. Red beats black (koutRules.js: 4000 vs 2000). */
export function cardFace(card) {
  if (card === 'JR') return { rank: '★', suit: null, glyph: '★', red: true, joker: true, jokerAr: 'جوكر أحمر' };
  if (card === 'JB') return { rank: '★', suit: null, glyph: '★', red: false, joker: true, jokerAr: 'جوكر أسود' };
  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1];
  return { rank, suit, glyph: SUIT_GLYPH[suit], red: suit === 'H' || suit === 'D', joker: false };
}
