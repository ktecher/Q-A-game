import { teamOf } from '../../../supabase/functions/_shared/koutRules.js';

// Ellipse radii as a % of the stage — wider than tall, since the stage
// itself (844×~350) is much wider than it is high.
const RX = 40;
const RY = 37;

// slot 0 = top, increasing slot = counterclockwise (top → upper-left → …).
// `orientation` is the ring slot the host tapped at setup to mean seat 0,
// so every other seat's slot is offset from it.
function seatAngleDeg(seatIndex, seatCount, orientation) {
  const slot = (orientation + seatIndex) % seatCount;
  return (slot * 360) / seatCount;
}

function ellipsePct(angleDeg, rx, ry) {
  const rad = (angleDeg * Math.PI) / 180;
  return { left: 50 - rx * Math.sin(rad), top: 50 - ry * Math.cos(rad) };
}

const bidLabel = (bid) => (bid === -1 ? 'طاف' : String(bid));

/* Seats around the table. Card BACKS only — a small filled rectangle, never
   a rank or suit — this screen is mirrored to a television. */
export default function SeatRing({ seats, seatCount, orientation, turnSeat, status, teamColors }) {
  const showTurn = status === 'bidding' || status === 'hukm' || status === 'playing';

  return (
    <div className="absolute inset-0">
      {Array.from({ length: seatCount }, (_, i) => {
        const seat = seats.find((s) => s.seat === i);
        const claimed = !!seat?.user_id;
        const { left, top } = ellipsePct(seatAngleDeg(i, seatCount, orientation), RX, RY);
        const color = teamColors[teamOf(i)];
        const isTurn = showTurn && turnSeat === i;

        return (
          <div
            key={i}
            className="absolute flex flex-col items-center justify-center text-center"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: 'translate(-50%, -50%)',
              width: 82,
              padding: '4px 6px',
              background: 'var(--panel2)',
              border: `3px solid ${isTurn ? 'var(--gold)' : color}`,
              boxShadow: isTurn ? '0 0 0 3px var(--gold-sh)' : 'none',
            }}
          >
            <span
              className="font-ar-body font-bold leading-none truncate w-full"
              style={{ fontSize: 13, color: claimed ? 'var(--text)' : 'var(--muted2)' }}
            >
              {claimed ? seat.name || `#${i + 1}` : 'فارغ'}
            </span>

            <span className="flex items-center gap-1" style={{ marginTop: 3 }}>
              <span
                aria-hidden="true"
                style={{ width: 9, height: 13, background: 'var(--outline)', border: `2px solid ${color}` }}
              />
              <span className="font-en-body leading-none" style={{ fontSize: 10, color: 'var(--muted)' }} lang="en">
                ×{seat?.card_count ?? 0}
              </span>
            </span>

            {status === 'bidding' && seat?.bid != null && (
              <span
                className="font-en-body font-bold leading-none"
                style={{ fontSize: 11, color: 'var(--gold-ink)', marginTop: 2 }}
                lang="en"
              >
                {bidLabel(seat.bid)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
