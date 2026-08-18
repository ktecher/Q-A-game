import { useTheme } from '../contexts/ThemeContext';

// Two adjoining cabinet tiles. The --sun-*/--moon-* tokens already encode which
// side reads as "lit" in each theme, so there is no active-state branch here.
const TILES = [
  { mode: 'light', label: 'DAY',  bg: 'var(--sun-bg)',  ink: 'var(--sun-ink)',  title: 'الوضع الفاتح · Light mode' },
  { mode: 'dark',  label: 'NITE', bg: 'var(--moon-bg)', ink: 'var(--moon-ink)', title: 'الوضع الداكن · Dark mode' },
];

/**
 * DAY / NITE toggle. Replaces the old sun/moon pill — the arcade theme has no
 * circles, and Lucide's curves fight the pixel grid at this size.
 * `size` is the tile edge in px (52 on the title screen, 44 in the board HUD).
 */
export default function ThemeToggle({ className = '', size = 44 }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`flex shrink-0 ${className}`} role="group" aria-label="Theme">
      {TILES.map((tile, i) => (
        <button
          key={tile.mode}
          type="button"
          onClick={() => setTheme(tile.mode)}
          aria-pressed={theme === tile.mode}
          title={tile.title}
          className="font-en-body flex items-center justify-center leading-none"
          style={{
            width: size,
            height: size,
            border: '4px solid var(--outline)',
            // The pair reads as one control: the second tile drops its leading edge.
            borderInlineStart: i === 1 ? 0 : undefined,
            background: tile.bg,
            color: tile.ink,
            fontSize: Math.max(8, Math.round(size * 0.21)),
            letterSpacing: '0.06em',
          }}
          lang="en"
        >
          {tile.label}
        </button>
      ))}
    </div>
  );
}
