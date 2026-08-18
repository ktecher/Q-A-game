import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, pickRandomSix, getCategoryBySlug } from '../data/categories';
import { useGame } from '../contexts/GameContext';
import { usePrefetchQuestions } from '../lib/queries';
import { CATEGORIES_PER_GAME } from '../lib/gameDefaults';

const SETTLE_INTERVAL_MS = 550; // time between each card settling
const POST_SETTLE_PAUSE_MS = 1400; // hold after the 6th card settles before auto-advance
const SPIN_POOL = CATEGORIES; // pool of accents to flicker through during spin

// Card art treatment shared by the spinning and settled states, so a reel
// column doesn't change shape as it locks.
const CARD_FRAME = {
  position: 'relative',
  overflow: 'hidden',
  border: '4px solid var(--gold)',
  boxShadow: 'inset 0 0 0 4px var(--outline)',
};

function SpinningCard() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  const blurred = SPIN_POOL[tick % SPIN_POOL.length];

  return (
    <div className="w-full h-full" style={{ ...CARD_FRAME, background: blurred.accent }}>
      {blurred.imageUrl && (
        <img
          src={blurred.imageUrl}
          alt=""
          className="pixel-art absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0 mix-blend-multiply opacity-50"
        style={{ background: blurred.accent }}
        aria-hidden="true"
      />
      {/* Vertical smear — the reel is still turning. */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: 'repeating-linear-gradient(var(--scan) 0 3px, transparent 3px 8px)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

function SettledCard({ category }) {
  return (
    <div className="w-full h-full" style={{ ...CARD_FRAME, background: category.accent }}>
      {category.imageUrl && (
        <img
          src={category.imageUrl}
          alt=""
          loading="lazy"
          className="pixel-art absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0 mix-blend-multiply opacity-50"
        style={{ background: category.accent }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'repeating-linear-gradient(var(--dither) 0 3px, transparent 3px 6px)' }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 text-center"
        style={{ background: 'var(--strip)', borderTop: '4px solid var(--gold)', padding: '6px 4px' }}
      >
        <div
          className="font-ar-body font-bold leading-none truncate"
          style={{ fontSize: 24, color: 'var(--gold-ink)' }}
        >
          {category.ar}
        </div>
        <div
          className="font-en-body leading-none truncate uppercase"
          style={{ fontSize: 7, color: 'var(--muted)', marginTop: 4 }}
          lang="en"
        >
          {category.en}
        </div>
      </div>
    </div>
  );
}

export default function RevealScreen() {
  const navigate = useNavigate();
  const { state } = useGame();
  // Prefer game-state categories (from Setup); fall back to demo random pick
  // when /reveal is hit directly via URL.
  const categories = useMemo(() => {
    if (state.started && state.categories.length === CATEGORIES_PER_GAME) return state.categories;
    return pickRandomSix().map(getCategoryBySlug).filter(Boolean);
  }, [state.started, state.categories]);

  // Kick off the bulk-fetch of all questions for the chosen categories now,
  // during the ~4-second reveal animation. By the time BoardScreen mounts
  // and the user picks a cell, the TanStack cache is hot — no stub flash.
  // gameSeed makes the per-cell pick identical to BoardScreen's prefetch.
  usePrefetchQuestions(categories, state.gameSeed);

  const [settledCount, setSettledCount] = useState(0);
  const skippedRef = useRef(false);

  // Stagger settle: every SETTLE_INTERVAL_MS, increment until all 6 are settled
  useEffect(() => {
    if (skippedRef.current) return;
    if (settledCount >= CATEGORIES_PER_GAME) return;
    const id = setTimeout(() => setSettledCount((n) => n + 1), SETTLE_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [settledCount]);

  // Once all 6 are settled, hold briefly then auto-advance to /play
  useEffect(() => {
    if (settledCount < CATEGORIES_PER_GAME) return;
    const id = setTimeout(() => navigate('/play'), POST_SETTLE_PAUSE_MS);
    return () => clearTimeout(id);
  }, [settledCount, navigate]);

  const skip = () => {
    if (settledCount >= CATEGORIES_PER_GAME) return;
    skippedRef.current = true;
    setSettledCount(CATEGORIES_PER_GAME);
  };

  const allSettled = settledCount >= CATEGORIES_PER_GAME;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-40 cursor-pointer select-none px-4"
      style={{ background: 'var(--bg)', gap: 26 }}
      onClick={skip}
      role="button"
      aria-label="Skip reveal"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') skip();
      }}
    >
      <div className="text-center">
        <div
          className={`font-ar-body font-extrabold leading-none ${allSettled ? 'animate-flash' : ''}`}
          style={{
            fontSize: 'clamp(40px, 7vw, 84px)',
            color: 'var(--gold-ink)',
            textShadow: '6px 6px 0 var(--gold-sh)',
          }}
        >
          {allSettled ? 'هذه فئاتكم' : 'إستعدوا'}
        </div>
        <div
          className="font-en-body leading-none"
          style={{ fontSize: 14, color: 'var(--text)', letterSpacing: '0.2em', marginTop: 14 }}
          lang="en"
        >
          {allSettled ? 'YOUR STAGES' : 'GET READY'}
        </div>
      </div>

      {/* Reel housing */}
      <div
        className="relative"
        style={{
          padding: 26,
          background: 'var(--panel)',
          border: '6px solid var(--gold-d)',
          boxShadow: '0 12px 0 var(--shadow), inset 0 0 0 4px var(--outline)',
        }}
      >
        {/* Dashed gold payline */}
        <div
          className="absolute pointer-events-none"
          style={{
            insetInline: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            height: 6,
            background: 'repeating-linear-gradient(90deg, var(--gold) 0 12px, transparent 12px 24px)',
          }}
          aria-hidden="true"
        />

        <div className="grid grid-cols-6" style={{ gap: 14 }}>
          {categories.map((cat, i) => (
            <div
              key={cat.slug}
              className="w-[46px] sm:w-[86px] md:w-[140px] h-[60px] sm:h-[112px] md:h-[180px]"
            >
              {i < settledCount ? <SettledCard category={cat} /> : <SpinningCard />}
            </div>
          ))}
        </div>
      </div>

      {/* Reel-stopped indicators */}
      <div className="flex" style={{ gap: 8 }} aria-hidden="true">
        {Array.from({ length: CATEGORIES_PER_GAME }, (_, i) => (
          <span
            key={i}
            style={{ width: 14, height: 14, background: i < settledCount ? 'var(--gold)' : 'var(--line)' }}
          />
        ))}
      </div>

      <div
        className="font-en-body leading-none animate-blink text-center"
        style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '0.14em' }}
        lang="en"
      >
        {allSettled ? 'STARTING…' : 'STARTING… PRESS ANY KEY TO SKIP'}
      </div>
    </div>
  );
}
