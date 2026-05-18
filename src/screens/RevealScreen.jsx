import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES, ICON_MAP, pickRandomSix, getCategoryBySlug } from '../data/categories';
import { useGame } from '../contexts/GameContext';
import { usePrefetchQuestions } from '../lib/queries';
import { CATEGORIES_PER_GAME } from '../lib/gameDefaults';

const SETTLE_INTERVAL_MS = 550; // time between each card settling
const POST_SETTLE_PAUSE_MS = 1400; // hold after the 6th card settles before auto-advance
const SPIN_POOL = CATEGORIES; // pool of icons/colors to flicker through during spin

function SpinningCard() {
  // Visual: rapidly cycle through different categories' accent colors + icons
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  const blurred = SPIN_POOL[tick % SPIN_POOL.length];
  const Icon = ICON_MAP[blurred.icon];

  return (
    <div
      className="accent-card relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center"
      style={{ background: blurred.accent }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/20 to-ink/40" />
      {/* Vertical motion-blur scanlines */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, var(--spinning-scanline) 0 2px, transparent 2px 6px)',
        }}
      />
      <div className="relative z-10 opacity-50 blur-[2px] scale-90">
        {Icon && <Icon size={36} className="text-cream" strokeWidth={1.5} />}
      </div>
    </div>
  );
}

function SettledCard({ category, isLatest }) {
  const Icon = ICON_MAP[category.icon];

  return (
    <motion.div
      initial={{ scale: 1.18, y: -6, opacity: 0 }}
      animate={{ scale: isLatest ? 1.06 : 1, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className="accent-card relative w-full h-full rounded-lg overflow-hidden flex flex-col items-center justify-end px-1.5 py-2 gap-0.5"
      style={{
        background: `linear-gradient(155deg, ${category.accent} 0%, ${category.accent}cc 60%, ${category.accent}88 100%)`,
        boxShadow: isLatest ? 'var(--settled-card-shadow-latest)' : 'var(--settled-card-shadow)',
      }}
    >
      {/* Category image fills the card; accent gradient overlay on top keeps
          the accent identity and adds a darker bottom band so text reads. */}
      {category.imageUrl ? (
        <>
          <img
            src={category.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 mix-blend-multiply opacity-40"
            style={{ background: category.accent }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.32) 60%, transparent 100%)',
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        Icon && <Icon size={26} className="text-cream drop-shadow" strokeWidth={1.6} />
      )}
      <div className="relative font-ar-body font-bold text-cream text-[13px] leading-tight text-center drop-shadow">
        {category.ar}
      </div>
      <div
        className="relative font-en-body text-cream-60 text-[9px] leading-tight tracking-wide drop-shadow"
        lang="en"
      >
        {category.en}
      </div>
    </motion.div>
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
  usePrefetchQuestions(categories);

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
      className="fixed inset-0 bg-ink flex flex-col items-center justify-center z-50 cursor-pointer select-none"
      onClick={skip}
      role="button"
      aria-label="Skip reveal"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') skip();
      }}
    >
      {/* Caption */}
      <AnimatePresence mode="wait">
        {!allSettled ? (
          <motion.div
            key="get-ready"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 text-center"
          >
            <div className="font-ar-body font-bold text-3xl md:text-5xl text-gold-light tracking-wide">
              إستعدوا
            </div>
            <div className="font-en-display italic text-gold/70 text-lg md:text-2xl mt-1" lang="en">
              Get Ready
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="here-they-are"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
            className="mb-8 text-center"
          >
            <div className="font-ar-body font-bold text-3xl md:text-5xl text-gold tracking-wide drop-shadow">
              ✦ هذه فئاتكم ✦
            </div>
            <div className="font-en-display italic text-gold-light/80 text-lg md:text-2xl mt-1" lang="en">
              Your Categories
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brushed-brass frame around the strip */}
      <div
        className="relative px-4 py-5 md:px-6 md:py-7 rounded-2xl"
        style={{
          background: 'var(--frame-brass-bg)',
          border: '2px solid var(--color-gold-dark)',
          boxShadow: 'var(--frame-brass-shadow)',
        }}
      >
        {/* Horizontal gold "winner line" across the middle */}
        <div
          className="absolute start-2 end-2 top-1/2 -translate-y-1/2 h-px pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, rgba(212,162,76,0.7) 20%, rgba(232,185,104,0.95) 50%, rgba(212,162,76,0.7) 80%, transparent 100%)',
            boxShadow: '0 0 12px rgba(212,162,76,0.7)',
          }}
        />

        {/* The strip of 6 cards */}
        <div className="grid grid-cols-6 gap-2 md:gap-3">
          {categories.map((cat, i) => {
            const isSettled = i < settledCount;
            const isLatest = !allSettled && i === settledCount - 1;
            return (
              <div
                key={cat.slug}
                className="relative w-[58px] sm:w-[80px] md:w-[110px] h-[80px] sm:h-[110px] md:h-[140px]"
              >
                {isSettled ? (
                  <SettledCard category={cat} isLatest={isLatest} />
                ) : (
                  <SpinningCard />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Skip hint */}
      <div className="mt-8 flex flex-col items-center gap-1">
        <p className="font-ar-ui text-cream-45 text-sm md:text-base">
          {allSettled ? 'يبدأ خلال لحظات...' : 'انقر للتخطي'}
        </p>
        <p className="font-en-body text-cream-45 text-sm" lang="en">
          {allSettled ? 'Starting soon...' : 'Tap anywhere to skip'}
        </p>
      </div>

      {/* Subtle progress indicator (6 dots at bottom) */}
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i < settledCount ? 'bg-gold scale-110' : 'bg-cream-30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
