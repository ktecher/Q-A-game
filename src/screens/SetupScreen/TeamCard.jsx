import { useState, useRef } from 'react';
import { TEAM_COLORS } from './constants';

export default function TeamCard({ team, index, otherColor, onChange }) {
  const [playersOpen, setPlayersOpen] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const inputRef = useRef(null);

  const isP1 = index === 0;
  // The card frames itself in the team's own colour, so choosing a swatch
  // changes the container and not just the swatch outline.
  const accent = team.color;

  const addPlayer = () => {
    const name = playerInput.trim();
    if (!name) return;
    onChange({ players: [...team.players, name] });
    setPlayerInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handlePlayerKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPlayer();
    }
  };

  const removePlayer = (idx) => {
    onChange({ players: team.players.filter((_, i) => i !== idx) });
  };

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 10,
        padding: 16,
        background: 'var(--panel)',
        border: `4px solid ${accent}`,
        boxShadow: '0 6px 0 var(--shadow)',
      }}
    >
      <span
        className="font-en-body leading-none"
        // Not the team colour: at 11px a dark pick like #9B2D3A sits at ~2.2:1
        // on the panel. The 4px frame carries the colour instead.
        style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}
        lang="en"
      >
        {isP1 ? 'PLAYER 1' : 'PLAYER 2'}
      </span>

      <input
        type="text"
        value={team.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={team.defaultNameAr}
        aria-label={`اسم الفريق · ${team.defaultNameEn} name`}
        className="w-full font-ar-body font-bold"
        style={{
          background: 'var(--input-bg)',
          border: '4px solid var(--line)',
          boxShadow: 'inset 4px 4px 0 var(--inset)',
          padding: '8px 12px',
          color: 'var(--text)',
          fontSize: 28,
        }}
      />

      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {TEAM_COLORS.map((hex) => {
          const isMine = team.color === hex;
          // Held by the other team — still selectable, just marked.
          const isTaken = !isMine && otherColor === hex;
          return (
            <button
              key={hex}
              type="button"
              disabled={isTaken}
              aria-label={`اختر اللون ${hex}${isTaken ? ' — مستخدم من الفريق الآخر' : ''}`}
              aria-pressed={isMine}
              title={isTaken ? 'مستخدم من الفريق الآخر · Taken by the other team' : undefined}
              onClick={() => onChange({ color: hex })}
              style={{
                width: 22,
                height: 22,
                background: hex,
                border: isMine ? '3px solid #F4ECD8' : '3px solid transparent',
                // Greyed rather than hidden: the swatch keeps its place in the
                // row, so the palette does not reflow as colours change hands.
                filter: isTaken ? 'grayscale(1)' : undefined,
                opacity: isTaken ? 0.3 : 1,
                cursor: isTaken ? 'not-allowed' : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Player roster — not on the handoff sheet, but the game already
          supports named players, so it stays behind a disclosure. */}
      <button
        type="button"
        onClick={() => setPlayersOpen((v) => !v)}
        className="flex items-center gap-2 font-en-body leading-none text-start"
        style={{ fontSize: 9, color: 'var(--muted2)' }}
        lang="en"
      >
        <span aria-hidden="true">{playersOpen ? '▾' : '▸'}</span>
        {team.players.length > 0 ? `${team.players.length} PLAYERS` : 'ADD PLAYERS'}
      </button>

      {playersOpen && (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {team.players.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="shrink-0" style={{ width: 10, height: 10, background: team.color }} />
              <span
                className="flex-1 font-ar-body font-bold leading-none truncate"
                style={{ fontSize: 24, color: 'var(--text)' }}
              >
                {p}
              </span>
              <button
                type="button"
                onClick={() => removePlayer(i)}
                aria-label="حذف اللاعب"
                className="font-en-body leading-none shrink-0"
                style={{ fontSize: 12, color: 'var(--red)' }}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          ))}
          <div className="flex" style={{ gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              onKeyDown={handlePlayerKeyDown}
              placeholder="اسم اللاعب"
              aria-label="اسم اللاعب · Player name"
              className="flex-1 min-w-0 font-ar-body font-bold"
              style={{
                background: 'var(--input-bg)',
                border: '4px solid var(--line)',
                boxShadow: 'inset 4px 4px 0 var(--inset)',
                padding: '6px 10px',
                color: 'var(--text)',
                fontSize: 24,
              }}
            />
            <button
              type="button"
              onClick={addPlayer}
              aria-label="إضافة لاعب"
              className="font-en-body leading-none shrink-0 grid place-items-center"
              style={{
                width: 44,
                background: 'var(--panel2)',
                border: '4px solid var(--gold)',
                color: 'var(--gold-ink)',
                fontSize: 12,
              }}
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
