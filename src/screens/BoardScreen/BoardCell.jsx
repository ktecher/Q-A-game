import { X } from 'lucide-react';
import { tierClasses } from './tierClasses';

export default function BoardCell({ category, value, isPicked, onPick }) {
  const tier = tierClasses(value);

  if (isPicked) {
    return (
      <div
        aria-label="Already played"
        className="relative aspect-[5/2] rounded-lg flex items-center justify-center bg-ink-80 border border-gold-faint/40 opacity-30"
      >
        <X size={22} className="text-cream-60" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPick(category, value)}
      className="relative aspect-[5/2] rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-ink [will-change:transform] transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97]"
      style={{
        background: tier.bg,
        boxShadow: tier.ring,
      }}
      aria-label={`${category.ar} · ${category.en} · ${value} نقطة`}
    >
      {/* Tier hover glow */}
      <span
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-lg"
        style={{ boxShadow: tier.hoverShadow }}
      />
      {/* 600-tier corner sparkle */}
      {tier.showSparkle && (
        <span
          className="absolute top-1 end-1 text-cream/40 text-[10px] leading-none"
          aria-hidden="true"
        >
          ✦
        </span>
      )}
      <span
        className="font-en-display font-bold leading-none"
        style={{
          fontSize: `${tier.size}px`,
          color: tier.textColor,
          textShadow: tier.textShadow,
        }}
      >
        {value}
      </span>
    </button>
  );
}
