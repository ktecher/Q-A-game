import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardFace } from '../../lib/koutCards';
import { startRound } from '../../lib/koutClient';
import { scoreRound, teamOf } from '../../../supabase/functions/_shared/koutRules.js';
import { TEAM_COLOR_FALLBACK } from '../../lib/teams';
import { arabicKoutError } from '../../lib/koutErrors';
import { JoinQrPanel } from './JoinQr';

// One card size serves both seat counts: height is the binding constraint and
// the grid is 2 rows deep at 4 and at 6 alike, so widening the columns at 4
// seats buys gutter, not card. A card takes the cell's height up to this cap
// and derives its width from the 5:7 aspect — the cap is what it reaches on
// the 1055×487 target canvas (130×182), and taking the height from the cell
// rather than hardcoding it keeps the grid from overflowing at the theme's
// other landscape zoom step (index.css:255 has two) or on a desktop browser.
const CARD_H = 182;
const LABEL_H = 23;

const btnStyle = {
  padding: '10px 26px',
  background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
  border: '4px solid var(--outline)',
  boxShadow: '0 6px 0 var(--gold-sh)',
  color: 'var(--outline)',
};

// Height first, width from the aspect — see CARD_H.
const slotStyle = { flex: '1 1 auto', minHeight: 0, maxHeight: CARD_H, aspectRatio: '5 / 7' };

const seatName = (seats, seat) => seats.find((s) => s.seat === seat)?.name || `#${seat + 1}`;

// A card that has been PLAYED into the trick is public — every seat and the
// TV already see it face up. This is not a hand; rendering its face is fine.
function TrickCard({ card, teamColor, name, isLead }) {
  const face = cardFace(card);
  return (
    <div className="flex flex-col items-center justify-center" style={{ width: '100%', height: '100%', minWidth: 0 }}>
      <div
        className="relative flex flex-col items-center justify-center font-en-body font-bold leading-none"
        style={{
          ...slotStyle,
          // A card face is intentionally theme-invariant, same as
          // QuestionScreen's QR panel and SketchStage.jsx:18 — cream paper,
          // dark ink, fixed red. It must NOT become var(--red): that token is
          // #9B2D3A in light mode, so the card would restyle with the app
          // chrome instead of staying a real playing card.
          background: '#F4ECD8',
          // The frame is the attribution channel that survives a truncated
          // name — the team read never has to depend on text.
          border: `4px solid ${teamColor}`,
          color: face.red ? '#C44150' : '#1D1F20',
          fontSize: 56,
        }}
        lang="en"
      >
        {isLead && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              insetInlineStart: 0,
              width: 0,
              height: 0,
              borderTop: '20px solid var(--gold)',
              borderInlineEnd: '20px solid transparent',
            }}
          />
        )}
        <span>{face.rank}</span>
        {!face.joker && <span style={{ fontSize: 52 }}>{face.glyph}</span>}
      </div>
      {/* Attribution rests entirely on this line and the frame above it now
          that position no longer says who played the card, so it never
          shrinks below 18px and never wraps — one long Arabic name ellipsises
          rather than reflowing the whole grid. */}
      <span
        className="font-ar-body font-bold leading-none truncate shrink-0"
        style={{ fontSize: 18, height: LABEL_H, paddingTop: 5, maxWidth: '100%', color: 'var(--text)' }}
      >
        {name}
      </span>
    </div>
  );
}

/* The centre field — the whole stage minus the two team rails. Its only
   face-up cards are `game.trick`'s, which every seat has already seen. */
// The server never lets a client observe a full trick — it clears `trick`
// to [] in the SAME write that completes it (index.ts), so the winning
// card would otherwise vanish the instant it's played. `last_trick` carries
// it across that write; this holds it on screen for a couple of seconds so
// the room actually sees it, then lets the empty grid (or the next card,
// whichever comes first) take over.
const TRICK_PAUSE_MS = 2000;

export default function TrickArea({ game, seats, gameId }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Keyed on content rather than a counter: every card in a round is played
  // once, so a completed trick's cards are a unique key for that round, and
  // last_trick only changes when a genuinely new trick lands.
  const lastTrickKey = game.last_trick?.length ? JSON.stringify(game.last_trick) : null;
  const [pausing, setPausing] = useState(false);
  const [shownKey, setShownKey] = useState(null);
  // Turning the pause ON happens here, during render (same pattern as
  // `everyoneWasReady` above) rather than in the effect below, so the effect
  // body itself never calls setState synchronously — it only schedules the
  // timeout that turns the pause back OFF.
  if (lastTrickKey && lastTrickKey !== shownKey) {
    setShownKey(lastTrickKey);
    setPausing(true);
  }
  useEffect(() => {
    if (!pausing) return undefined;
    const t = setTimeout(() => setPausing(false), TRICK_PAUSE_MS);
    return () => clearTimeout(t);
  }, [pausing, lastTrickKey]);
  const seatCount = game.seat_count;
  const teamColors = game.team_colors ?? TEAM_COLOR_FALLBACK;
  const claimed = seats.filter((s) => s.user_id).length;
  const ready = seats.filter((s) => s.user_id && s.ready).length;
  // Latches once the lobby has been fully claimed+ready — a seat can never be
  // un-claimed in this app, so once true it stays true for the rest of the
  // lobby's life. Without the latch, a player fat-fingering ready off after
  // everyone was already in would resurrect a full-screen "SCAN ME" overlay
  // over a room that has already sat down; nobody is joining at that point.
  // Set conditionally during render (React's documented "adjusting state
  // during render" pattern) rather than in an effect, so it commits before
  // the QR overlay ever paints instead of flashing on for one frame.
  const fullySeated = claimed === seatCount && ready === seatCount;
  const [everyoneWasReady, setEveryoneWasReady] = useState(fullySeated);
  if (fullySeated && !everyoneWasReady) setEveryoneWasReady(true);

  const handleStart = async () => {
    setBusy(true);
    setErr('');
    try {
      await startRound(gameId);
    } catch (e) {
      setErr(arabicKoutError(e.message));
    } finally {
      setBusy(false);
    }
  };

  if (game.status === 'lobby') {
    // Nobody can join without this. It used to live only behind the host
    // menu, which meant a room full of players had no way onto the table —
    // the "keep the QR out of the permanent layout" rule is for once a trick
    // is on the table (390px of height can't spare it there); an empty
    // lobby has nothing better to show, so the QR IS the screen here. It now
    // owns the centre field only, so the rails stay live behind it and the
    // room watches names land on the red side and the blue side as they scan.
    // Ready gates only this first deal — a claimed-but-unready seat means
    // someone scanned the QR and never actually looked up from their phone.
    // `round_end` below has no such check: players are already mid-game there.
    const waitingOn = seats.filter((s) => s.user_id && !s.ready).map((s) => s.name || `#${s.seat + 1}`);
    const showQrOverlay = !everyoneWasReady;

    return (
      <Field>
        {/* Dimmed-through layer: this progress readout stays legible under
            the scrim — the host has to be able to watch the room fill in
            while the QR owns the field. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="font-ar-body font-bold leading-none" style={{ fontSize: 26, color: 'var(--text)' }}>
              بانتظار اللاعبين
            </span>
            <span className="font-en-body leading-none" style={{ fontSize: 12, color: 'var(--muted)' }} lang="en">
              {claimed}/{seatCount} SEATS CLAIMED
            </span>
            <span className="font-en-body leading-none" style={{ fontSize: 12, color: ready < claimed ? 'var(--gold-ink)' : 'var(--muted)' }} lang="en">
              {ready}/{claimed} READY
            </span>
            {waitingOn.length > 0 && (
              <span className="font-ar-body font-bold leading-none" style={{ fontSize: 12, color: 'var(--gold-ink)' }}>
                بانتظار: {waitingOn.join('، ')}
              </span>
            )}
            {err && (
              <span className="font-en-body leading-none" style={{ fontSize: 11, color: 'var(--red-ink)' }}>
                {err}
              </span>
            )}
            <button type="button" disabled={ready < seatCount || busy} onClick={handleStart} className="text-center disabled:opacity-40" style={btnStyle}>
              <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 22 }}>ابدأ الجولة</span>{' '}
              <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">START</span>
            </button>
          </div>
        </div>

        {/* QR owns the field until the room is full and ready — the one
            moment nothing else matters. `var(--scrim)` is Modal's own
            backdrop token, reused rather than inventing a second dimming
            value. */}
        {showQrOverlay && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--scrim)' }}>
            <JoinQrPanel joinCode={game.join_code} size={200} />
          </div>
        )}
      </Field>
    );
  }

  if (game.status === 'round_end') {
    const delta = scoreRound({
      bid: game.bid, bidderSeat: game.bidder_seat, mulzum: game.mulzum, tricksWon: game.tricks_won,
    });
    return (
      <Field>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="font-ar-body font-bold leading-none" style={{ fontSize: 22, color: 'var(--text)' }}>
            نتيجة الجولة
          </span>
          <span className="font-en-body font-bold leading-none" style={{ fontSize: 15, color: teamColors[0] }} lang="en">
            {game.team_names[0]} +{delta[0]}
          </span>
          <span className="font-en-body font-bold leading-none" style={{ fontSize: 15, color: teamColors[1] }} lang="en">
            {game.team_names[1]} +{delta[1]}
          </span>
          {err && (
            <span className="font-en-body leading-none" style={{ fontSize: 11, color: 'var(--red-ink)' }}>
              {err}
            </span>
          )}
          <button type="button" disabled={busy} onClick={handleStart} className="text-center disabled:opacity-40" style={{ ...btnStyle, marginTop: 6 }}>
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 20 }}>الجولة التالية</span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">NEXT</span>
          </button>
        </div>
      </Field>
    );
  }

  if (game.status === 'finished') {
    const winner = game.team_names[game.winner_team] ?? '';
    return (
      <Field>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 28, color: 'var(--gold-ink)' }}>
            {winner} فاز!
          </span>
          <button type="button" onClick={() => navigate('/kout')} className="text-center" style={btnStyle}>
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 20 }}>لعبة جديدة</span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">NEW GAME</span>
          </button>
        </div>
      </Field>
    );
  }

  // bidding | hukm | playing — one grid cell per seat, filled in play order.
  // The rails bounce the lit card across the stage every single turn (turn
  // order strictly alternates teams); this grid does not — it advances one
  // cell in reading order and never jumps. It is the stable turn signal, and
  // it is also the biggest thing on the screen.
  // While `trick` (live) has cards, show it — that's an in-progress trick,
  // and new state always wins over a pending pause (see TRICK_PAUSE_MS
  // above). Once it's empty, fall back to `last_trick` until the pause
  // expires, then let the empty grid show through undisturbed.
  const trick = game.trick.length ? game.trick : (pausing ? game.last_trick ?? [] : []);
  const next = trick.length;
  const showNext = next < seatCount && game.turn_seat != null;

  return (
    <Field>
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${seatCount / 2}, 1fr)`, gridTemplateRows: 'repeat(2, 1fr)', gap: 8, padding: '0 8px' }}
      >
        {Array.from({ length: seatCount }, (_, cell) => {
          const played = trick[cell];
          if (played) {
            return (
              <TrickCard
                key={cell}
                card={played.card}
                teamColor={teamColors[teamOf(played.seat)]}
                name={seatName(seats, played.seat)}
                isLead={cell === 0}
              />
            );
          }

          // The centre of the screen says the name outright, so nobody has to
          // hunt a highlight to answer "whose turn?".
          if (showNext && cell === next) {
            const turnName = seatName(seats, game.turn_seat);
            // A short name gets full size; a long one steps down first, so
            // shrinking — not truncation — is the first response to length.
            // WebkitLineClamp is only the backstop for a name that's long
            // even at the smaller size.
            const turnNameFontSize = turnName.length > 10 ? 18 : 26;
            return (
              <Slot key={cell}>
                <div
                  className="flex items-center justify-center text-center"
                  style={{ ...slotStyle, border: '3px dashed var(--gold)', padding: 6 }}
                >
                  <span
                    className="font-ar-body font-extrabold"
                    style={{
                      fontSize: turnNameFontSize,
                      lineHeight: 1.15,
                      color: 'var(--gold-ink)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {turnName}
                  </span>
                </div>
              </Slot>
            );
          }

          // Drawn, never omitted: the room can see how many cards are still
          // to come, and the half-empty second row at six seats reads as
          // "not yet played" instead of as a broken layout.
          return (
            <Slot key={cell}>
              <div style={{ ...slotStyle, border: '2px dashed var(--line)' }} />
            </Slot>
          );
        })}
      </div>
    </Field>
  );
}

// A cell holding no played card: same box as a TrickCard, minus the name, so
// every card in the grid sits on one baseline.
function Slot({ children }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ width: '100%', height: '100%', minWidth: 0, paddingBottom: LABEL_H }}>
      {children}
    </div>
  );
}

// Every status renders into the same box, so the rails and the score bar
// never move between them.
function Field({ children }) {
  return <div dir="rtl" className="relative" style={{ flex: 1, minWidth: 0 }}>{children}</div>;
}
