import { useEffect, useRef, useState } from 'react';
import { cardFace } from '../../lib/koutCards';
import { latchedCard } from '../../lib/koutLatch';
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
/* How long to keep hiding a played card if the server never tells us what
   happened. A dropped realtime event would otherwise hide it FOREVER — and
   because it is filtered out of the render there would be nothing left to
   tap, so the card is gone for the rest of the round. Reappearing after a
   pause is a far better failure than a card that ceases to exist. Generous,
   because it is a backstop and not a deadline: a play resolves in about a
   second. */
const PLAY_LATCH_TIMEOUT_MS = 5000;


export default function HandStrip({ hand, trick, myTurn, onPlay, readOnly = false }) {
  /* The card this player has tapped but whose disappearance the server has
     not yet confirmed. Local to this component ON PURPOSE: `useKoutGame` is
     the authoritative mirror and TableScreen reads it too, so optimism there
     would leak a non-server truth onto the television.

     This replaces a `pending` boolean that keyed off the HTTP response, which
     was the bug rather than the mechanism: the response arrives ~280 ms
     before the new hand does, so the strip un-dimmed with the played card
     still sitting in it and the turn still showing — and a second tap earned
     a red 'not your turn' the player had done nothing to deserve. Keying on
     hand CONTENT instead makes both orderings converge: if the hand arrives
     first the latch is already satisfied, and if the response arrives first
     the latch simply keeps holding. */
  const [tapped, setTapped] = useState(null);
  const timerRef = useRef(null);

  /* Expires by DERIVATION, not by an effect — see latchedCard above. Once the
     server's hand stops listing the card there is nothing left to hide and
     this falls back to null on the next render: no state write, no extra
     pass, nothing to keep in sync. */
  const inFlight = latchedCard(tapped, hand);

  const sorted = sortHand((hand ?? []).filter((c) => c !== inFlight));
  const legal = new Set(readOnly ? [] : legalPlays(hand ?? [], { trick }));

  useEffect(() => () => clearTimeout(timerRef.current), []);

  /* The card leaves the hand on tap, before the server has answered.
     Safe here for a structural reason rather than an optimistic one: every
     rule the server enforces is one this client can already evaluate.
     `legalPlays` above is imported from the very file index.ts uses, and
     `turn_seat` and `trick` live in one game row written by one atomic
     update — so a phone that believes it is on turn holds a coherent
     snapshot. It can be behind the world; it cannot be self-contradictory.
     What is left to reject is a database failure mid-write or a lost
     response, and those revert.

     The whole hand goes inert while one card is in flight, not just the
     tapped one: without that a player can tap a SECOND card in the same
     window and earn the very error this exists to remove.

     `onPlay` is `guarded()` from SeatScreen, which never rethrows — it shows
     the Arabic error itself and now reports the outcome, so `await` always
     settles and this can never wedge. */
  async function handlePlay(card) {
    if (inFlight !== null) return;
    setTapped(card);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTapped(null), PLAY_LATCH_TIMEOUT_MS);

    const ok = await onPlay(card);
    // On refusal put it back at once, in the same frame as the banner
    // guarded() has already raised — a card reappearing WITH its reason is
    // legible; a card reappearing silently is not. On success nothing to do:
    // the derivation above releases it when the real hand catches up.
    if (ok === false) {
      clearTimeout(timerRef.current);
      setTapped(null);
    }
  }

  return (
    <div className="flex flex-wrap justify-center" style={{ gap: 8, padding: '4px 8px' }}>
      {inFlight !== null && (
        <p className="font-ar-body font-bold w-full text-center" style={{ fontSize: 12, color: 'var(--muted)' }}>
          جارٍ الإرسال...
        </p>
      )}
      {sorted.map((card) => {
        const face = cardFace(card);
        const playable = !readOnly && myTurn && legal.has(card) && inFlight === null;
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
