import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardFace } from '../../lib/koutCards';
import { startRound } from '../../lib/koutClient';
import { scoreRound } from '../../../supabase/functions/_shared/koutRules.js';
import { TEAM_COLOR_FALLBACK } from '../../lib/teams';
import { seatAngleDeg, ellipsePct } from '../../lib/koutGeometry';
import { arabicKoutError } from '../../lib/koutErrors';

// Smaller ellipse than SeatRing's — the trick lives inside the ring, each
// card nudged toward the seat that played it.
const TRX = 17;
const TRY = 15;

const btnStyle = {
  padding: '10px 26px',
  background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
  border: '4px solid var(--outline)',
  boxShadow: '0 6px 0 var(--gold-sh)',
  color: 'var(--outline)',
};

// A card that has been PLAYED into the trick is public — every seat and the
// TV already see it face up. This is not a hand; rendering its face is fine.
function TrickCard({ card, left, top }) {
  const face = cardFace(card);
  return (
    <div
      className="absolute flex flex-col items-center justify-center font-en-body font-bold leading-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
        width: 30,
        height: 42,
        // A card face is intentionally theme-invariant, same as
        // QuestionScreen's QR panel and SketchStage.jsx:18 — cream paper,
        // dark ink, fixed red. It must NOT become var(--red): that token is
        // #9B2D3A in light mode, so the card would restyle with the app
        // chrome instead of staying a real playing card.
        background: '#F4ECD8',
        border: '2px solid var(--outline)',
        color: face.red ? '#C44150' : '#1D1F20',
        fontSize: 13,
      }}
      lang="en"
    >
      <span>{face.rank}</span>
      {!face.joker && <span style={{ fontSize: 12 }}>{face.glyph}</span>}
    </div>
  );
}

export default function TrickArea({ game, seats, seatCount, orientation, gameId }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const teamColors = game.team_colors ?? TEAM_COLOR_FALLBACK;

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
    const claimed = seats.filter((s) => s.user_id).length;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="font-ar-body font-bold leading-none" style={{ fontSize: 26, color: 'var(--text)' }}>
          بانتظار اللاعبين
        </span>
        <span className="font-en-body leading-none" style={{ fontSize: 12, color: 'var(--muted)' }} lang="en">
          {claimed}/{seatCount} SEATS CLAIMED
        </span>
        {err && (
          <span className="font-en-body leading-none" style={{ fontSize: 11, color: 'var(--red-ink)' }}>
            {err}
          </span>
        )}
        <button type="button" disabled={claimed < seatCount || busy} onClick={handleStart} className="text-center disabled:opacity-40" style={btnStyle}>
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 22 }}>ابدأ الجولة</span>{' '}
          <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">START</span>
        </button>
      </div>
    );
  }

  if (game.status === 'round_end') {
    const delta = scoreRound({
      bid: game.bid, bidderSeat: game.bidder_seat, mulzum: game.mulzum, tricksWon: game.tricks_won,
    });
    return (
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
    );
  }

  if (game.status === 'finished') {
    const winner = game.team_names[game.winner_team] ?? '';
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 28, color: 'var(--gold-ink)' }}>
          {winner} فاز!
        </span>
        <button type="button" onClick={() => navigate('/kout')} className="text-center" style={btnStyle}>
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 20 }}>لعبة جديدة</span>{' '}
          <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">NEW GAME</span>
        </button>
      </div>
    );
  }

  // bidding | hukm | playing — the live trick plus each team's capture pile.
  return (
    <div className="absolute inset-0">
      {game.trick.map(({ seat, card }) => {
        const { left, top } = ellipsePct(seatAngleDeg(seat, seatCount, orientation), TRX, TRY);
        return <TrickCard key={seat} card={card} left={left} top={top} />;
      })}

      {[0, 1].map((team) => (
        <div
          key={team}
          className="absolute flex flex-col items-center justify-center"
          style={{
            [team === 0 ? 'left' : 'right']: '4%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 46,
            height: 46,
            background: 'var(--panel2)',
            border: `3px solid ${teamColors[team]}`,
          }}
        >
          <span className="font-en-body font-bold leading-none" style={{ fontSize: 20, color: teamColors[team] }} lang="en">
            {game.tricks_won[team]}
          </span>
          <span className="font-en-body leading-none" style={{ fontSize: 7, color: 'var(--muted)' }} lang="en">
            TRICKS
          </span>
        </div>
      ))}
    </div>
  );
}
