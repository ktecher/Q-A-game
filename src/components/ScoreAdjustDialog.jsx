import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, RotateCcw } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const PRESETS = [50, 100, 200, 400, 600];

/**
 * Score-adjust modal — opens when user taps a team chip on the Board.
 * Presets +/- 50/100/200/400/600 apply immediately and stack so multiple
 * taps compose. The "Reset to 0" button hard-resets the team's score.
 *
 * Props:
 *   team    — the team object (or null when closed)
 *   onClose — () => void; called on backdrop click, X, Esc, or "Done"
 */
export default function ScoreAdjustDialog({ team, onClose }) {
  const { adjustScore } = useGame();
  const open = !!team;

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!team) return null;

  const apply = (delta) => adjustScore(team.id, delta);
  const resetToZero = () => adjustScore(team.id, -team.score);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-ink/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-score-title"
        >
          <motion.div
            key="dialog"
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="surface px-6 py-7 max-w-md w-full relative"
            style={{ borderTopColor: team.color, borderTopWidth: '3px' }}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 end-3 w-8 h-8 rounded-full hover:bg-cream-30/10 flex items-center justify-center text-cream-60 hover:text-cream transition"
            >
              <X size={16} />
            </button>

            {/* Header — team identity + current score */}
            <div className="flex flex-col items-center gap-2 mb-5">
              <span id="adjust-score-title" className="font-ar-ui text-sm text-gold-light tracking-wider uppercase">
                تعديل النتيجة · <span lang="en">Adjust Score</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{team.emoji}</span>
                <div className="text-start">
                  <div className="font-ar-body font-bold text-cream text-lg leading-tight">
                    {team.name}
                  </div>
                  <div className="font-en-body text-cream-45 text-sm leading-tight" lang="en">
                    {team.nameEn}
                  </div>
                </div>
              </div>
              <motion.div
                key={team.score}
                initial={{ scale: 1.18 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className="font-en-display font-bold leading-none mt-1"
                style={{
                  fontSize: '56px',
                  color: team.color,
                  textShadow: `0 0 20px ${team.color}66`,
                }}
              >
                {team.score}
              </motion.div>
            </div>

            {/* Preset adjustment grid */}
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {PRESETS.map((amount) => (
                <button
                  key={`minus-${amount}`}
                  type="button"
                  onClick={() => apply(-amount)}
                  className="flex flex-col items-center justify-center px-1 py-2.5 rounded-lg border border-crimson/40 bg-crimson/5 text-crimson hover:bg-crimson/15 hover:border-crimson transition-all active:scale-95"
                >
                  <Minus size={12} className="opacity-70" />
                  <span className="font-en-display font-bold text-base leading-none mt-0.5">{amount}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-5">
              {PRESETS.map((amount) => (
                <button
                  key={`plus-${amount}`}
                  type="button"
                  onClick={() => apply(amount)}
                  className="flex flex-col items-center justify-center px-1 py-2.5 rounded-lg border border-gold/40 bg-gold/5 text-gold hover:bg-gold/15 hover:border-gold transition-all active:scale-95"
                >
                  <Plus size={12} className="opacity-70" />
                  <span className="font-en-display font-bold text-base leading-none mt-0.5">{amount}</span>
                </button>
              ))}
            </div>

            {/* Helper actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gold-faint">
              <button
                type="button"
                onClick={resetToZero}
                disabled={team.score === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-cream-60 hover:text-crimson hover:bg-crimson/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCcw size={11} />
                <span>إلى الصفر</span>
                <span className="font-en-body text-xs opacity-70" lang="en">
                  · Reset to 0
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-gold px-5 py-2 rounded-lg text-sm flex items-center gap-1.5"
              >
                <span>تم</span>
                <span className="font-en-body text-xs opacity-80" lang="en">
                  Done
                </span>
              </button>
            </div>

            <p className="font-en-body text-cream-45 text-xs mt-3 text-center" lang="en">
              Tap multiple presets to stack adjustments. Score updates live above.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
