import { useState, useEffect } from 'react';

/**
 * DuelIntro — the 5-beat arcade opener before the challenge offer.
 *
 *   1 hazard shutters + alert       ·  2 team plates slam (+shake)
 *   3 VS stamp + shockwaves + sparks (+shake)
 *   4 title card + confetti         ·  5 pixel-block wipe into AcceptStage
 *
 * Every beat is a CSS delay on a steps() animation — no per-frame React state,
 * so the whole sequence is declarative and costs one render.
 *
 * Contract kept from the previous version: click-to-skip after a 400ms arming
 * window, and prefers-reduced-motion renders nothing and completes immediately.
 *
 * Two callbacks, because the wipe has to hand over mid-animation. The block
 * grid reaches full coverage at 2720ms and the first blocks start clearing at
 * 2848ms; `onCover` fires inside that window so AcceptStage mounts *underneath*
 * while the screen is solid, and the blocks then clear to reveal it. Firing a
 * single callback at `duration` (as the handoff has it) would clear the blocks
 * back to this intro — plates, VS and title still on screen — and then hard-cut
 * to AcceptStage, which is the one thing the wipe exists to prevent.
 *
 * The `ci-*` keyframes live in src/index.css (see the note there on why they
 * can't be Tailwind config entries). `blink` and `flash` are the keyframes
 * Tailwind already emits for its animate-blink / animate-flash utilities —
 * reused here by name because these beats need their own durations and delays.
 */

const SPARK = ['var(--gold)', 'var(--text)', 'var(--purple)', 'var(--red)', 'var(--blue)'];

const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + 0.3;
  const r = 150 + (i % 4) * 70;
  return {
    size: i % 3 === 0 ? 18 : 12,
    color: SPARK[i % SPARK.length],
    dx: Math.round(Math.cos(a) * r),
    dy: Math.round(Math.sin(a) * r * 0.7),
    delay: 680 + (i % 4) * 40,
  };
});

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: i * 5.4 + (i % 3) * 2,
  size: i % 4 === 0 ? 14 : 8,
  color: SPARK[(i + 2) % SPARK.length],
  dur: 2600 + (i % 5) * 500,
  delay: 1400 + (i % 7) * 180,
}));

// 8 × 5 blocks, each 12.5% × 20%, so the grid covers the viewport exactly.
const WIPE = Array.from({ length: 40 }, (_, i) => {
  const row = Math.floor(i / 8);
  const col = i % 8;
  return { top: row * 20, left: col * 12.5, delay: 2380 + (col + row) * 26 + (row % 2) * 14 };
});

const STRIPES = 'repeating-linear-gradient(135deg, var(--gold) 0 14px, var(--outline) 14px 28px)';

// Inside the 2720-2848ms window where all 40 blocks are opaque.
const COVER_MS = 2760;

export default function DuelIntro({
  onCover,
  onComplete,
  duration = 3.5,
  variant = 'naming',
  teams = [],
  activeTeamIdx = 0,
  points,
}) {
  const [skipArmed, setSkipArmed] = useState(false);

  // Matching the CSS media query directly keeps this in step with the global
  // reduced-motion rule in index.css.
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) {
      onCover();
      onComplete();
      return undefined;
    }
    const timers = [
      setTimeout(() => setSkipArmed(true), 400),
      setTimeout(() => onCover(), COVER_MS),
      setTimeout(() => onComplete(), duration * 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, onCover, onComplete, duration]);

  // A skip has to do both jobs at once — there is no cover to hand over behind.
  const skip = () => {
    onCover();
    onComplete();
  };

  if (reducedMotion) return null;

  // The team that tripped the cell reads first. Under RTL that DOM order puts
  // it on the right, which is intended.
  const teamA = teams[activeTeamIdx];
  const teamB = teams[1 - activeTeamIdx];
  const modeLabel = variant === 'sketch' ? 'SKETCH DUEL' : 'NAMING DUEL';

  return (
    <div
      onClick={skipArmed ? skip : undefined}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background: 'var(--bg)',
        cursor: skipArmed ? 'pointer' : 'default',
        backgroundImage:
          'linear-gradient(var(--grid-alt) 2px, transparent 2px), linear-gradient(90deg, var(--grid-alt) 2px, transparent 2px)',
        backgroundSize: '32px 32px, 32px 32px',
      }}
    >
      {/* Everything inside jolts twice — on the plate slam and the VS landing. */}
      <div className="absolute inset-0" style={{ animation: 'ci-shake 2500ms steps(1,end) both' }}>
        {/* 1 · hazard shutters */}
        <Shutter edge="top" />
        <Shutter edge="bottom" />

        {/* 1b · alert */}
        <div className="absolute inset-x-0 text-center" style={{ top: 64 }}>
          <span
            lang="en"
            className="font-en-body leading-none"
            style={{
              fontSize: 11,
              color: 'var(--red-ink)',
              letterSpacing: '0.28em',
              animation: 'blink 380ms steps(1) infinite',
            }}
          >
            ! CHALLENGE DETECTED !
          </span>
        </div>

        {/* 2 · team plates — butted together, no gap */}
        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: 44, bottom: 44 }}
        >
          <TeamPlate team={teamA} label="PLAYER 1" from="-130vw" fill="var(--blue-p)" edge="var(--blue)" />
          <TeamPlate team={teamB} label="PLAYER 2" from="130vw" fill="var(--red-p)" edge="var(--red)" />
        </div>

        {/* 3 · VS stamp, shockwaves, sparks */}
        <div
          className="absolute flex items-center justify-center"
          style={{ top: '50%', left: '50%', width: 0, height: 0 }}
        >
          <span
            className="absolute"
            style={{
              width: 180,
              height: 180,
              border: '8px solid var(--gold)',
              animation: 'ci-shock 420ms steps(5,end) both 700ms',
            }}
            aria-hidden="true"
          />
          <span
            className="absolute"
            style={{
              width: 180,
              height: 180,
              border: '6px solid var(--purple)',
              animation: 'ci-shock 520ms steps(6,end) both 780ms',
            }}
            aria-hidden="true"
          />
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="absolute"
              style={{
                width: s.size,
                height: s.size,
                background: s.color,
                '--dx': `${s.dx}px`,
                '--dy': `${s.dy}px`,
                animation: `ci-spark 460ms steps(6,end) both ${s.delay}ms`,
              }}
              aria-hidden="true"
            />
          ))}
          <div
            className="absolute"
            style={{
              padding: '18px 26px',
              background: 'var(--strip)',
              border: '6px solid var(--gold)',
              boxShadow: 'inset 0 0 0 4px var(--outline), 0 10px 0 var(--shadow)',
              animation: 'ci-stamp 240ms steps(4,end) both 660ms, flash 1s steps(2,end) infinite 900ms',
            }}
          >
            <span
              lang="en"
              className="font-en-body leading-none"
              style={{
                fontSize: 'clamp(30px,5vw,58px)',
                color: 'var(--gold-ink)',
                textShadow: '6px 6px 0 var(--red-d)',
              }}
            >
              VS
            </span>
          </div>
        </div>

        {/* 4 · title card */}
        <div
          className="absolute inset-x-0 flex flex-col items-center"
          style={{ bottom: 96, gap: 12, animation: 'ci-titlein 260ms steps(4,end) both 1500ms' }}
        >
          <div
            style={{
              padding: '10px 20px',
              background: 'var(--purple-d)',
              border: '5px solid var(--outline)',
              boxShadow: '0 8px 0 var(--shadow)',
            }}
          >
            <span
              className="font-ar-body font-extrabold leading-none"
              style={{
                fontSize: 'clamp(30px,4.4vw,50px)',
                color: 'var(--text)',
                textShadow: '4px 4px 0 var(--outline)',
              }}
            >
              جولة التحدّي
            </span>
          </div>
          <div
            lang="en"
            className="font-en-body leading-none"
            style={{
              fontSize: 12,
              color: 'var(--gold)',
              letterSpacing: '0.2em',
              animation: 'blink 500ms steps(1) infinite',
            }}
          >
            {modeLabel}
            {points ? ` · ${points} PTS` : ''}
          </div>
        </div>

        {/* 4b · pixel confetti */}
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              top: 0,
              left: `${c.left}%`,
              width: c.size,
              height: c.size,
              background: c.color,
              animation: `ci-fall ${c.dur}ms steps(18,end) infinite ${c.delay}ms`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* 5 · pixel-block wipe — outside the shake so the cover stays flush */}
      {WIPE.map((w, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            top: `${w.top}%`,
            left: `${w.left}%`,
            width: '12.5%',
            height: '20%',
            background: 'var(--purple-d)',
            boxShadow: 'inset 0 0 0 3px var(--outline)',
            opacity: 0,
            animation: `ci-block 900ms steps(1,end) both ${w.delay}ms`,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function Shutter({ edge }) {
  return (
    <div
      className="absolute inset-x-0"
      style={{
        [edge]: 0,
        height: 44,
        [edge === 'top' ? 'borderBottom' : 'borderTop']: '4px solid var(--outline)',
        background: STRIPES,
        '--from': edge === 'top' ? '-100%' : '100%',
        animation: 'ci-shutter 300ms steps(4,end) both, ci-march 700ms steps(7,end) infinite 300ms',
      }}
      aria-hidden="true"
    />
  );
}

function TeamPlate({ team, label, from, fill, edge }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        '--from': from,
        width: '32vw',
        maxWidth: 360,
        height: 196,
        gap: 14,
        background: fill,
        border: `6px solid ${edge}`,
        boxShadow: 'inset 0 0 0 4px var(--outline)',
        animation: 'ci-slam 380ms steps(5,end) both 200ms',
      }}
    >
      <span
        style={{ width: 34, height: 34, background: team?.color ?? edge, border: '4px solid var(--outline)' }}
        aria-hidden="true"
      />
      <span
        className="font-ar-body font-extrabold leading-none truncate max-w-full"
        style={{ fontSize: 38, color: 'var(--text)' }}
      >
        {team?.name}
      </span>
      <span
        lang="en"
        className="font-en-body leading-none"
        style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.2em' }}
      >
        {label}
      </span>
    </div>
  );
}
