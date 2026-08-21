import { tierClasses } from './tierClasses';

// Four 6×6 corner studs, inset 4px — the detail that makes a flat rectangle
// read as a moulded arcade block.
const STUD_POSITIONS = [
  { top: 4, left: 4 },
  { top: 4, right: 4 },
  { bottom: 4, left: 4 },
  { bottom: 4, right: 4 },
];

function Studs({ color }) {
  return STUD_POSITIONS.map((pos, i) => (
    <span
      key={i}
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{ ...pos, width: 6, height: 6, background: color }}
    />
  ));
}

export default function BoardCell({ category, value, isPicked, onPick }) {
  const tier = tierClasses(value);

  if (isPicked) {
    return (
      <div
        aria-label="Already played"
        className="relative h-[var(--brd-cell-h)] flex items-center justify-center font-en-body"
        style={{
          background: 'var(--cleared-bg)',
          border: '4px solid var(--line)',
          color: 'var(--cleared-ink)',
          fontSize: 20,
        }}
      >
        <span aria-hidden="true">✕</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPick(category, value)}
      className="group relative h-[var(--brd-cell-h)] flex items-center justify-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
      style={{
        background: tier.bg,
        border: `4px solid ${tier.border}`,
        boxShadow: `0 5px 0 ${tier.shadow}`,
      }}
      aria-label={`${category.ar} · ${category.en} · ${value} نقطة`}
    >
      <Studs color={tier.stud} />
      <span
        className="font-ar-body font-extrabold leading-none"
        style={{
          fontSize: tier.size,
          color: tier.ink,
          textShadow: '3px 3px 0 var(--shadow)',
        }}
      >
        {value}
      </span>
    </button>
  );
}
