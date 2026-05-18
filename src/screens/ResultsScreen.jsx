import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RotateCcw, Settings, Save, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { makeDemoTeams } from '../lib/teams';

// Demo state for direct-URL access (when no game has been played)
const DEMO_TEAMS = makeDemoTeams([1800, 1400]);
const DEMO_STATS = {
  questionsAnswered: 12,
  lifelinesUsed: 3,
  longestStreak: 4,
};

/* ─── FIREWORKS ───────────────────────────────────────────────────────── */

// Each firework = a centered dot + radial ring of "particles" via box-shadow.
// 4 visual variants (gold / crimson / blue / cream).
function fireworkBoxShadow(coreColor, ringColor) {
  return [
    `0 -36px 0 -1px ${coreColor}`,  `0 36px 0 -1px ${coreColor}`,
    `36px 0 0 -1px ${coreColor}`,   `-36px 0 0 -1px ${coreColor}`,
    `26px -26px 0 -1px ${ringColor}`, `-26px -26px 0 -1px ${ringColor}`,
    `26px 26px 0 -1px ${ringColor}`,  `-26px 26px 0 -1px ${ringColor}`,
    `0 -52px 0 -2px ${ringColor}`,  `0 52px 0 -2px ${ringColor}`,
    `52px 0 0 -2px ${ringColor}`,   `-52px 0 0 -2px ${ringColor}`,
  ].join(', ');
}

const FIREWORKS = [
  { top: '12%', left: '18%', delay: 0,    bg: '#D4A24C', shadow: fireworkBoxShadow('#D4A24C', '#E8B968') },
  { top: '22%', left: '78%', delay: 0.6,  bg: '#C44150', shadow: fireworkBoxShadow('#C44150', '#D4A24C') },
  { top: '38%', left: '12%', delay: 1.2,  bg: '#3A7BC8', shadow: fireworkBoxShadow('#3A7BC8', '#F4ECD8') },
  { top: '18%', left: '50%', delay: 1.8,  bg: '#D4A24C', shadow: fireworkBoxShadow('#D4A24C', '#E8B968') },
  { top: '58%', left: '84%', delay: 2.4,  bg: '#F4ECD8', shadow: fireworkBoxShadow('#F4ECD8', '#E8B968') },
  { top: '64%', left: '24%', delay: 0.9,  bg: '#D4A24C', shadow: fireworkBoxShadow('#D4A24C', '#E8B968') },
  { top: '8%',  left: '88%', delay: 1.5,  bg: '#C44150', shadow: fireworkBoxShadow('#C44150', '#D4A24C') },
  { top: '48%', left: '60%', delay: 2.1,  bg: '#3A7BC8', shadow: fireworkBoxShadow('#3A7BC8', '#F4ECD8') },
];

function FireworksLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10" aria-hidden="true">
      {FIREWORKS.map((fw, i) => (
        <span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full animate-firework-burst"
          style={{
            top: fw.top,
            left: fw.left,
            background: fw.bg,
            boxShadow: fw.shadow,
            animationDelay: `${fw.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── FALLING PAPER CONFETTI ──────────────────────────────────────────── */

const PAPER_COLORS = ['#D4A24C', '#C44150', 'var(--confetti-cream)', '#E8B968', '#3A7BC8'];
const PAPER_SHAPES = [
  { w: 4,  h: 18, br: '1px' },   // strip
  { w: 10, h: 10, br: '0px' },   // square
  { w: 8,  h: 8,  br: '50%' },   // circle
];

function ConfettiLayer() {
  // Generate 25 pieces with deterministic-but-varied props
  const pieces = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const left = (i * 4 + (i % 7) * 13) % 100; // spread across viewport width
      const color = PAPER_COLORS[i % PAPER_COLORS.length];
      const shape = PAPER_SHAPES[i % PAPER_SHAPES.length];
      const delay = (i * 0.27) % 5;
      const drift = (i % 2 === 0 ? 1 : -1) * (16 + (i * 7) % 30);
      const duration = 4.5 + (i % 4) * 0.5;
      return { i, left, color, shape, delay, drift, duration };
    });
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="absolute animate-paper-fall"
          style={{
            top: '-30px',
            left: `${p.left}%`,
            width: `${p.shape.w}px`,
            height: `${p.shape.h}px`,
            background: p.color,
            borderRadius: p.shape.br,
            opacity: 0.95,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `translateX(0)`,
            // CSS variable consumed by paper-fall keyframe end translateX
            // (Falls back to default drift in keyframe.)
            ['--drift']: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── STATIC PARTICLES (subtle background sparkle) ────────────────────── */

const PARTICLES = [
  { top: '8%',  left: '12%', size: 18, op: 0.22, glyph: '✦' },
  { top: '14%', left: '78%', size: 10, op: 0.14, glyph: '◇' },
  { top: '22%', left: '55%', size: 8,  op: 0.16, glyph: '·' },
  { top: '30%', left: '5%',  size: 14, op: 0.20, glyph: '❖' },
  { top: '35%', left: '88%', size: 9,  op: 0.18, glyph: '✦' },
  { top: '52%', left: '42%', size: 22, op: 0.10, glyph: '•', color: 'var(--color-cream)' },
  { top: '60%', left: '8%',  size: 11, op: 0.18, glyph: '✦' },
  { top: '68%', left: '92%', size: 14, op: 0.16, glyph: '◇' },
  { top: '78%', left: '38%', size: 10, op: 0.20, glyph: '❖' },
  { top: '86%', left: '70%', size: 16, op: 0.14, glyph: '✦' },
];

function ParticlesLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute select-none"
          style={{
            top: p.top,
            left: p.left,
            fontSize: `${p.size}px`,
            opacity: p.op,
            color: p.color || 'var(--color-gold)',
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────── */

export default function ResultsScreen() {
  const { isAuthenticated } = useAuth();
  const { state, reset } = useGame();

  // Use real game state if a game was played; otherwise show demo for direct URL hits
  const teams = state.gameOver || state.stats.questionsAnswered > 0 ? state.teams : DEMO_TEAMS;
  const stats = state.gameOver || state.stats.questionsAnswered > 0 ? state.stats : DEMO_STATS;

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0];
  const runnerUp = sortedTeams[1];
  const isTie = winner.score === runnerUp.score;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background ambient particles (lowest layer) */}
      <ParticlesLayer />
      {/* Animated fireworks (middle) */}
      <FireworksLayer />
      {/* Falling paper confetti (top) */}
      <ConfettiLayer />

      {/* Content */}
      <div className="relative z-30 max-w-3xl mx-auto px-5 py-12 md:py-16 text-center">
        {/* Brand */}
        <p className="font-ar-body text-gold/60 text-base">أم الهيمان</p>
        <p className="font-en-display italic text-gold-light/70 text-sm mt-1" lang="en">
          Umm Al Hayman City
        </p>

        {/* Wreath */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.2 }}
          className="mt-8 mb-3 text-4xl md:text-5xl flex items-center justify-center gap-3 select-none"
        >
          <span>🌿</span>
          <span className="text-5xl md:text-7xl drop-shadow">🏆</span>
          <span className="scale-x-[-1] inline-block">🌿</span>
        </motion.div>

        {/* Winner banner */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="font-ar-body font-bold text-3xl md:text-5xl text-gold drop-shadow"
          style={{ textShadow: 'var(--glow-text-gold-xl)' }}
        >
          {isTie ? 'تعادل!' : `${winner.name} فاز`}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="font-en-display italic text-gold-light/85 text-lg md:text-2xl mt-1"
          lang="en"
        >
          {isTie ? 'A Tie!' : `${winner.nameEn} Wins!`}
        </motion.p>

        {/* Cards row */}
        <div className="mt-10 flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-5">
          {/* Winner card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.7 }}
            className="relative rounded-2xl px-8 py-7 flex-1 max-w-sm mx-auto md:mx-0"
            style={{
              background: 'var(--card-gold-winner-grad)',
              border: '2px solid var(--color-gold)',
              boxShadow: 'var(--card-gold-winner-shadow)',
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl leading-none">{winner.emoji}</span>
              <div className="text-start">
                <div className="font-ar-body font-bold text-cream text-base leading-tight">
                  {winner.name}
                </div>
                <div className="font-en-body text-cream-60 text-xs leading-tight" lang="en">
                  {winner.nameEn}
                </div>
              </div>
            </div>
            <div className="font-ar-ui text-xs text-gold-light tracking-wider uppercase mt-2">
              النتيجة النهائية · <span lang="en">Final Score</span>
            </div>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 1.0 }}
              className="font-en-display font-bold text-gold leading-none mt-1"
              style={{
                fontSize: '88px',
                textShadow: 'var(--glow-text-gold-xxl)',
              }}
            >
              {winner.score}
            </motion.div>
            {/* Stats breakdown line */}
            <div
              className="mt-3 font-en-body text-cream-60 text-xs tracking-wide"
              lang="en"
            >
              {stats.questionsAnswered} answered · {stats.lifelinesUsed} lifelines · longest streak: {stats.longestStreak}
            </div>
          </motion.div>

          {/* Runner-up card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 0.88, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.85 }}
            className="relative rounded-xl px-6 py-5 flex-1 max-w-sm mx-auto md:mx-0 self-center"
            style={{
              background: 'var(--award-team-bg)',
              border: `1px solid ${runnerUp.color}aa`,
              filter: 'saturate(0.55) opacity(0.78)',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl leading-none">{runnerUp.emoji}</span>
              <div className="text-start">
                <div className="font-ar-body font-bold text-cream text-sm leading-tight">
                  {runnerUp.name}
                </div>
                <div className="font-en-body text-cream-60 text-xs leading-tight" lang="en">
                  {runnerUp.nameEn}
                </div>
              </div>
            </div>
            <div className="font-ar-ui text-xs text-cream-45 tracking-wider uppercase mt-2">
              النتيجة · <span lang="en">Score</span>
            </div>
            <div
              className="font-en-display font-bold leading-none mt-1"
              style={{
                fontSize: '52px',
                color: runnerUp.color,
              }}
            >
              {runnerUp.score}
            </div>
          </motion.div>
        </div>

        {/* Score gap line */}
        {!isTie && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.4 }}
            className="mt-8 font-en-body text-cream-45 text-sm"
            lang="en"
          >
            Margin of victory: <span className="text-gold-light">+{winner.score - runnerUp.score}</span>
          </motion.p>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <Link
            to="/setup"
            onClick={() => reset()}
            className="btn-gold px-6 py-3 rounded-xl text-sm flex items-center gap-2"
          >
            <RotateCcw size={16} />
            <span className="flex flex-col items-center gap-0">
              <span>إعادة اللعب</span>
              <span className="font-en-body text-xs font-medium opacity-80" lang="en">
                Play Again
              </span>
            </span>
          </Link>
          <Link
            to="/setup"
            onClick={() => reset()}
            className="btn-outline px-5 py-3 rounded-xl text-sm flex items-center gap-2"
          >
            <Settings size={14} />
            <span className="flex flex-col items-center gap-0">
              <span>العودة للإعداد</span>
              <span className="font-en-body text-xs opacity-80" lang="en">
                Back to Setup
              </span>
            </span>
          </Link>
          <Link
            to="/"
            className="btn-outline px-5 py-3 rounded-xl text-sm flex items-center gap-2"
          >
            <Home size={14} />
            <span className="flex flex-col items-center gap-0">
              <span>الرئيسية</span>
              <span className="font-en-body text-xs opacity-80" lang="en">
                Home
              </span>
            </span>
          </Link>
          {isAuthenticated && (
            <button
              type="button"
              disabled
              title="Saving game results requires Supabase setup"
              className="btn-outline px-5 py-3 rounded-xl text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Save size={14} />
              <span className="flex flex-col items-center gap-0">
                <span>حفظ النتيجة</span>
                <span className="font-en-body text-xs opacity-80" lang="en">
                  Save Score (coming soon)
                </span>
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
