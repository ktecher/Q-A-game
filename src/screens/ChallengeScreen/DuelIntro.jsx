import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * SwordIntro — cinematic opener for the challenge round.
 *
 * Two saif-style scimitars fly in from off-screen left/right, cross blades at
 * the screen center (X formation, tips pointing up), recoil, cross again,
 * then a cartoon explosion fires from the impact point.
 *
 * Total duration: 2.0s. Auto-skip if prefers-reduced-motion. Click to skip
 * after a 400ms arming window. Calls onComplete() when done.
 */

/* ─── Scimitar SVG (curved blade, gold ornate hilt, brown grip) ────── */

function Scimitar({ side = 'left' }) {
  const flip = side === 'right' ? 'scale(-1, 1) translate(-380, 0)' : undefined;
  return (
    <svg
      viewBox="0 0 380 130"
      width={380}
      height={130}
      style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 5px 12px rgba(0,0,0,0.65))' }}
    >
      <g transform={flip}>
        {/* Blade */}
        <path d="M 115 55 C 200 28, 305 18, 360 32 L 372 38 L 360 46 C 305 56, 200 70, 115 78 Z" fill="#EAE6DC" stroke="#6F6A62" strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M 135 58 C 215 36, 300 30, 348 38" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        <path d="M 140 64 C 220 50, 305 44, 350 47" fill="none" stroke="#B7B0A6" strokeWidth={2} opacity={0.55} />
        <path d="M 145 73 C 220 65, 300 58, 345 56" fill="none" stroke="#9C958A" strokeWidth={1.5} opacity={0.45} />
        {/* Grip */}
        <path d="M 38 65 C 42 55, 70 55, 80 58 L 84 102 C 72 106, 42 106, 38 96 Z" fill="#7A3220" stroke="#3F1A0E" strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M 48 64 C 58 58, 72 58, 78 62" fill="none" stroke="#A65441" strokeWidth={2.2} strokeLinecap="round" opacity={0.9} />
        <path d="M 48 96 C 60 100, 74 100, 78 96" fill="none" stroke="#3F1A0E" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
        {/* Crossguard */}
        <path d="M 100 35 C 78 38, 78 100, 100 110 L 122 105 C 116 78, 116 60, 122 38 Z" fill="#FFD451" stroke="#7A4A12" strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M 106 42 C 96 50, 96 92, 106 102" fill="none" stroke="#FFFAEC" strokeWidth={1.6} opacity={0.7} />
        <circle cx={100} cy={33} r={8} fill="#FFD451" stroke="#7A4A12" strokeWidth={1.6} />
        <circle cx={98} cy={31} r={3} fill="#FFFAEC" opacity={0.85} />
        <circle cx={100} cy={112} r={8} fill="#FFD451" stroke="#7A4A12" strokeWidth={1.6} />
        <circle cx={98} cy={110} r={3} fill="#FFFAEC" opacity={0.85} />
        {/* Pommel (curl) */}
        <path d="M 36 82 C 22 94, 12 110, 8 118 L 22 116 C 32 110, 38 100, 40 88 Z" fill="#FFD451" stroke="#7A4A12" strokeWidth={1.6} strokeLinejoin="round" />
        <circle cx={30} cy={72} r={14} fill="#FFD451" stroke="#7A4A12" strokeWidth={1.8} />
        <circle cx={26} cy={68} r={6} fill="#FFFAEC" opacity={0.85} />
        <circle cx={24} cy={66} r={2.5} fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/* ─── Cartoon explosion stages (spark → starburst → fireball → puff ring) ─ */

const SparkStar = () => (
  <svg viewBox="0 0 100 100" width="100%" height="100%">
    <polygon points="50,8 56,44 92,50 56,56 50,92 44,56 8,50 44,44" fill="#FFFAEC" stroke="#FFD451" strokeWidth={3} strokeLinejoin="round" />
    <circle cx={50} cy={50} r={10} fill="#FFFFFF" />
  </svg>
);

const BigStarburst = () => (
  <svg viewBox="0 0 200 200" width="100%" height="100%">
    <polygon points="100,4 113,78 168,32 124,90 196,100 124,110 168,168 113,122 100,196 87,122 32,168 76,110 4,100 76,90 32,32 87,78" fill="#FFEC8B" stroke="#FFC93C" strokeWidth={4} strokeLinejoin="round" />
    <circle cx={100} cy={100} r={48} fill="#FFEC8B" />
    <circle cx={100} cy={100} r={30} fill="#FFFAEC" />
    <circle cx={100} cy={100} r={14} fill="#FFFFFF" />
  </svg>
);

const FireBall = () => {
  const bumps = Array.from({ length: 9 }, (_, i) => {
    const angle = (i / 9) * Math.PI * 2;
    return { cx: 100 + Math.cos(angle) * 58, cy: 100 + Math.sin(angle) * 58, r: 38 + (i % 2 === 0 ? 6 : 0) };
  });
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      {bumps.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="#FF7A1F" />
      ))}
      <circle cx={100} cy={100} r={70} fill="#FF7A1F" />
      <circle cx={100} cy={100} r={50} fill="#FFC93C" />
      <ellipse cx={115} cy={110} rx={22} ry={14} fill="#E54222" opacity={0.55} transform="rotate(-25 115 110)" />
      <circle cx={100} cy={100} r={30} fill="#FFEC8B" />
      <circle cx={98} cy={96} r={16} fill="#FFFAEC" />
      <circle cx={96} cy={94} r={8} fill="#FFFFFF" />
    </svg>
  );
};

const CloudPuff = () => (
  <svg viewBox="0 0 60 60" width="100%" height="100%">
    <circle cx={22} cy={32} r={14} fill="#E89B3E" />
    <circle cx={38} cy={32} r={13} fill="#E89B3E" />
    <circle cx={30} cy={22} r={12} fill="#E89B3E" />
    <circle cx={22} cy={28} r={12} fill="#FFD899" />
    <circle cx={38} cy={28} r={11} fill="#FFD899" />
    <circle cx={30} cy={18} r={10} fill="#FFD899" />
    <circle cx={28} cy={22} r={3} fill="#FFFFFF" opacity={0.6} />
  </svg>
);

function CartoonExplosion({ delay }) {
  const puffs = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + 0.2;
    const dist = 220 + ((i * 7) % 5) * 12;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      size: 70 + ((i * 3) % 4) * 14,
      offset: (i % 5) * 0.025,
    };
  });
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 0.2], opacity: [0, 1, 0] }}
        transition={{ duration: 0.18, delay, ease: 'easeOut' }}
        style={{ position: 'absolute', left: -50, top: -50, width: 100, height: 100, zIndex: 7 }}
      >
        <SparkStar />
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: 0 }}
        animate={{ scale: [0, 1.1, 1.5], opacity: [0, 1, 0], rotate: [0, 28] }}
        transition={{ duration: 0.42, delay: delay + 0.06, ease: 'easeOut' }}
        style={{ position: 'absolute', left: -180, top: -180, width: 360, height: 360, zIndex: 6 }}
      >
        <BigStarburst />
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.1, 1.6, 1.9], opacity: [0, 1, 0.9, 0] }}
        transition={{ duration: 0.55, delay: delay + 0.10, ease: 'easeOut' }}
        style={{ position: 'absolute', left: -220, top: -220, width: 440, height: 440, zIndex: 5 }}
      >
        <FireBall />
      </motion.div>
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
          animate={{
            x: [0, p.x * 0.6, p.x],
            y: [0, p.y * 0.6, p.y],
            scale: [0, 1, 0.7],
            opacity: [0, 1, 0],
            rotate: [0, i % 2 === 0 ? 30 : -30],
          }}
          transition={{ duration: 0.7, delay: delay + 0.22 + p.offset, ease: 'easeOut' }}
          style={{ position: 'absolute', left: -p.size / 2, top: -p.size / 2, width: p.size, height: p.size, zIndex: 4 }}
        >
          <CloudPuff />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Spark burst at blade-meeting point ─────────────────────────── */

function SparkBurst({ count, delay, duration = 0.4, radius = 130, color = '#FFD451' }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + i * 0.17;
    const dist = radius * (0.65 + (0.35 * ((i * 7) % 10)) / 10);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 5 + ((i * 3) % 5) };
  });
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1, 0.2] }}
          transition={{ duration, delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${p.size * 3}px ${color}`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── SwordIntro main ────────────────────────────────────────────── */

export default function SwordIntro({ onComplete, duration = 2.0 }) {
  const reducedMotion = useReducedMotion();
  const [skipArmed, setSkipArmed] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
    const t1 = setTimeout(() => setSkipArmed(true), 400);
    const t2 = setTimeout(() => onComplete(), duration * 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reducedMotion, onComplete, duration]);

  if (reducedMotion) return null;

  // Keyframe schedule (normalized to total duration).
  // Beats:
  //   0.00 OFFSCREEN  — swords waiting at the screen edges
  //   0.08 ENTRY      — fly in toward center
  //   0.56 CLASH 1    — X-cross at center, sparks
  //   0.72 RECOIL     — push apart
  //   0.96 RAISE      — re-orient for counter
  //   1.10 CLASH 2    — X-cross again, bigger sparks
  //   1.13 BOOM       — explosion fires from impact point
  //   2.00 onComplete — Accept dialog mounts
  const times = [0, 0.04, 0.2, 0.28, 0.36, 0.48, 0.55, 0.59, 1.0];

  const leftSaif = {
    initial: { x: '-90vw', y: '12vh', rotate: 10, opacity: 0 },
    animate: {
      x:       ['-90vw', '-90vw', '-30vw', '0vw',  '-15vw', '-22vw', '0vw',  '0vw',  '0vw'],
      y:       ['12vh',  '12vh',  '6vh',   '0vh',  '8vh',   '15vh',  '0vh',  '0vh',  '0vh'],
      rotate:  [10,      10,      -18,     -45,    -22,     -2,      -45,    -45,    -45],
      opacity: [0,       1,       1,       1,      1,       1,       1,      0,      0],
    },
    transition: { duration, times, ease: 'easeInOut' },
  };

  const rightSaif = {
    initial: { x: '90vw', y: '12vh', rotate: -10, opacity: 0 },
    animate: {
      x:       ['90vw',  '90vw',  '30vw',  '0vw',  '15vw',  '22vw',  '0vw',  '0vw',  '0vw'],
      y:       ['12vh',  '12vh',  '6vh',   '0vh',  '8vh',   '15vh',  '0vh',  '0vh',  '0vh'],
      rotate:  [-10,     -10,     18,      45,     22,      2,       45,     45,     45],
      opacity: [0,       1,       1,       1,      1,       1,       1,      0,      0],
    },
    transition: { duration, times, ease: 'easeInOut' },
  };

  const stageShake = {
    animate: { x: [0, 0, -3, 3, -2, 2, 0, 0, -9, 9, -7, 7, -3, 0] },
    transition: {
      duration,
      times: [0, 0.27, 0.285, 0.30, 0.315, 0.33, 0.36, 0.54, 0.555, 0.57, 0.585, 0.60, 0.62, 0.66],
      ease: 'easeOut',
    },
  };

  const clash1Delay = 0.56;
  const clash2Delay = 1.10;
  const boomDelay   = 1.13;

  const flash1 = {
    initial: { opacity: 0 },
    animate: { opacity: [0, 0.22, 0] },
    transition: { duration: 0.16, delay: clash1Delay, ease: 'easeOut' },
  };
  const flash2 = {
    initial: { opacity: 0 },
    animate: { opacity: [0, 0.48, 0] },
    transition: { duration: 0.22, delay: clash2Delay, ease: 'easeOut' },
  };

  return (
    <motion.div
      onClick={skipArmed ? onComplete : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--color-ink-80)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: skipArmed ? 'pointer' : 'default',
      }}
    >
      <motion.div
        {...stageShake}
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          {...leftSaif}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            translateX: '-50%',
            translateY: '-50%',
            transformOrigin: 'center center',
            zIndex: 2,
          }}
        >
          <Scimitar side="left" />
        </motion.div>

        <motion.div
          {...rightSaif}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            translateX: '-50%',
            translateY: '-50%',
            transformOrigin: 'center center',
            zIndex: 3,
          }}
        >
          <Scimitar side="right" />
        </motion.div>

        <SparkBurst count={12} delay={clash1Delay} radius={110} />
        <SparkBurst count={20} delay={clash2Delay} radius={180} />

        <motion.div {...flash1} style={{ position: 'absolute', inset: 0, background: 'white', pointerEvents: 'none' }} />
        <motion.div {...flash2} style={{ position: 'absolute', inset: 0, background: 'white', pointerEvents: 'none' }} />

        <CartoonExplosion delay={boomDelay} />
      </motion.div>
    </motion.div>
  );
}
