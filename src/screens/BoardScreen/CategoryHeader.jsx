import { ICON_MAP } from '../../data/categories';

export default function CategoryHeader({ category }) {
  const Icon = ICON_MAP[category.icon];
  return (
    <div
      className="accent-card relative flex flex-col items-center justify-end gap-0.5 px-1.5 py-2 rounded-t-lg text-center overflow-hidden min-h-[70px] sm:min-h-[84px]"
      style={{
        background: `linear-gradient(180deg, ${category.accent} 0%, ${category.accent}cc 100%)`,
        boxShadow: 'var(--tier-category-header-shadow)',
      }}
    >
      {category.imageUrl ? (
        <>
          <img
            src={category.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 mix-blend-multiply opacity-45"
            style={{ background: category.accent }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)',
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        Icon && (
          <Icon
            size={24}
            className="text-cream/95"
            strokeWidth={1.6}
            aria-hidden="true"
          />
        )
      )}
      <div className="relative font-ar-body font-bold text-cream text-sm sm:text-base leading-tight drop-shadow">
        {category.ar}
      </div>
      <div
        className="relative font-en-body text-cream/80 text-[11px] sm:text-xs leading-tight tracking-wide drop-shadow"
        lang="en"
      >
        {category.en}
      </div>
    </div>
  );
}
