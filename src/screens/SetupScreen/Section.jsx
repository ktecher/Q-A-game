// A lettered setup section: a gold letter chip, the Arabic label, its Latin
// tag, and an optional trailing status chip.
export default function Section({ badge, labelAr, labelEn, trailing, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 12 }}>
        <span
          className="font-en-body leading-none shrink-0"
          style={{ fontSize: 11, color: 'var(--outline)', background: 'var(--gold)', padding: '6px 8px' }}
          lang="en"
        >
          {badge}
        </span>
        <span
          className="font-ar-body font-bold leading-none"
          style={{ fontSize: 32, color: 'var(--text)' }}
        >
          {labelAr}
        </span>
        <span
          className="font-en-body leading-none uppercase"
          style={{ fontSize: 10, color: 'var(--muted2)' }}
          lang="en"
        >
          {labelEn}
        </span>
        {trailing && <span className="ms-auto">{trailing}</span>}
      </div>
      {children}
    </div>
  );
}
