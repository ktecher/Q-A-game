import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useKoutGame } from '../../lib/useKoutGame';
import { startRound } from '../../lib/koutClient';
import { SUIT_GLYPH } from '../../lib/koutCards';
import { toArabicDigits } from '../../lib/format';
import { TEAM_COLOR_FALLBACK } from '../../lib/teams';
import { arabicKoutError } from '../../lib/koutErrors';
import Modal from '../../components/Modal';
import SeatRail from './SeatRail';
import TrickArea from './TrickArea';
import JoinQr from './JoinQr';

const RED_SUIT = { H: true, D: true };

const menuBtnStyle = {
  padding: '14px 16px',
  fontSize: 16,
  background: 'var(--panel2)',
  border: '4px solid var(--line)',
  color: 'var(--text)',
};

// The strip's own control, read from across a room at TV distance — needs a
// bigger target and more contrast than a phone-held-at-arm's-length button,
// so it borrows the gold treatment other primary actions use instead of the
// muted var(--line) outline the rest of the strip uses.
const menuOpenBtnStyle = {
  width: 42,
  height: 42,
  background: 'var(--panel3)',
  border: '3px solid var(--gold)',
  color: 'var(--gold-ink)',
  fontSize: 22,
  marginInlineStart: 4,
};

/* The host's table — mirrored to a TV, landscape, ~844×390. Every seat here
   is `useKoutGame`'s public data only: the host holds no `kout_hands` row
   (RLS-enforced), so `hand` from the hook is never even read, let alone
   rendered. Nothing in this file, SeatRail, or TrickArea shows a card face
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

  const errorAr = error ? arabicKoutError(error) : '';

  if (!gameId) {
    return <CenteredMessage text="لا يوجد رمز لعبة" />;
  }
  // Only one of kout_games/kout_seats/kout_hands has to fail for `error` to be
  // set (see useKoutGame) — `game` itself can still be there. A full-screen
  // swap is reserved for when there's truly nothing to show; otherwise the
  // error rides as a banner over the live table, same as SeatScreen.
  if (loading || !game) {
    return <CenteredMessage text={errorAr || 'جارٍ التحميل…'} />;
  }

  const bidLive = ['hukm', 'playing', 'round_end'].includes(game.status) && game.bid != null;
  const teamColors = game.team_colors ?? TEAM_COLOR_FALLBACK;

  const handleMenuStart = async () => {
    setMenuError('');
    try {
      await startRound(gameId);
      setMenuOpen(false);
    } catch (e) {
      setMenuError(arabicKoutError(e.message));
    }
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {/* Top strip — the round's bid + hukm, and the host menu. It used to
          carry both team scores and TARGET 101 as well, but a match score and
          a trick count are two unrelated quantities that looked alike at TV
          distance; both now live together in each rail's foot, told apart by
          size and by an explicit unit. What is left here is round-scoped
          state, which belongs nowhere near a team's column. */}
      <div
        className="flex items-center justify-between gap-2 shrink-0"
        style={{ padding: '6px 14px', background: 'var(--panel)', borderBottom: '3px solid var(--gold-d)' }}
      >
        {bidLive ? (
          <span
            className="flex items-center gap-2 font-en-body font-bold leading-none"
            style={{ fontSize: 24, background: 'var(--panel2)', border: '2px solid var(--gold)', padding: '5px 12px' }}
          >
            <span className="font-ar-body" style={{ color: 'var(--gold-ink)' }}>{toArabicDigits(game.bid)}</span>
            {game.hukm && (
              <span style={{ color: RED_SUIT[game.hukm] ? 'var(--red-ink)' : 'var(--text)' }}>
                {SUIT_GLYPH[game.hukm]}
              </span>
            )}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          aria-label="القائمة"
          onClick={() => { setMenuError(''); setMenuOpen(true); }}
          className="flex items-center justify-center shrink-0"
          style={menuOpenBtnStyle}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {/* Two team rails flanking the cards. `dir="ltr"` here and nowhere
          else: the owner named PHYSICAL sides (blue right, red left) and the
          app is dir="rtl", so logical order would mirror them. Each child
          restores rtl for its own content. Team 0 = even seats on the right,
          team 1 = odd seats on the left — `teamOf(seat) = seat % 2` untouched.
          The rails also reclaim the two ~250px columns the old ellipse left
          empty, which is where the cards' new size comes from. `game` carries
          no hand data — it is the kout_games row — so passing it whole leaks
          nothing the rail could render. */}
      <div dir="ltr" className="flex flex-1" style={{ minHeight: 0, padding: 6, gap: 6 }}>
        <SeatRail game={game} seats={seats} team={1} teamColor={teamColors[1]} />
        <TrickArea game={game} seats={seats} gameId={gameId} />
        <SeatRail game={game} seats={seats} team={0} teamColor={teamColors[0]} />
      </div>

      {errorAr && <ErrorBanner text={errorAr} />}

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

// Same treatment as SeatScreen's ErrorBanner — a strip over the live view,
// not a replacement for it. Read from across the room, so it gets the same
// solid red band rather than a subtle toast.
function ErrorBanner({ text }) {
  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-30 text-center font-ar-body font-bold"
      style={{ padding: '12px 16px', background: 'var(--red-d)', color: '#F4ECD8', borderTop: '4px solid var(--outline)' }}
      role="alert"
    >
      {text}
    </div>
  );
}
