import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { TEAM_COLORS, TEAM_EMOJIS } from './constants';

export default function TeamCard({ team, onChange }) {
  const [playersOpen, setPlayersOpen] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const inputRef = useRef(null);

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
    <div className="surface p-4 flex flex-col gap-4 rounded-xl" style={{ borderTopColor: team.color, borderTopWidth: '3px' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{team.emoji}</span>
        <div>
          <div className="font-ar-body font-bold text-cream text-lg">{team.name || team.defaultNameAr}</div>
          <div className="font-en-body text-cream-45 text-sm" lang="en">{team.defaultNameEn}</div>
        </div>
      </div>

      {/* Name input */}
      <label className="flex flex-col gap-1">
        <span className="font-ar-ui text-sm text-gold">
          اسم الفريق · <span lang="en">Team Name</span>
        </span>
        <input
          type="text"
          value={team.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={team.defaultNameAr}
          className="w-full px-3 py-2 rounded-lg bg-ink-80 border border-gold-faint text-cream font-ar-ui text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition"
        />
      </label>

      {/* Color swatches */}
      <div>
        <div className="font-ar-ui text-sm text-gold mb-2">
          اللون · <span lang="en">Color</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TEAM_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`اختر اللون ${hex}`}
              onClick={() => onChange({ color: hex })}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                background: hex,
                outline: team.color === hex ? '2px solid var(--color-gold)' : '2px solid transparent',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      {/* Emoji picker */}
      <div>
        <div className="font-ar-ui text-sm text-gold mb-2">
          الرمز · <span lang="en">Emoji</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {TEAM_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              aria-label={`اختر ${em}`}
              onClick={() => onChange({ emoji: em })}
              className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-transform duration-150 hover:scale-110 focus:outline-none"
              style={{
                background: team.emoji === em ? 'rgba(212,162,76,0.15)' : 'var(--color-ink-80)',
                border: team.emoji === em ? '2px solid var(--color-gold)' : '2px solid transparent',
              }}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Player roster */}
      <div>
        <button
          type="button"
          onClick={() => setPlayersOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-ar-ui text-cream-60 hover:text-gold transition-colors"
        >
          {playersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          <span>
            {team.players.length > 0
              ? `${team.players.length} لاعب · ${team.players.length} player${team.players.length !== 1 ? 's' : ''}`
              : 'أضف اللاعبين · Add players'}
          </span>
        </button>

        {playersOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {team.players.map((p, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: team.color }} />
                <span className="font-ar-ui text-base text-cream flex-1">{p}</span>
                <button
                  type="button"
                  onClick={() => removePlayer(i)}
                  aria-label="حذف اللاعب"
                  className="opacity-0 group-hover:opacity-100 text-cream-45 hover:text-crimson transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                ref={inputRef}
                type="text"
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={handlePlayerKeyDown}
                placeholder="اسم اللاعب · Player name"
                className="flex-1 px-3 py-1.5 rounded-lg bg-ink-80 border border-gold-faint text-cream font-ar-ui text-sm placeholder:text-cream-45 focus:outline-none focus:border-gold transition"
              />
              <button
                type="button"
                onClick={addPlayer}
                aria-label="إضافة لاعب"
                className="px-2.5 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
