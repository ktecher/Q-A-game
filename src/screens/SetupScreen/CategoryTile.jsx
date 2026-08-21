import { ICON_MAP, FALLBACK_ICON } from '../../data/categories';

export default function CategoryTile({ cat, isSelected, asButton, onClick }) {
  const IconCmp = ICON_MAP[cat.icon] ?? FALLBACK_ICON;

  const inner = (
    <>
      {isSelected && (
        <span
          className="absolute font-en-body grid place-items-center z-[2] leading-none"
          style={{
            top: -4,
            insetInlineEnd: -4,
            width: 24,
            height: 24,
            background: 'var(--green)',
            border: '4px solid var(--outline)',
            color: 'var(--outline)',
            fontSize: 9,
          }}
          aria-hidden="true"
        >
          ✓
        </span>
      )}

      {/* Image band */}
      <div
        className="relative overflow-hidden h-[var(--cat-tile-h)]"
        style={{ background: cat.accent, borderBottom: '4px solid var(--outline)' }}
      >
        {cat.imageUrl ? (
          <>
            <img
              src={cat.imageUrl}
              alt=""
              loading="lazy"
              className="pixel-art absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 mix-blend-multiply opacity-45"
              style={{ background: cat.accent }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'repeating-linear-gradient(var(--dither) 0 3px, transparent 3px 6px)' }}
              aria-hidden="true"
            />
          </>
        ) : (
          IconCmp && (
            <IconCmp className="absolute inset-0 m-auto" size={32} strokeWidth={2} color="#F4ECD8" />
          )
        )}
      </div>

      <div
        className="text-center font-ar-body font-bold leading-none truncate"
        style={{ paddingTop: 8, fontSize: 26, color: isSelected ? 'var(--gold-ink)' : 'var(--text)' }}
      >
        {cat.ar}
      </div>
      <div
        className="text-center font-en-body leading-none truncate uppercase"
        style={{ marginTop: 6, fontSize: 8, color: 'var(--muted)' }}
        lang="en"
      >
        {cat.en}
      </div>
    </>
  );

  const frame = {
    position: 'relative',
    background: 'var(--panel)',
    border: `4px solid ${isSelected ? 'var(--gold)' : 'var(--line)'}`,
    boxShadow: isSelected ? '0 6px 0 var(--gold-sh)' : '0 6px 0 var(--shadow)',
    paddingBottom: 10,
  };

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className="block w-full text-start transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
        style={frame}
      >
        {inner}
      </button>
    );
  }

  return <div style={frame}>{inner}</div>;
}
