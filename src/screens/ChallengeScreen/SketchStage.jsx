import { motion } from 'framer-motion';
import { QRCode } from 'react-qr-code';
import { AlertTriangle, Zap, X as XIcon } from 'lucide-react';
import { buildSketchUrl } from '../../lib/sketchEncoding';
import TeamIdentity from '../../components/TeamIdentity';
import useSketchSession from './useSketchSession';

/* ─── SKETCH STAGE · host/big-screen side of the Pictionary challenge ──────
   Two views, driven by useSketchSession:
   • before the drawer connects → QR + spoiler-blocker + waiting state
   • once the drawer joins      → the live canvas + round timer
   The host "Skip"/"End" button is the manual escape hatch. */

export default function SketchStage({ team, otherTeam, challenge, onEnd }) {
  const { canvasRef, boxRef, subscribed, started, connected, timeLeft, skip } = useSketchSession({
    sessionId: challenge.sessionId,
    onEnd,
  });

  const qrUrl = buildSketchUrl({
    origin: window.location.origin,
    titleAr: challenge.prompt.ar,
    titleEn: challenge.prompt.en,
    lang: 'ar',
    sessionId: challenge.sessionId,
    catAr: challenge.catAr,
    catEn: challenge.catEn,
  });

  /* ── Live drawing view ─────────────────────────────────────────────── */
  if (started) {
    const urgent = timeLeft <= 10;
    return (
      <motion.div
        key="sketch-draw"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen flex flex-col px-4 py-4 md:px-8 md:py-6"
      >
        <header className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: team.color }}
              aria-hidden="true"
            />
            <span className="font-ar-ui text-lg text-cream truncate">{team.name} يرسم</span>
            <span className="font-en-body text-sm text-cream-60 italic truncate" lang="en">
              · {team.nameEn} draws
            </span>
          </div>
          <div
            className="font-en-display font-bold leading-none shrink-0"
            style={{
              fontSize: 'clamp(40px, 7vw, 76px)',
              letterSpacing: '-0.04em',
              color: urgent ? '#C44150' : 'var(--color-gold)',
              textShadow: urgent
                ? 'var(--glow-text-crimson-wide)'
                : 'var(--glow-text-gold-deep)',
            }}
          >
            {timeLeft}
          </div>
        </header>

        {/* Live canvas — 3:4 box (sized in JS) matching the phone's surface */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div
            ref={boxRef}
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              border: `2px solid ${team.color}aa`,
              boxShadow: '0 14px 44px rgba(0, 0, 0, 0.5)',
            }}
          >
            <canvas ref={canvasRef} className="block w-full h-full" />
          </div>
        </div>

        <footer className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-ar-ui text-base text-cream">ماذا يُرسم؟ خمّنوا بصوت عالٍ!</p>
            <p className="font-en-body text-xs text-cream-60 italic" lang="en">
              What's being drawn? Shout your guesses!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!connected && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-crimson/20 border border-crimson text-crimson">
                ⚠ انقطع الرسّام · drawer offline
              </span>
            )}
            <button
              type="button"
              onClick={skip}
              className="btn-outline inline-flex items-center gap-2 px-4 py-2.5 rounded-xl"
            >
              <XIcon size={15} />
              <span className="font-ar-ui text-sm font-semibold">إنهاء الجولة</span>
              <span className="font-en-body text-xs opacity-70" lang="en">
                · End
              </span>
            </button>
          </div>
        </footer>
      </motion.div>
    );
  }

  /* ── QR / waiting view ─────────────────────────────────────────────── */
  return (
    <motion.div
      key="sketch-qr"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
    >
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-ar-ui font-semibold uppercase tracking-wider bg-gold/15 border border-gold-faint mb-6"
        style={{ color: 'var(--color-gold)' }}
      >
        <Zap size={15} />
        تحدي الرسم
        <span className="font-en-body normal-case tracking-normal opacity-80" lang="en">
          · Sketch Challenge
        </span>
      </div>

      <div
        className="relative w-full max-w-md px-6 py-7 text-center rounded-3xl"
        style={{
          background: `linear-gradient(135deg, ${team.color}40, var(--color-ink-50))`,
          border: `2px solid ${team.color}aa`,
          boxShadow: 'var(--chip-active-shadow)',
        }}
      >
        <div className="mb-5">
          <TeamIdentity team={team} size="lg" />
        </div>

        {/* QR appears only once the channel is live (no scan-before-ready race) */}
        {subscribed ? (
          <div className="bg-white rounded-2xl p-4 inline-block mb-4">
            <QRCode value={qrUrl} size={196} bgColor="#FFFFFF" fgColor="#0A0F1A" level="M" />
          </div>
        ) : (
          <div className="w-[228px] h-[228px] mx-auto mb-4 rounded-2xl bg-ink-80 border border-gold-faint flex items-center justify-center">
            <span className="font-ar-ui text-sm text-cream-45">جارٍ التحضير…</span>
          </div>
        )}

        <p className="font-ar-ui text-lg text-cream mb-0.5">امسح الرمز وابدأ الرسم</p>
        <p className="font-en-body text-sm text-cream-60 mb-5" lang="en">
          Scan the QR · one player draws
        </p>

        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-crimson/10 border border-crimson/50 text-start mb-5">
          <AlertTriangle size={18} className="text-crimson shrink-0 mt-0.5" />
          <div>
            <div className="font-ar-ui text-sm font-semibold text-crimson">
              الرسّام فقط يمسح الرمز
            </div>
            <div className="font-en-body text-xs text-crimson/80 italic" lang="en">
              Only the drawer scans — everyone else, look away!
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-cream-60">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse-dot"
            style={{
              background: 'var(--color-gold-light)',
              boxShadow: '0 0 10px var(--color-gold-light)',
            }}
            aria-hidden="true"
          />
          <span className="font-ar-ui text-sm">في انتظار الرسّام…</span>
          <span className="font-en-body text-xs italic opacity-75" lang="en">
            Waiting for drawer…
          </span>
        </div>
      </div>

      <div className="mt-6 max-w-md w-full grid gap-1.5 text-center">
        <p className="font-ar-ui text-sm text-cream-60">
          <span style={{ color: team.color }}>{team.name}</span> · استعدّوا للتخمين
        </p>
        <p className="font-ar-ui text-sm text-cream-45">
          <span style={{ color: otherTeam.color }}>{otherTeam.name}</span> · راقبوا فقط ولا تكشفوا
        </p>
      </div>

      <button
        type="button"
        onClick={skip}
        className="btn-outline mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-xl"
      >
        <XIcon size={16} />
        <span className="font-ar-ui text-sm font-semibold">تخطّي</span>
        <span className="font-en-body text-xs opacity-70 uppercase tracking-wide" lang="en">
          · Skip
        </span>
      </button>
    </motion.div>
  );
}
