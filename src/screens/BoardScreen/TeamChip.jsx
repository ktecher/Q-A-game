import { Pencil } from 'lucide-react';
import TeamIdentity from '../../components/TeamIdentity';

export default function TeamChip({ team, isActive, onAdjust }) {
  return (
    <button
      type="button"
      onClick={onAdjust}
      title="Click to adjust score"
      aria-label={`Adjust ${team.nameEn} score (currently ${team.score})`}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-gold/10 border-gold shadow-gold-glow scale-105'
          : 'bg-ink-50 border-gold-faint hover:border-gold/60'
      }`}
      style={isActive ? { boxShadow: 'var(--chip-active-shadow)' } : undefined}
    >
      <TeamIdentity team={team} size="md" truncate />
      <div className="flex items-center gap-1 ms-2">
        <span
          className="font-en-display font-bold text-2xl leading-none"
          style={{ color: isActive ? 'var(--color-gold)' : team.color }}
        >
          {team.score}
        </span>
      </div>
      {isActive && (
        <span
          className="w-2 h-2 rounded-full bg-gold animate-pulse-dot ms-1 shrink-0"
          aria-label="Active team"
        />
      )}
      {/* Hover hint (pencil icon) — appears only on hover */}
      <Pencil
        size={11}
        className="absolute top-1.5 end-1.5 text-cream-45 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        aria-hidden="true"
      />
    </button>
  );
}
