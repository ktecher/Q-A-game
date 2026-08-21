import { ICON_MAP, FALLBACK_ICON } from '../../data/categories';

export default function CategoryHeader({ category }) {
  const Icon = ICON_MAP[category.icon] ?? FALLBACK_ICON;
  return (
    <div
      className="accent-card relative overflow-hidden h-[var(--brd-hdr-h)]"
      style={{
        background: category.accent,
        border: '4px solid var(--gold)',
        boxShadow: '0 6px 0 var(--gold-sh)',
      }}
    >
      {/* Image fills the tile; the label plate overlays its bottom edge. */}
      <div className="absolute inset-0">
        {category.imageUrl ? (
          <>
            <img
              src={category.imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Accent wash — pushes the photo toward the category's own hue */}
            <div
              className="absolute inset-0 mix-blend-multiply opacity-50"
              style={{ background: category.accent }}
              aria-hidden="true"
            />
            {/* Dither stripes — the pixel-era stand-in for a gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'repeating-linear-gradient(var(--dither) 0 3px, transparent 3px 6px)',
              }}
              aria-hidden="true"
            />
          </>
        ) : (
          Icon && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon size={24} className="text-cream/95" strokeWidth={2} aria-hidden="true" />
            </div>
          )
        )}
      </div>

      {/* Label plate */}
      <div
        className="absolute inset-x-0 bottom-0 text-center"
        style={{ background: 'var(--strip)', borderTop: '4px solid var(--gold)', padding: '6px 4px' }}
      >
        <div
          className="font-ar-body font-bold leading-none truncate"
          style={{ color: 'var(--gold-ink)', fontSize: 'var(--cat-label-fs)' }}
        >
          {category.ar}
        </div>
        <div
          className="font-en-body leading-none truncate uppercase"
          style={{ color: 'var(--muted)', fontSize: 8, marginTop: 4 }}
          lang="en"
        >
          {category.en}
        </div>
      </div>
    </div>
  );
}
