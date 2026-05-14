export default function Section({ badge, labelAr, labelEn, trailing, children }) {
  return (
    <div className="border-b border-gold-faint last:border-b-0">
      <div className="px-5 pt-3.5 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-en-body text-sm text-gold bg-gold/10 border border-gold/20 rounded px-1.5 py-0.5 shrink-0">
            {badge}
          </span>
          <span className="font-ar-ui text-base text-cream-60 truncate">
            {labelAr} <span className="opacity-60" lang="en">· {labelEn}</span>
          </span>
        </div>
        {trailing}
      </div>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  );
}
