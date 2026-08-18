import { useEffect } from 'react';

// Overlay + dialog wrapper. Centralizes the recurring pattern of fixed inset-0
// backdrop + Esc-to-close + backdrop-click-to-close + ARIA dialog/modal
// attributes. It opens on a hard cut — the arcade theme has no fades or
// spring scales. The inner `.surface` card receives
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

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--scrim)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`surface relative ${className}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
