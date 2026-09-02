import { useState } from 'react';
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

/* Greying an illegal card is advisory only — the `kout` Edge Function runs
   this exact legalPlays() again and is the real authority. `trick` arrives
   over realtime, so a phone that just woke can render one step behind the
   server for a moment; if that makes `playable` wrong here, the tap must
   still go through rather than sit dead. The server's refusal (surfaced via
   SeatScreen's `guarded`) is the only thing allowed to actually block a play.

   `readOnly` is the bidding and hukm phases: the cards are dealt before the
   first bid, so a player must be looking at their hand to bid or name a trump
   at all — but nothing is playable yet. Greying them the way an illegal play
   is greyed would say the opposite, so read-only cards render at full strength
   and simply do not respond. */
export default function HandStrip({ hand, trick, myTurn, onPlay, readOnly = false }) {
  const [pending, setPending] = useState(false);
  const sorted = sortHand(hand ?? []);
  const legal = new Set(readOnly ? [] : legalPlays(hand ?? [], { trick }));

  // `onPlay` is a round trip to the server. The button is deliberately never
  // `disabled` (see file comment above), so without this a fast double-tap
  // fires two `play` actions before either resolves — exactly the race
  // index.ts's turn-claim CAS now has to reject. This is a courtesy, not the
  // fix: it only stops an accidental double-tap on ONE phone — two tabs, or
  // a retry after a timeout, still race, and the server CAS is what actually
  // protects the hand. `onPlay` is `guarded()` from SeatScreen, which never
  // rethrows (it catches and shows the Arabic error itself), so `await`
  // always settles and `finally` always releases `pending` — a rejected or
  // stuck request can't leave the hand permanently gated.
  async function handlePlay(card) {
    if (pending) return;
    setPending(true);
    try {
      await onPlay(card);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap justify-center" style={{ gap: 8, padding: '4px 8px' }}>
      {pending && (
        <p className="font-ar-body font-bold w-full text-center" style={{ fontSize: 12, color: 'var(--muted)' }}>
          جارٍ الإرسال...
        </p>
      )}
      {sorted.map((card) => {
        const face = cardFace(card);
        const playable = !readOnly && myTurn && legal.has(card) && !pending;
        // A joker fills its whole card instead of tinting a glyph: the fill is
        // a luminance difference, which survives the TV feed and a glance at a
        // 54px card alike, and it separates the two jokers from each other as
        // well as from every suit card (see cardFace).
        const jokerBg = face.joker ? (face.red ? 'var(--red)' : 'var(--outline)') : null;
        return (
          <button
            key={card}
            type="button"
            disabled={readOnly}
            onClick={() => handlePlay(card)}
            aria-label={face.joker ? face.jokerAr : `${face.rank}${face.suit ? ` ${face.suit}` : ''}`}
            className={`flex flex-col items-center justify-center transition-transform duration-100${
              readOnly ? '' : ' hover:-translate-y-2 active:translate-y-1'
            }`}
            style={{
              width: 54,
              height: 78,
              background: jokerBg ?? (playable || readOnly ? 'var(--panel)' : 'var(--cleared-bg)'),
              border: `4px solid ${face.joker ? 'var(--gold)' : playable || readOnly ? 'var(--outline)' : 'var(--line)'}`,
              boxShadow: playable ? '0 6px 0 var(--shadow)' : 'none',
              opacity: playable || readOnly ? 1 : 0.5,
              color: face.joker ? 'var(--gold)' : face.red ? 'var(--red)' : 'var(--text)',
            }}
          >
            {face.joker ? (
              <>
                <span className="leading-none" style={{ fontSize: 26 }}>★</span>
                <span className="font-ar-body font-bold leading-none" style={{ fontSize: 10, marginTop: 5 }}>
                  {face.jokerAr}
                </span>
              </>
            ) : (
              <>
                <span className="font-en-body leading-none" style={{ fontSize: 16 }}>{face.rank}</span>
                <span className="leading-none" style={{ fontSize: 24, marginTop: 4 }}>{face.glyph}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
