import { Check } from 'lucide-react';
import { ICON_MAP } from '../../data/categories';

export default function CategoryTile({ cat, isSelected, asButton, onClick }) {
  const IconCmp = ICON_MAP[cat.icon];
  const inner = (
    <>
      {/* Accent strip across the top — visible on top of the rounded corner */}
      <div
        className="absolute top-0 start-0 end-0 h-1 rounded-t-xl"
        style={{ background: cat.accent }}
      />

      {/* Selected check badge */}
      {isSelected && (
        <div className="absolute top-1.5 end-1.5 w-4 h-4 bg-gold rounded-full flex items-center justify-center z-10">
          <Check size={9} className="text-ink" />
        </div>
      )}

      {/* Image banner — falls back to icon-on-accent if no image yet */}
      <div
        className="relative w-full h-14 sm:h-16 md:h-40 rounded-md overflow-hidden mb-1.5 mt-1.5"
        style={{ background: cat.accent }}
      >
        {cat.imageUrl ? (
          <>
            <img
              src={cat.imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-fit"
              
            />
            {/* Soft accent color tint over the image so it still reads as
                "this category's color" — keeps the visual rhythm consistent. */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-35"
              style={{ background: cat.accent }}
            />
          </>
        ) : IconCmp ? (
          <IconCmp className="absolute inset-0 m-auto" size={32} strokeWidth={1.6} color="#F4ECD8" />
        ) : null}
      </div>

      <span
        className={`font-ar-ui text-sm text-center leading-tight ${
          isSelected ? 'text-cream' : 'text-cream-60'
        }`}
      >
        {cat.ar}
      </span>
      <span className="font-en-body text-xs text-cream-45 text-center" lang="en">
        {cat.en}
      </span>
    </>
  );

  const baseClasses =
    'relative flex flex-col items-center gap-1 pt-3 pb-2.5 px-1.5 rounded-xl border-2 overflow-hidden';

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={`${baseClasses} [will-change:transform] transition-[transform,colors,border-color] duration-150 hover:scale-[1.03] active:scale-[0.97] ${
          isSelected
            ? 'border-gold bg-gold/10 shadow-gold-glow'
            : 'border-gold-faint bg-ink-80 hover:border-gold/40 hover:bg-gold/5'
        }`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} border-gold bg-gold/10`}>{inner}</div>
  );
}
