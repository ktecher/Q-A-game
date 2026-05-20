import { motion } from 'framer-motion';
import { Sparkles, Zap, AlertTriangle, Hourglass, Trophy } from 'lucide-react';

/* ─── ACCEPT STAGE · full-screen redesign of the challenge offer ─────── */

export default function AcceptStage({ cellValue, teamName, onAccept, onDecline }) {
  return (
    <motion.div
      key="accept"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen flex items-center justify-center px-4 py-8"
    >
      <div
        className="relative w-full max-w-2xl px-8 py-10 md:px-12 md:py-14 text-center rounded-3xl"
        style={{
          background: 'var(--card-gold-soft-grad)',
          border: '2px solid var(--color-gold)',
          boxShadow: 'var(--card-gold-soft-shadow)',
        }}
      >
        {/* Sparkle decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-40 rounded-3xl overflow-hidden" aria-hidden="true">
          <span className="absolute top-4 start-6 text-gold-light text-3xl">✦</span>
          <span className="absolute top-10 end-8 text-gold-light text-base">◇</span>
          <span className="absolute bottom-8 start-10 text-cream text-xl">·</span>
          <span className="absolute bottom-16 end-6 text-gold text-3xl">✦</span>
        </div>

        <div className="relative z-10">
          {/* Big icon at top */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.15 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gold/20 border-2 border-gold mb-6"
            style={{ boxShadow: '0 0 30px rgba(212,162,76,0.5)' }}
          >
            <Zap size={44} className="text-gold" strokeWidth={2.5} />
          </motion.div>

          <h1
            className="font-ar-body font-bold text-4xl md:text-5xl text-gold mb-1"
            style={{ textShadow: 'var(--glow-text-gold-wide)' }}
          >
            جولة التحدي!
          </h1>
          <p className="font-en-display italic text-gold-light text-xl md:text-2xl mb-7" lang="en">
            Challenge Round!
          </p>

          {/* Team context */}
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ink-80 border border-gold-faint mb-7">
            <p className="font-ar-ui text-base md:text-lg text-cream">
              صندوق سحري · {teamName} وقع على تحدٍ خاص
            </p>
          </div>
          <p className="font-en-body text-sm text-cream-60 -mt-5 mb-7" lang="en">
            Mystery box · {teamName} landed on a challenge
          </p>

          {/* Rules */}
          <div className="grid gap-3 mb-8 text-start">
            <Rule
              icon={<Sparkles size={20} />}
              ar="لاعب من كل فريق يتنافس وجهًا لوجه"
              en="One player from each team faces off"
            />
            <Rule
              icon={<Hourglass size={20} />}
              ar="٣٠ ثانية مشتركة، يتبادلان الإجابة كلمة بكلمة"
              en="30 seconds shared, alternating word-by-word"
            />
            <Rule
              icon={<AlertTriangle size={20} />}
              ar="من يعجز عن الإجابة في دوره يخسر"
              en="If you choke on your turn, you lose"
            />
            <Rule
              icon={<Trophy size={20} />}
              ar={`الفائز يحصل على ضعف النقاط (${cellValue * 2})`}
              en={`Winner takes 2× points (${cellValue * 2})`}
            />
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-[1fr_2fr] gap-3 md:gap-4">
            <button
              type="button"
              onClick={onDecline}
              className="px-4 py-4 md:py-5 rounded-2xl border border-gold-faint bg-ink-80 text-cream-60 hover:text-cream hover:border-cream-60 transition-colors duration-150"
            >
              <div className="font-ar-ui text-lg md:text-xl font-semibold">رفض</div>
              <div className="font-en-body text-xs md:text-sm opacity-70 mt-0.5" lang="en">
                Decline · normal Q
              </div>
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="btn-gold px-4 py-4 md:py-5 rounded-2xl"
            >
              <div className="font-ar-ui text-lg md:text-xl font-bold">قبول</div>
              <div className="font-en-body text-xs md:text-sm font-medium opacity-80 mt-0.5" lang="en">
                Accept · 2× points
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Rule({ icon, ar, en }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-ink-80 border border-gold-faint">
      <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gold/15 text-gold">
        {icon}
      </span>
      <div className="text-start">
        <div className="font-ar-ui text-base font-semibold text-cream">{ar}</div>
        <div className="font-en-body text-xs italic text-cream-60 mt-0.5" lang="en">
          {en}
        </div>
      </div>
    </div>
  );
}
