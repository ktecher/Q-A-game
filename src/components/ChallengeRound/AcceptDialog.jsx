import { motion } from 'framer-motion';
import { Sparkles, Zap, AlertTriangle, Hourglass, Trophy } from 'lucide-react';

/* ─── PHASE-1 DIALOG · Accept or Decline ─────────────────────────────── */

export default function AcceptDialog({ cellValue, teamName, onAccept, onDecline }) {
  return (
    <motion.div
      key="accept"
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="surface px-7 py-8 max-w-md w-full text-center relative overflow-hidden"
      style={{
        background: 'var(--card-gold-soft-grad)',
        border: '2px solid var(--color-gold)',
        boxShadow: 'var(--card-gold-soft-shadow)',
      }}
    >
      {/* Sparkle burst decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden="true">
        <span className="absolute top-3 start-4 text-gold-light text-2xl">✦</span>
        <span className="absolute top-8 end-6 text-gold-light text-sm">◇</span>
        <span className="absolute bottom-6 start-8 text-cream text-lg">·</span>
        <span className="absolute bottom-12 end-4 text-gold text-2xl">✦</span>
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/20 border-2 border-gold mb-4"
        >
          <Zap size={32} className="text-gold" strokeWidth={2.5} />
        </motion.div>

        <h2 className="font-ar-body font-bold text-3xl text-gold drop-shadow"
            style={{ textShadow: 'var(--glow-text-gold-wide)' }}>
          جولة التحدي!
        </h2>
        <p className="font-en-display italic text-gold-light text-xl mt-1" lang="en">
          Challenge Round!
        </p>

        <div className="mt-5 px-3 py-2.5 rounded-lg bg-ink-80 border border-gold-faint">
          <p className="font-ar-ui text-base text-cream">
            صندوق سحري · {teamName} وقع على تحدٍ خاص
          </p>
          <p className="font-en-body text-sm text-cream-60 mt-0.5" lang="en">
            Mystery box · {teamName} landed on a challenge
          </p>
        </div>

        {/* Rules */}
        <div className="mt-5 text-start space-y-2 px-2">
          <RuleLine icon={<Sparkles size={14} />}
            ar="لاعب من كل فريق يتنافس وجهًا لوجه"
            en="One player from each team faces off" />
          <RuleLine icon={<Hourglass size={14} />}
            ar="٣٠ ثانية مشتركة، يتبادلان الإجابة كلمة بكلمة"
            en="30 seconds shared, alternating word-by-word" />
          <RuleLine icon={<AlertTriangle size={14} />}
            ar="من يعجز عن الإجابة في دوره يخسر"
            en="If you choke on your turn, you lose" />
          <RuleLine icon={<Trophy size={14} />}
            ar={`الفائز يحصل على ضعف النقاط (${cellValue * 2})`}
            en={`Winner takes 2× points (${cellValue * 2})`} />
        </div>

        {/* CTAs */}
        <div className="mt-7 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-3 rounded-xl border border-gold-faint bg-ink-80 text-cream-60 hover:text-cream hover:border-cream-60 transition-colors duration-150"
          >
            <div className="font-ar-ui text-base font-semibold">رفض</div>
            <div className="font-en-body text-xs opacity-70 mt-0.5" lang="en">
              Decline · play normally
            </div>
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="btn-gold px-4 py-3 rounded-xl"
          >
            <div className="font-ar-ui text-base font-bold">قبول</div>
            <div className="font-en-body text-xs font-medium opacity-80 mt-0.5" lang="en">
              Accept · 2× points
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function RuleLine({ icon, ar, en }) {
  return (
    <div className="flex items-start gap-2 text-cream-60">
      <span className="text-gold mt-0.5 shrink-0">{icon}</span>
      <div>
        <div className="font-ar-ui text-sm">{ar}</div>
        <div className="font-en-body text-xs opacity-70" lang="en">{en}</div>
      </div>
    </div>
  );
}
