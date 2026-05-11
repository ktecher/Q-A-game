export default function BrandHeader({ subtitle = true }) {
  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <h1 className="font-ar-body font-bold text-gold-light text-4xl md:text-5xl tracking-wide">
        مدينة أم الهيمان
      </h1>
      <span className="font-en-display italic text-gold/80 text-xl md:text-2xl tracking-wide" lang="en">
        Umm Al Hayman City
      </span>
      {subtitle && (
        <>
          <div className="ornament-divider mt-2" />
          <p className="font-ar-ui text-cream-60 text-base mt-1">لعبة العائلة</p>
          <p className="font-en-body text-cream-45 text-sm italic" lang="en">
            The Family Trivia Game
          </p>
        </>
      )}
    </div>
  );
}
