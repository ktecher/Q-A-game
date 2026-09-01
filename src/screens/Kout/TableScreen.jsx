import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useKoutGame } from '../../lib/useKoutGame';
import { startRound } from '../../lib/koutClient';
import { SUIT_GLYPH } from '../../lib/koutCards';
import { toArabicDigits } from '../../lib/format';
import { TARGET_SCORE } from '../../../supabase/functions/_shared/koutRules.js';
import { TEAM_COLOR_FALLBACK } from '../../lib/teams';
import { readKoutOrientation } from '../../lib/koutGeometry';
import Modal from '../../components/Modal';
import SeatRing from './SeatRing';
import TrickArea from './TrickArea';
import JoinQr from './JoinQr';

const RED_SUIT = { H: true, D: true };

// Every host-menu action that hits the server can be refused — a bare
// `.catch(() => {})` here means the host taps, nothing visibly happens, and
// they conclude the app is broken. Same small per-file map as SeatScreen's
// arabicError: nothing reaches the host as a raw English message.
const HOST_ERROR_AR = {
  'only the host starts a round': 'هذا الحساب ليس مضيف اللعبة',
  'a round is already in progress': 'الجولة جارية بالفعل',
  'every seat must be claimed': 'يجب أن يشغل كل مقعد لاعب أولاً',
  'no such game': 'تعذّر العثور على اللعبة',
};
const arabicError = (message) => HOST_ERROR_AR[message] ?? 'حدث خطأ، حاول مرة أخرى';

const menuBtnStyle = {
  padding: '12px 16px',
  background: 'var(--panel2)',
  border: '4px solid var(--line)',
  color: 'var(--text)',
};

/* The host's table — mirrored to a TV, landscape, ~844×390. Every seat here
   is `useKoutGame`'s public data only: the host holds no `kout_hands` row
   (RLS-enforced), so `hand` from the hook is never even read, let alone
   rendered. Nothing in this file, SeatRing, or TrickArea shows a card face
   that belongs to a player's hand — the trick's cards are the one exception,
   and those are already public (played face-up for the whole table to see). */
export default function TableScreen() {
  const [params] = useSearchParams();
  const gameId = params.get('g');
  const navigate = useNavigate();
  const { game, seats, loading, error } = useKoutGame(gameId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [paused, setPaused] = useState(false);

  // A mirrored phone must not sleep mid-hand.
  useEffect(() => {
    let lock = null;
    navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => lock?.release?.();
  }, []);

  if (!gameId) {
    return <CenteredMessage text="لا يوجد رمز لعبة" />;
  }
  if (error) {
    return <CenteredMessage text={error} />;
  }
  if (loading || !game) {
    return <CenteredMessage text="جارٍ التحميل…" />;
  }

  const orientation = readKoutOrientation(game.seat_count);
  const bidLive = ['hukm', 'playing', 'round_end'].includes(game.status) && game.bid != null;
  const teamColors = game.team_colors ?? TEAM_COLOR_FALLBACK;

  const handleMenuStart = async () => {
    setMenuError('');
    try {
      await startRound(gameId);
      setMenuOpen(false);
    } catch (e) {
      setMenuError(arabicError(e.message));
    }
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {/* Top strip — team names, scores, target, pinned bid badge, host menu */}
      <div
        className="flex items-center justify-between gap-2 shrink-0"
        style={{ padding: '6px 14px', background: 'var(--panel)', borderBottom: '3px solid var(--gold-d)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-ar-body font-bold leading-none truncate" style={{ fontSize: 15, color: teamColors[0] }}>
            {game.team_names[0]}
          </span>
          <span className="font-en-body font-bold leading-none" style={{ fontSize: 20, color: teamColors[0] }} lang="en">
            {game.score[0]}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-en-body leading-none" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }} lang="en">
            TARGET {TARGET_SCORE}
          </span>
          {bidLive && (
            <span
              className="flex items-center gap-1 font-en-body font-bold leading-none"
              style={{ fontSize: 16, background: 'var(--panel2)', border: '2px solid var(--gold)', padding: '3px 8px' }}
            >
              <span style={{ color: 'var(--gold-ink)' }}>{toArabicDigits(game.bid)}</span>
              {game.hukm && (
                <span style={{ color: RED_SUIT[game.hukm] ? 'var(--red-ink)' : 'var(--text)' }}>
                  {SUIT_GLYPH[game.hukm]}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span className="font-en-body font-bold leading-none" style={{ fontSize: 20, color: teamColors[1] }} lang="en">
            {game.score[1]}
          </span>
          <span className="font-ar-body font-bold leading-none truncate" style={{ fontSize: 15, color: teamColors[1] }}>
            {game.team_names[1]}
          </span>
          <button
            type="button"
            aria-label="القائمة"
            onClick={() => { setMenuError(''); setMenuOpen(true); }}
            className="flex items-center justify-center shrink-0"
            style={{ width: 30, height: 30, background: 'var(--panel2)', border: '3px solid var(--line)', color: 'var(--gold-ink)', fontSize: 15, marginInlineStart: 4 }}
          >
            <span aria-hidden="true">☰</span>
          </button>
        </div>
      </div>

      {/* The table itself — seat ring around the trick + capture piles */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <SeatRing seats={seats} seatCount={game.seat_count} orientation={orientation} turnSeat={game.turn_seat} status={game.status} teamColors={teamColors} />
        <TrickArea game={game} seats={seats} seatCount={game.seat_count} orientation={orientation} gameId={gameId} />
      </div>

      {showQr && <JoinQr joinCode={game.join_code} onClose={() => setShowQr(false)} />}

      <Modal
        open={paused}
        onClose={() => setPaused(false)}
        labelledBy="kout-paused-title"
        className="flex flex-col items-center gap-4"
        style={{ background: 'none', border: 'none', boxShadow: 'none' }}
      >
        <span id="kout-paused-title" className="font-ar-body font-extrabold leading-none" style={{ fontSize: 30, color: 'var(--gold-ink)' }}>
          الجولة متوقفة
        </span>
        <button
          type="button"
          onClick={() => setPaused(false)}
          style={{ padding: '10px 24px', background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)', border: '4px solid var(--outline)', boxShadow: '0 6px 0 var(--gold-sh)', color: 'var(--outline)' }}
        >
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 20 }}>استئناف</span>
        </button>
      </Modal>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="kout-menu-title" className="max-w-xs w-full text-center" style={{ padding: '20px 24px' }}>
        <h3 id="kout-menu-title" className="font-ar-body font-bold leading-none" style={{ fontSize: 22, color: 'var(--gold-ink)' }}>
          القائمة
        </h3>
        {menuError && (
          <p className="font-ar-body font-bold" style={{ fontSize: 13, color: 'var(--red-ink)', marginTop: 10 }}>
            {menuError}
          </p>
        )}
        <div className="flex flex-col" style={{ gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => { setMenuOpen(false); setShowQr(true); }} className="font-ar-body font-bold" style={menuBtnStyle}>
            عرض رمز الانضمام
          </button>
          <button type="button" onClick={handleMenuStart} className="font-ar-body font-bold" style={menuBtnStyle}>
            ابدأ الجولة
          </button>
          <button type="button" onClick={() => { setMenuOpen(false); setPaused(true); }} className="font-ar-body font-bold" style={menuBtnStyle}>
            إيقاف مؤقت
          </button>
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="font-ar-body font-bold"
            style={{ ...menuBtnStyle, borderColor: 'var(--red)', color: 'var(--red-ink)' }}
          >
            إنهاء اللعبة
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="flex items-center justify-center" style={{ height: '100dvh' }}>
      <span className="font-ar-body font-bold" style={{ fontSize: 22, color: 'var(--text)' }}>{text}</span>
    </div>
  );
}
