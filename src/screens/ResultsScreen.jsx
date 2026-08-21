import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { makeDemoTeams } from '../lib/teams';
import { toArabicDigits } from '../lib/format';

// Demo state for direct-URL access (when no game has been played)
const DEMO_TEAMS = makeDemoTeams([1800, 1400]);
const DEMO_STATS = {
  questionsAnswered: 12,
  lifelinesUsed: 3,
  longestStreak: 4,
};

/* ─── PIXEL CONFETTI ──────────────────────────────────────────────────── */

// 30 square sprites falling on `pixfall`. Built once at module load from an
// index-based sequence rather than Math.random, so a re-render never reshuffles
// them mid-fall.
const CONFETTI_COLORS = [
  'var(--gold)', 'var(--blue)', 'var(--red)', '#F4ECD8', 'var(--green)', 'var(--purple)',
];
const CONFETTI_SIZES = [8, 12, 16];

const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 97) % 100}%`,
  size: CONFETTI_SIZES[i % CONFETTI_SIZES.length],
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: `${((i * 7) % 41) / 10}s`,
  duration: `${3.2 + ((i * 3) % 25) / 10}s`,
}));

function ConfettiLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 animate-pixfall"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

/* ─── TROPHY ──────────────────────────────────────────────────────────── */

// The sheet leaves a 120px art slot here and offers "a pixel-block trophy drawn
// in divs" as the alternative to shipping a sprite. No sprite exists, so this
// is that: an 8×8 bitmap, one span per lit pixel.
const TROPHY_ROWS = [
  '.######.',
  '.######.',
  '.######.',
  '#.####.#',
  '..####..',
  '...##...',
  '..####..',
  '.######.',
];

function Trophy() {
  return (
    <div
      className="shrink-0 grid place-items-center animate-bob"
      style={{ width: 'var(--res-trophy)', height: 'var(--res-trophy)', background: 'var(--panel)', border: '4px solid var(--gold)' }}
      aria-hidden="true"
    >
      <div className="grid" style={{ gridTemplateColumns: 'repeat(8, 12px)' }}>
        {TROPHY_ROWS.flatMap((row, y) =>
          row.split('').map((cell, x) => (
            <span
              key={`${x}-${y}`}
              style={{ width: 12, height: 12, background: cell === '#' ? 'var(--gold)' : 'transparent' }}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────── */

export default function ResultsScreen() {
  const { isAuthenticated } = useAuth();
  const { state, reset } = useGame();

  // Use real game state if a game was played; otherwise show demo for direct URL hits
  const played = state.gameOver || state.stats.questionsAnswered > 0;
  const teams = played ? state.teams : DEMO_TEAMS;
  const stats = played ? state.stats : DEMO_STATS;

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0];
  const runnerUp = sortedTeams[1];
  const isTie = winner.score === runnerUp.score;
  const margin = winner.score - runnerUp.score;

  return (
    <div className="relative min-h-screen">
      <ConfettiLayer />

      <div
        className="relative z-[2] min-h-screen flex flex-col items-center justify-center text-center"
        style={{ gap: 8, padding: 'var(--res-pad)' }}
      >
        <div
          className="font-en-body leading-none animate-flash"
          style={{
            fontSize: 'clamp(20px, 3.4vmin, 34px)',
            color: 'var(--red)',
            letterSpacing: '0.16em',
            textShadow: '5px 5px 0 var(--outline)',
          }}
          lang="en"
        >
          GAME OVER
        </div>

        <div className="flex items-center flex-wrap justify-center" style={{ gap: 'var(--res-gap)', marginTop: 'var(--res-gap)' }}>
          <Trophy />
          <div className="text-center">
            <div
              className="font-ar-body font-extrabold leading-none"
              style={{
                fontSize: 'clamp(40px, 7vmin, 88px)',
                color: 'var(--gold-ink)',
                textShadow: '6px 6px 0 var(--gold-sh)',
              }}
            >
              {isTie ? 'تعادل' : `${winner.name} فاز`}
            </div>
            <div
              className="font-en-body leading-none uppercase"
              style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '0.16em', marginTop: 14 }}
              lang="en"
            >
              {isTie ? 'A TIE!' : `${winner.nameEn} WINS!`}
            </div>
          </div>
        </div>

        <div
          className="font-en-body leading-none"
          style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.2em', marginTop: 28 }}
          lang="en"
        >
          — HIGH SCORE —
        </div>

        <div
          className="w-full flex flex-col"
          style={{ maxWidth: 840, gap: 12, marginTop: 14 }}
        >
          {/* 1st place */}
          <div
            className="flex items-center"
            style={{
              gap: 20,
              padding: 'var(--res-row-pad)',
              background: 'var(--panel3)',
              border: '4px solid var(--gold)',
              boxShadow: '0 8px 0 var(--gold-sh)',
            }}
          >
            <span
              className="font-en-body leading-none shrink-0"
              style={{ fontSize: 20, color: 'var(--gold-ink)' }}
              lang="en"
            >
              1ST
            </span>
            <span
              className="shrink-0"
              style={{ width: 44, height: 44, background: winner.color, border: '4px solid var(--outline)' }}
            />
            <div className="flex-1 min-w-0 text-start">
              <div
                className="font-ar-body font-bold leading-none truncate"
                style={{ fontSize: 'var(--res-name-fs)', color: 'var(--text)' }}
              >
                {winner.name}
              </div>
              <div
                className="font-en-body leading-none truncate"
                style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6 }}
                lang="en"
              >
                {stats.questionsAnswered} ANSWERED · {stats.lifelinesUsed} LIFELINES · STREAK{' '}
                {stats.longestStreak}
              </div>
            </div>
            <span
              className="font-ar-body font-extrabold leading-none shrink-0"
              style={{ fontSize: 64, color: 'var(--gold-ink)', textShadow: '4px 4px 0 var(--gold-sh)' }}
              dir="ltr"
            >
              {winner.score}
            </span>
          </div>

          {/* 2nd place */}
          <div
            className="flex items-center"
            style={{
              gap: 20,
              padding: '14px 20px',
              background: 'var(--cleared-bg)',
              border: '4px solid var(--line)',
            }}
          >
            <span
              className="font-en-body leading-none shrink-0"
              style={{ fontSize: 16, color: 'var(--muted2)' }}
              lang="en"
            >
              2ND
            </span>
            <span
              className="shrink-0"
              style={{ width: 38, height: 38, background: runnerUp.color, border: '4px solid var(--outline)' }}
            />
            <div className="flex-1 min-w-0 text-start">
              <div
                className="font-ar-body font-bold leading-none truncate"
                style={{ fontSize: 30, color: 'var(--muted)' }}
              >
                {runnerUp.name}
              </div>
            </div>
            <span
              className="font-ar-body font-extrabold leading-none shrink-0"
              style={{ fontSize: 48, color: 'var(--red)' }}
              dir="ltr"
            >
              {runnerUp.score}
            </span>
          </div>
        </div>

        {!isTie && (
          <div
            className="font-en-body leading-none"
            style={{ fontSize: 11, color: 'var(--green)', letterSpacing: '0.12em', marginTop: 18 }}
          >
            <span lang="en">MARGIN +{margin} · </span>
            <span className="font-ar-body font-bold" style={{ fontSize: 24 }}>
              فارق {toArabicDigits(margin)}
            </span>
          </div>
        )}

        <div className="flex flex-wrap justify-center" style={{ gap: 16, marginTop: 26 }}>
          <Link
            to="/setup"
            onClick={() => reset()}
            className="transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: '16px 26px',
              background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
              border: '4px solid var(--outline)',
              boxShadow: '0 8px 0 var(--gold-sh)',
              color: 'var(--outline)',
            }}
          >
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 34 }}>
              إعادة اللعب
            </span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
              PLAY AGAIN
            </span>
          </Link>
          <Link
            to="/setup"
            onClick={() => reset()}
            className="transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: '16px 22px',
              background: 'var(--panel2)',
              border: '4px solid var(--blue)',
              boxShadow: '0 8px 0 var(--shadow)',
              color: 'var(--text)',
            }}
          >
            <span className="font-ar-body font-bold leading-none" style={{ fontSize: 30 }}>
              الإعداد
            </span>{' '}
            <span
              className="font-en-body leading-none"
              style={{ fontSize: 10, color: 'var(--muted)' }}
              lang="en"
            >
              SETUP
            </span>
          </Link>
          <Link
            to="/"
            className="transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: '16px 22px',
              background: 'var(--panel2)',
              border: '4px solid var(--line)',
              boxShadow: '0 8px 0 var(--shadow)',
              color: 'var(--text)',
            }}
          >
            <span className="font-ar-body font-bold leading-none" style={{ fontSize: 30 }}>
              الرئيسية
            </span>{' '}
            <span
              className="font-en-body leading-none"
              style={{ fontSize: 10, color: 'var(--muted)' }}
              lang="en"
            >
              HOME
            </span>
          </Link>
          {isAuthenticated && (
            <button
              type="button"
              disabled
              title="Saving game results requires Supabase setup"
              style={{
                padding: '16px 22px',
                background: 'var(--cleared-bg)',
                border: '4px solid var(--line)',
                color: 'var(--muted2)',
                cursor: 'not-allowed',
              }}
            >
              <span className="font-ar-body font-bold leading-none" style={{ fontSize: 30 }}>
                حفظ النتيجة
              </span>{' '}
              <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">
                SAVE — SOON
              </span>
            </button>
          )}
        </div>

        <div
          className="font-en-body leading-none animate-blink"
          style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.14em', marginTop: 24 }}
          lang="en"
        >
          INSERT COIN TO CONTINUE
        </div>
      </div>
    </div>
  );
}
