import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated overlay + dialog wrapper. Centralizes the recurring pattern of
// fixed inset-0 backdrop + AnimatePresence + Esc-to-close + backdrop-click-to-
// close + ARIA dialog/modal attributes. The inner `.surface` card receives
// `className` and `style` so callers can color the top border, change padding,
// or set max-width without re-implementing the chrome.
//
// Note: this is the right home for modals where the parent doesn't already
// supply its own overlay. ChallengeRound supplies its own (the phase-aware
// AnimatePresence inside needs control of mount/unmount), so it shouldn't
// migrate here.
export default function Modal({
  open,
  onClose,
  labelledBy,
  className = 'px-6 py-7 max-w-md w-full',
  style,
  children,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
          aria-labelledby={labelledBy}
        >
          <motion.div
            key="dialog"
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className={`surface relative ${className}`}
            style={style}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
