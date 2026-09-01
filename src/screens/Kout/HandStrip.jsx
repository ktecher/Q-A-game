import { cardFace } from '../../lib/koutCards';
import { legalPlays, isJoker, RANKS_BO6 } from '../../../supabase/functions/_shared/koutRules.js';

/* Same suit-then-rank shape every trick, so a player's eye doesn't have to
   re-scan the whole hand between plays. Jokers have no suit (koutRules.js),
   so they sort to the front — they're also the two most powerful cards. */
const SUIT_ORDER = ['S', 'H', 'D', 'C'];

function sortHand(hand) {
  return [...hand].sort((a, b) => {
    if (isJoker(a) || isJoker(b)) {
      if (isJoker(a) && isJoker(b)) return a === 'JR' ? -1 : 1;
      return isJoker(a) ? -1 : 1;
    }
    const bySuit = SUIT_ORDER.indexOf(a[1]) - SUIT_ORDER.indexOf(b[1]);
    return bySuit !== 0 ? bySuit : RANKS_BO6.indexOf(a[0]) - RANKS_BO6.indexOf(b[0]);
  });
}

/* Greying an illegal card here is a courtesy — the `kout` Edge Function runs
   this exact legalPlays() again and is the actual authority. If the two ever
   disagreed, tapping still just gets refused server-side and surfaces as an
   inline message (see SeatScreen's `guarded`); it can never desync the game. */
export default function HandStrip({ hand, trick, myTurn, onPlay }) {
  const sorted = sortHand(hand ?? []);
  const legal = new Set(legalPlays(hand ?? [], { trick }));

  return (
    <div className="flex flex-wrap justify-center" style={{ gap: 8, padding: '4px 8px' }}>
      {sorted.map((card) => {
        const face = cardFace(card);
        const playable = myTurn && legal.has(card);
        return (
          <button
            key={card}
            type="button"
            disabled={!playable}
            onClick={() => onPlay(card)}
            aria-label={`${face.rank}${face.suit ? ` ${face.suit}` : ''}`}
            className="flex flex-col items-center justify-center transition-transform duration-100 enabled:hover:-translate-y-2 enabled:active:translate-y-1"
            style={{
              width: 54,
              height: 78,
              background: playable ? 'var(--panel)' : 'var(--cleared-bg)',
              border: `4px solid ${playable ? 'var(--outline)' : 'var(--line)'}`,
              boxShadow: playable ? '0 6px 0 var(--shadow)' : 'none',
              opacity: playable ? 1 : 0.5,
              color: face.red ? 'var(--red)' : 'var(--text)',
            }}
          >
            <span className="font-en-body leading-none" style={{ fontSize: 16 }}>{face.rank}</span>
            <span className="leading-none" style={{ fontSize: 24, marginTop: 4 }}>{face.glyph}</span>
          </button>
        );
      })}
    </div>
  );
}
