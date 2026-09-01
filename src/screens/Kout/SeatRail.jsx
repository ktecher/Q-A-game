import { teamOf, TARGET_SCORE, HAND_SIZE } from '../../../supabase/functions/_shared/koutRules.js';
import { toArabicDigits } from '../../lib/format';
import { SUIT_GLYPH } from '../../lib/koutCards';
import { inkOn } from '../../lib/teams';

const RED_SUIT = { H: true, D: true };

const bidLabel = (bid) => (bid === -1 ? 'طاف' : toArabicDigits(bid));

/* How the rail body's fixed height is split between its cards. The active
   player's card is not scaled — a transform in a fixed-height rail either
   overflows it or overlaps its neighbours — the height is *reallocated*, so
   the rail's total never changes and the score foot can never be pushed
   off-screen.

   Size, not colour, is the strongest signal available on this display path.
   AirPlay and HDMI carry 4:2:0 chroma subsampling, which stores colour at
   quarter resolution: a coloured edge smears, but a change of *dimensions* is
   luminance and geometry, and luminance survives at full resolution. That is
   also what rescues the weak halves of the palette — gold at 1.91:1 and red
   at 2.12:1 against the idle box no longer have to carry the turn on their
   own, because a card half again as tall does not depend on contrast at all.

   Shares sum to 100 with exactly one card lit, and are equal when none is
   (lobby, round_end, finished), so no seat-count branch is needed. */
const SHARE = {
  4: { active: 60, idle: 40 },
  6: { active: 46, idle: 27 },
};

/* One team's column of players plus that team's single score block, pinned to
   a physical side of the stage by TableScreen. Card BACKS only — a small
   filled rectangle, never a rank or suit — this screen is mirrored to a
   television and the host is denied hands by RLS in the first place.

   Rails replaced the seat ring, which used to give turn order away for free
   through position. Three redundant signals carry it now: the reallocation +
   flood below, the gold next-to-play cell in TrickArea, and the ordinal chip
   on every card — at six seats the chip is the *only* thing from which the
   right-rail/left-rail zig-zag of play order can be reconstructed. */
export default function SeatRail({ game, seats, team, teamColor }) {
  const seatCount = game.seat_count;
  const status = game.status;
  const showTurn = status === 'bidding' || status === 'hukm' || status === 'playing';
  const showHukm = (status === 'hukm' || status === 'playing') && game.bid != null;
  // Everything on a lit card takes its colour from the fill; nothing on it may
  // keep a theme token, or it drifts off its own background.
  const ink = inkOn(teamColor);
  const share = SHARE[seatCount] ?? SHARE[4];
  // Even seats on one rail, odd on the other — `teamOf(seat) = seat % 2`
  // untouched; the rail simply *is* teamOf.
  const railSeats = Array.from({ length: seatCount }, (_, i) => i).filter((i) => teamOf(i) === team);

  return (
    <div dir="rtl" className="flex flex-col" style={{ width: 190, minWidth: 0, gap: 6 }}>
      {/* The rail owns this team's identity now that the header gave up its
          half of the score line, so the name belongs at its head. */}
      <span
        className="shrink-0 text-center font-ar-body font-bold leading-none truncate"
        style={{ fontSize: 20, color: teamColor }}
      >
        {game.team_names[team]}
      </span>

      <div className="flex flex-col" style={{ flex: 1, minHeight: 0, gap: 8 }}>
        {railSeats.map((i) => {
          const seat = seats.find((s) => s.seat === i);
          const claimed = !!seat?.user_id;
          const lit = showTurn && game.turn_seat === i;

          return (
            <div
              key={i}
              className="flex flex-col justify-center"
              style={{
                flex: `${lit ? share.active : share.idle} 1 0`,
                minHeight: 0,
                overflow: 'hidden',
                padding: '4px 8px',
                background: lit ? teamColor : 'var(--panel2)',
                /* The fill is the second signal, not the first: it is only a
                   strong pop-out for four of the six selectable colours, so
                   the near-black frame carries it for the other two. Both are
                   theme-invariant companions to the height change above.

                   CEILING: with the fill spent, this card has NO COLOUR LEFT.
                   Any state added later — disconnected, turn timer, thinking —
                   must use border weight, a corner glyph or motion. It cannot
                   be a colour on this container. */
                border: lit ? '5px solid var(--outline)' : `3px solid ${teamColor}`,
                // The theme forces steps(2, end) on every transition
                // (index.css:175), so this snaps in two frames rather than
                // sliding — enough to pull the eye, too short to wait on.
                transition: 'flex-grow 200ms',
              }}
            >
              <div className="flex items-center shrink-0" style={{ gap: 6, minWidth: 0 }}>
                <span
                  className="flex items-center justify-center shrink-0 font-ar-body font-extrabold leading-none"
                  style={{
                    width: lit ? 30 : 22,
                    height: lit ? 30 : 22,
                    fontSize: lit ? 19 : 14,
                    background: lit ? ink : teamColor,
                    color: lit ? teamColor : ink,
                  }}
                >
                  {toArabicDigits(i + 1)}
                </span>
                <span
                  className="font-ar-body font-bold leading-none truncate"
                  style={{
                    fontSize: lit ? 26 : 19,
                    minWidth: 0,
                    color: lit ? ink : claimed ? 'var(--text)' : 'var(--muted2)',
                  }}
                >
                  {claimed ? seat.name || `#${i + 1}` : 'فارغ'}
                </span>
              </div>

              {/* One row, not three. At six seats an idle card gets ~82px of
                  rail, so cards-remaining and whatever state the round is in
                  share a line — the alternative was dropping one of them. */}
              <div className="flex items-center justify-between shrink-0" style={{ gap: 4, marginTop: 5, minWidth: 0 }}>
                <span className="flex items-center shrink-0" style={{ gap: 5 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 15,
                      height: 20,
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
                    className="font-ar-body font-bold leading-none truncate"
                    style={{ fontSize: 14, color: seat.ready ? 'var(--green)' : 'var(--muted)' }}
                  >
                    {seat.ready ? 'جاهز' : 'بانتظاره'}
                  </span>
                )}

                {status === 'bidding' && seat?.bid != null && (
                  <span
                    className="font-ar-body font-bold leading-none"
                    style={{ fontSize: 18, color: lit ? ink : 'var(--gold-ink)' }}
                  >
                    {bidLabel(seat.bid)}
                  </span>
                )}

                {/* Once bidding closes the winning bid stops being per-seat
                    state and becomes the round's, so only the bidder's card
                    carries it — the header keeps the authoritative copy. */}
                {showHukm && game.bidder_seat === i && (
                  <span className="flex items-center leading-none shrink-0" style={{ gap: 4 }}>
                    <span className="font-ar-body font-bold" style={{ fontSize: 18, color: lit ? ink : 'var(--gold-ink)' }}>
                      {toArabicDigits(game.bid)}
                    </span>
                    {game.hukm && (
                      <span
                        className="font-en-body"
                        style={{ fontSize: 18, color: lit ? ink : RED_SUIT[game.hukm] ? 'var(--red-ink)' : 'var(--text)' }}
                        lang="en"
                      >
                        {SUIT_GLYPH[game.hukm]}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* This team's one and only score block. The match score used to sit in
          the header and the trick count in a floating pile, two unrelated
          quantities that looked alike; here they are adjacent but told apart
          by size AND by an explicit unit under each, because a viewer
          glancing up has no memory of which slot meant what. */}
      <div
        className="flex items-end justify-around shrink-0"
        style={{ padding: '6px 8px', gap: 8, background: 'var(--panel2)', border: `3px solid ${teamColor}` }}
      >
        <span className="flex flex-col items-center leading-none" style={{ gap: 3, minWidth: 0 }}>
          <span className="font-en-body font-bold" style={{ fontSize: 30, color: teamColor }} lang="en">
            {game.score[team]}
          </span>
          <span className="font-en-body" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }} lang="en">
            OF {TARGET_SCORE}
          </span>
        </span>

        <span className="flex flex-col items-center leading-none" style={{ gap: 3, minWidth: 0 }}>
          <span className="font-en-body font-bold" style={{ fontSize: 20, color: 'var(--text)' }} lang="en">
            {game.tricks_won[team]}/{HAND_SIZE}
          </span>
          <span className="font-en-body" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }} lang="en">
            TRICKS
          </span>
        </span>
      </div>
    </div>
  );
}
