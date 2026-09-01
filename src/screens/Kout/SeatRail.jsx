import { teamOf } from '../../../supabase/functions/_shared/koutRules.js';
import { toArabicDigits } from '../../lib/format';
import { SUIT_GLYPH } from '../../lib/koutCards';

const RED_SUIT = { H: true, D: true };

const bidLabel = (bid) => (bid === -1 ? 'طاف' : toArabicDigits(bid));

/* The active player's whole card floods with the team colour, so the text on
   it can no longer be var(--text): the fill is a fixed hex chosen at setup
   while the token flips with the theme, so the ink would drift off its own
   background. Same trap TrickArea's card-face comment documents about
   var(--red), second site. sRGB relative luminance, crossover 0.179 — the
   point where cream and ink contrast equally; worst case across the six
   selectable team colours lands at 3.8:1, above the 3:1 large-text bar.
   Lives here rather than in lib/teams.js because this is its only caller. */
function inkOn(hex) {
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return lum > 0.179 ? '#1D1F20' : '#F4ECD8';
}

/* One team's column of players, pinned to a physical side of the stage by
   TableScreen. Card BACKS only — a small filled rectangle, never a rank or
   suit — this screen is mirrored to a television and the host is denied
   hands by RLS in the first place.

   Rails replaced the seat ring, which used to give turn order away for free
   through position. Three redundant signals carry it now: the flood below,
   the gold next-to-play cell in TrickArea, and the ordinal chip on every
   card — at six seats the chip is the *only* thing from which the
   right-rail/left-rail zig-zag of play order can be reconstructed. */
export default function SeatRail({ seats, seatCount, team, teamColor, turnSeat, status, tricksWon, bid, bidderSeat, hukm }) {
  const showTurn = status === 'bidding' || status === 'hukm' || status === 'playing';
  const showHukm = (status === 'hukm' || status === 'playing') && bid != null;
  // Even seats on one rail, odd on the other — `teamOf(seat) = seat % 2`
  // untouched; the rail simply *is* teamOf.
  const railSeats = Array.from({ length: seatCount }, (_, i) => i).filter((i) => teamOf(i) === team);

  return (
    <div dir="rtl" className="flex flex-col" style={{ width: 190, minWidth: 0, gap: 6 }}>
      <div className="flex flex-col" style={{ flex: 1, minHeight: 0, gap: 8 }}>
        {railSeats.map((i) => {
          const seat = seats.find((s) => s.seat === i);
          const claimed = !!seat?.user_id;
          const lit = showTurn && turnSeat === i;
          // Everything on a lit card picks its colour from the fill; nothing
          // on it may keep a token, or it drifts off its own background.
          const ink = inkOn(teamColor);

          return (
            <div
              key={i}
              className="flex flex-col justify-center"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                padding: '6px 8px',
                background: lit ? teamColor : 'var(--panel2)',
                // Fill alone is weak for the darker/lighter halves of the
                // palette (gold in light mode is 1.9:1 against the idle box).
                // The heavy near-black frame and the size bump are what make
                // the worst legal colour pair read across a mirrored TV, so
                // they are not garnish.
                border: lit ? '5px solid var(--outline)' : `3px solid ${teamColor}`,
                transform: lit ? 'scale(1.06)' : 'none',
              }}
            >
              <div className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
                <span
                  className="flex items-center justify-center shrink-0 font-ar-body font-extrabold leading-none"
                  style={{
                    width: 22,
                    height: 22,
                    fontSize: 14,
                    background: lit ? ink : teamColor,
                    color: lit ? teamColor : inkOn(teamColor),
                  }}
                >
                  {toArabicDigits(i + 1)}
                </span>
                <span
                  className="font-ar-body font-bold leading-none truncate"
                  style={{
                    fontSize: 19,
                    minWidth: 0,
                    color: lit ? ink : claimed ? 'var(--text)' : 'var(--muted2)',
                  }}
                >
                  {claimed ? seat.name || `#${i + 1}` : 'فارغ'}
                </span>
              </div>

              <span className="flex items-center" style={{ gap: 5, marginTop: 6 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 22,
                    background: lit ? ink : 'var(--outline)',
                    border: `2px solid ${lit ? ink : teamColor}`,
                  }}
                />
                <span
                  className="font-en-body leading-none"
                  style={{ fontSize: 16, color: lit ? ink : 'var(--muted)' }}
                  lang="en"
                >
                  ×{seat?.card_count ?? 0}
                </span>
              </span>

              {status === 'lobby' && claimed && (
                <span
                  className="font-ar-body font-bold leading-none"
                  style={{ fontSize: 14, marginTop: 5, color: seat.ready ? 'var(--green)' : 'var(--muted)' }}
                >
                  {seat.ready ? 'جاهز' : 'بانتظاره'}
                </span>
              )}

              {status === 'bidding' && seat?.bid != null && (
                <span
                  className="font-ar-body font-bold leading-none"
                  style={{ fontSize: 18, marginTop: 5, color: lit ? ink : 'var(--gold-ink)' }}
                >
                  {bidLabel(seat.bid)}
                </span>
              )}

              {/* Once bidding closes the winning bid stops being per-seat
                  state and becomes the round's, so only the bidder's card
                  carries it — the score bar keeps the authoritative copy. */}
              {showHukm && bidderSeat === i && (
                <span className="flex items-center leading-none" style={{ gap: 4, marginTop: 5 }}>
                  <span className="font-ar-body font-bold" style={{ fontSize: 18, color: lit ? ink : 'var(--gold-ink)' }}>
                    {toArabicDigits(bid)}
                  </span>
                  {hukm && (
                    <span
                      className="font-en-body"
                      style={{ fontSize: 18, color: lit ? ink : RED_SUIT[hukm] ? 'var(--red-ink)' : 'var(--text)' }}
                      lang="en"
                    >
                      {SUIT_GLYPH[hukm]}
                    </span>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Capture pile. It used to float at `left/right: 4%` — exactly where
          this rail now stands — so it moved into the rail's foot, where it
          also gains adjacency to the players who won those tricks. */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{ height: 40, gap: 8, background: 'var(--panel2)', border: `3px solid ${teamColor}` }}
      >
        <span aria-hidden="true" style={{ width: 14, height: 20, background: 'var(--outline)', border: `2px solid ${teamColor}` }} />
        <span className="font-en-body font-bold leading-none" style={{ fontSize: 26, color: teamColor }} lang="en">
          {tricksWon[team]}
        </span>
        <span className="font-en-body leading-none" style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.08em' }} lang="en">
          TRICKS
        </span>
      </div>
    </div>
  );
}
