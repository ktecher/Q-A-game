import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useKoutGame } from '../../lib/useKoutGame';
import { startRound } from '../../lib/koutClient';
import { SUIT_GLYPH } from '../../lib/koutCards';
import { STORAGE_KEYS } from '../../lib/storageKeys';
import { TARGET_SCORE } from '../../../supabase/functions/_shared/koutRules.js';
import Modal from '../../components/Modal';
import SeatRing from './SeatRing';
import TrickArea from './TrickArea';
import JoinQr from './JoinQr';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicDigits = (n) => String(n).split('').map((d) => AR_DIGITS[Number(d)] ?? d).join('');
const RED_SUIT = { H: true, D: true };

const menuBtnStyle = {
  padding: '12px 16px',
  background: 'var(--panel2)',
  border: '4px solid var(--line)',
  color: 'var(--text)',
};

function readOrientation(seatCount) {
  const raw = Number(localStorage.getItem(STORAGE_KEYS.KOUT_SEAT1_POS));
  return Number.isInteger(raw) && raw >= 0 && raw < seatCount ? raw : 0;
}

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

  const orientation = readOrientation(game.seat_count);
  const bidLive = ['hukm', 'playing', 'round_end'].includes(game.status) && game.bid != null;

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {/* Top strip — team names, scores, target, pinned bid badge, host menu */}
      <div
        className="flex items-center justify-between gap-2 shrink-0"
        style={{ padding: '6px 14px', background: 'var(--panel)', borderBottom: '3px solid var(--gold-d)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-ar-body font-bold leading-none truncate" style={{ fontSize: 15, color: 'var(--blue-ink)' }}>
            {game.team_names[0]}
          </span>
          <span className="font-en-body font-bold leading-none" style={{ fontSize: 20, color: 'var(--blue-ink)' }} lang="en">
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
          <span className="font-en-body font-bold leading-none" style={{ fontSize: 20, color: 'var(--red-ink)' }} lang="en">
            {game.score[1]}
          </span>
          <span className="font-ar-body font-bold leading-none truncate" style={{ fontSize: 15, color: 'var(--red-ink)' }}>
            {game.team_names[1]}
          </span>
          <button
            type="button"
            aria-label="القائمة"
            onClick={() => setMenuOpen(true)}
            className="flex items-center justify-center shrink-0"
            style={{ width: 30, height: 30, background: 'var(--panel2)', border: '3px solid var(--line)', color: 'var(--gold-ink)', fontSize: 15, marginInlineStart: 4 }}
          >
            <span aria-hidden="true">☰</span>
          </button>
        </div>
      </div>

      {/* The table itself — seat ring around the trick + capture piles */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <SeatRing seats={seats} seatCount={game.seat_count} orientation={orientation} turnSeat={game.turn_seat} status={game.status} />
        <TrickArea game={game} seats={seats} seatCount={game.seat_count} orientation={orientation} gameId={gameId} />
      </div>

      {showQr && <JoinQr joinCode={game.join_code} onClose={() => setShowQr(false)} />}

      {paused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--scrim)' }}>
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 30, color: 'var(--gold-ink)' }}>
            الجولة متوقفة
          </span>
          <button
            type="button"
            onClick={() => setPaused(false)}
            style={{ padding: '10px 24px', background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)', border: '4px solid var(--outline)', boxShadow: '0 6px 0 var(--gold-sh)', color: 'var(--outline)' }}
          >
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 20 }}>استئناف</span>
          </button>
        </div>
      )}

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="kout-menu-title" className="max-w-xs w-full text-center" style={{ padding: '20px 24px' }}>
        <h3 id="kout-menu-title" className="font-ar-body font-bold leading-none" style={{ fontSize: 22, color: 'var(--gold-ink)' }}>
          القائمة
        </h3>
        <div className="flex flex-col" style={{ gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => { setMenuOpen(false); setShowQr(true); }} className="font-ar-body font-bold" style={menuBtnStyle}>
            عرض رمز الانضمام
          </button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); startRound(gameId).catch(() => {}); }}
            className="font-ar-body font-bold"
            style={menuBtnStyle}
          >
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
