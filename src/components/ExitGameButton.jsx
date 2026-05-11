import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

/**
 * Exit-game button + confirmation modal.
 * Mid-game state is reset only after the user confirms, so accidental clicks
 * don't lose progress. Esc closes the dialog without resetting.
 */
export default function ExitGameButton({ variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { reset, state } = useGame();

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const exitTo = (path) => {
    reset();
    setOpen(false);
    navigate(path, { replace: true });
  };

  const playedCount = state.picked.size;
  const totalCells = 36;

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Exit game"
          className="w-10 h-10 rounded-full surface flex items-center justify-center text-cream-60 hover:text-crimson hover:border-crimson/50 transition"
          title="إنهاء اللعبة · Exit Game"
        >
          <LogOut size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-outline px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:border-crimson/60 hover:text-crimson transition"
        >
          <LogOut size={12} />
          <span>إنهاء</span>
          <span className="font-en-body text-xs opacity-70" lang="en">
            Exit
          </span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-ink/85 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-game-title"
          >
            <motion.div
              key="dialog"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="surface px-6 py-7 max-w-sm w-full text-center relative"
            >
              {/* Close X */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cancel"
                className="absolute top-3 end-3 w-8 h-8 rounded-full hover:bg-cream-30/10 flex items-center justify-center text-cream-60 hover:text-cream transition"
              >
                <X size={16} />
              </button>

              <AlertTriangle
                size={36}
                className="text-gold mx-auto mb-3"
                aria-hidden="true"
              />

              <h3
                id="exit-game-title"
                className="font-ar-body font-bold text-cream text-xl"
              >
                إنهاء اللعبة الحالية؟
              </h3>
              <p
                className="font-en-display italic text-cream-60 text-base mt-1"
                lang="en"
              >
                Exit current game?
              </p>

              <p className="font-ar-ui text-cream-60 text-base mt-4">
                ستفقد التقدم الحالي ({playedCount} من {totalCells} أسئلة).
              </p>
              <p className="font-en-body text-cream-45 text-sm" lang="en">
                You'll lose current progress ({playedCount} of {totalCells} questions answered).
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => exitTo('/setup')}
                  className="btn-gold px-5 py-2.5 rounded-xl text-sm flex flex-col items-center gap-0"
                >
                  <span>إعداد لعبة جديدة</span>
                  <span className="font-en-body text-xs opacity-80" lang="en">
                    Set Up New Game
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => exitTo('/')}
                  className="btn-outline px-5 py-2.5 rounded-xl text-sm flex flex-col items-center gap-0"
                >
                  <span>العودة للرئيسية</span>
                  <span className="font-en-body text-xs opacity-80" lang="en">
                    Back to Home
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-cream-60 hover:text-gold text-sm font-en-body mt-1 transition"
                  lang="en"
                >
                  Cancel — keep playing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
