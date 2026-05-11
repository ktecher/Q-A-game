import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Check, Search, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { ICON_MAP } from '../data/categories';
import { useCategories } from '../lib/queries';

/* ─── DATA ─────────────────────────────────────────────────────────────── */

const GUEST_PRESET = ['kuwait-history', 'sports', 'science', 'culture', 'food', 'music'];

const TEAM_COLORS = [
  '#3A7BC8', '#9B2D3A', '#D4A24C', '#4A2070',
  '#A8853B', '#6E1F28', '#0F2A4D', '#2A5A98',
];

const TEAM_EMOJIS = ['🦅', '🌙', '🏆', '☕', '🎲', '⚔️', '🎯', '🐪', '🌴', '🕌', '⭐', '🔥', '💎', '🎭', '🎪'];

const DIFFICULTIES = [
  { value: 'easy',  ar: 'سهل',   en: 'Easy'  },
  { value: 'mixed', ar: 'متنوع', en: 'Mixed' },
  { value: 'hard',  ar: 'صعب',   en: 'Hard'  },
];

/* ─── CATEGORY TILE ──────────────────────────────────────────────────────── */

function CategoryTile({ cat, isSelected, asButton, onClick }) {
  const IconCmp = ICON_MAP[cat.icon];
  const inner = (
    <>
      {/* Accent strip across the top — visible on top of the rounded corner */}
      <div
        className="absolute top-0 start-0 end-0 h-1 rounded-t-xl"
        style={{ background: cat.accent }}
      />

      {/* Selected check badge */}
      {isSelected && (
        <div className="absolute top-1.5 end-1.5 w-4 h-4 bg-gold rounded-full flex items-center justify-center z-10">
          <Check size={9} className="text-ink" />
        </div>
      )}

      {/* Image banner — falls back to icon-on-accent if no image yet */}
      <div
        className="relative w-full h-14 sm:h-16 md:h-20 rounded-md overflow-hidden mb-1.5 mt-1.5"
        style={{ background: cat.accent }}
      >
        {cat.imageUrl ? (
          <>
            <img
              src={cat.imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Soft accent color tint over the image so it still reads as
                "this category's color" — keeps the visual rhythm consistent. */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-35"
              style={{ background: cat.accent }}
            />
          </>
        ) : IconCmp ? (
          <IconCmp className="absolute inset-0 m-auto" size={32} strokeWidth={1.6} color="#F4ECD8" />
        ) : null}
      </div>

      <span
        className={`font-ar-ui text-sm text-center leading-tight ${
          isSelected ? 'text-cream' : 'text-cream-60'
        }`}
      >
        {cat.ar}
      </span>
      <span className="font-en-body text-xs text-cream-45 text-center" lang="en">
        {cat.en}
      </span>
    </>
  );

  const baseClasses =
    'relative flex flex-col items-center gap-1 pt-3 pb-2.5 px-1.5 rounded-xl border-2 overflow-hidden';

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={`${baseClasses} [will-change:transform] transition-[transform,colors,border-color] duration-150 hover:scale-[1.03] active:scale-[0.97] ${
          isSelected
            ? 'border-gold bg-gold/10 shadow-gold-glow'
            : 'border-gold-faint bg-ink-80 hover:border-gold/40 hover:bg-gold/5'
        }`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} border-gold bg-gold/10`}>{inner}</div>
  );
}

/* ─── ACCORDION ─────────────────────────────────────────────────────────── */

function Section({ badge, labelAr, labelEn, trailing, children }) {
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

/* ─── TEAM CARD ─────────────────────────────────────────────────────────── */

function TeamCard({ team, onChange }) {
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

/* ─── MAIN SCREEN ──────────────────────────────────────────────────────── */

export default function SetupScreen() {
  const navigate = useNavigate();
  const { user, guestProfile, isGuest } = useAuth();
  const { startGame } = useGame();
  const { data: CATEGORIES } = useCategories();

  // Section A — mode
  const [mode, setMode] = useState('pick');

  // Section B — difficulty
  const [difficulty, setDifficulty] = useState('mixed');

  // Section C — teams
  const [teams, setTeams] = useState([
    { name: 'الفريق الأول', defaultNameAr: 'الفريق الأول', defaultNameEn: 'Team Alpha', color: '#3A7BC8', emoji: '🦅', players: [] },
    { name: 'الفريق الثاني', defaultNameAr: 'الفريق الثاني', defaultNameEn: 'Team Beta',  color: '#9B2D3A', emoji: '🌙', players: [] },
  ]);

  // Section D — timer
  const [timerSecs, setTimerSecs] = useState(30);

  // Section E — categories (last because it depends on the picked mode)
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  /* ─── Derived ─── */

  const displayName = user?.email?.split('@')[0] ?? guestProfile?.name ?? 'ضيف';
  const guestSelected = GUEST_PRESET;
  const effectiveSelected = isGuest ? guestSelected : selected;
  const selectionReady = effectiveSelected.length === 6;

  const filteredCats = CATEGORIES.filter(
    (c) =>
      searchQuery === '' ||
      c.ar.includes(searchQuery) ||
      c.en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTileToggle = (slug) => {
    if (isGuest) return;
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      // Max 6: replace the oldest (first) selection to stay at 6
      if (prev.length >= 6) return [...prev.slice(1), slug];
      return [...prev, slug];
    });
  };

  const handleModeSelect = (val) => {
    setMode(val);
    if (val === 'quick' || val === 'surprise') {
      const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5).slice(0, 6);
      setSelected(shuffled.map((c) => c.slug));
    } else {
      setSelected([]);
    }
  };

  const updateTeam = (idx, patch) => {
    setTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  return (
    <div className="min-h-screen flex flex-col pb-24">

      {/* ── Sticky top header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-ink/95 border-b border-gold-faint flex items-center justify-between px-4 py-3">
        <span className="font-ar-body font-bold text-gold-light text-lg tracking-wide">
          أم الهيمان ❖
        </span>
        <div className="flex items-center gap-2">
          {isGuest ? (
            <span className="flex items-center gap-1.5 bg-ink-80 border border-gold-faint rounded-full px-3 py-1 text-sm font-ar-ui text-cream-60">
              <span>ضيف</span>
              <span className="text-cream-45" lang="en">· Guest</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 bg-ink-80 border border-gold-faint rounded-full px-3 py-1">
              <span className="text-base leading-none">{guestProfile?.emoji ?? '🎲'}</span>
              <span className="font-ar-ui text-sm text-cream truncate max-w-[120px]">{displayName}</span>
            </span>
          )}
        </div>
      </header>

      {/* ── Page title ─────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-4 text-center">
        <h2 className="font-ar-body font-bold text-2xl text-cream">إعداد اللعبة</h2>
        <p className="font-en-display italic text-cream-45 text-sm mt-0.5" lang="en">Game Setup</p>
      </div>

      {/* ── Sections wrapper ───────────────────────────────────────── */}
      <div className="flex-1 border border-gold-faint rounded-xl mx-4 overflow-hidden bg-ink-60">

        {/* A — Mode picker */}
        <Section badge="أ · A" labelAr="طريقة اللعب" labelEn="Mode">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { val: 'quick',    ar: 'اختيار سريع',     en: 'Quick Pick'      },
              { val: 'pick',     ar: 'اختر الفئات',     en: 'Pick Categories' },
              { val: 'surprise', ar: 'بطاقة مفاجأة ✨', en: 'Surprise Me'     },
            ].map(({ val, ar, en }) => (
              <button
                key={val}
                type="button"
                onClick={() => handleModeSelect(val)}
                className={`flex flex-col items-center py-3 px-4 rounded-xl border-2 transition-colors duration-150 ${
                  mode === val
                    ? 'border-gold bg-gold/10 shadow-gold-glow'
                    : 'border-gold-faint bg-ink-80 hover:border-gold/50 hover:bg-gold/5'
                }`}
              >
                <span className="font-ar-ui font-semibold text-base text-cream">{ar}</span>
                <span className="font-en-body text-sm text-cream-45 mt-0.5" lang="en">{en}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* B — Difficulty */}
        <Section badge="ب · B" labelAr="الصعوبة" labelEn="Difficulty">
          <div className="flex rounded-xl overflow-hidden border border-gold-faint">
            {DIFFICULTIES.map(({ value, ar, en }, idx) => (
              <button
                key={value}
                type="button"
                onClick={() => setDifficulty(value)}
                className={`flex-1 flex flex-col items-center py-3 transition-colors duration-150 ${
                  difficulty === value
                    ? 'bg-gradient-to-br from-gold to-gold-dark text-ink'
                    : 'bg-ink-80 text-cream-60 hover:bg-gold/8 hover:text-cream'
                } ${idx > 0 ? 'border-s border-gold-faint' : ''}`}
              >
                <span className={`font-ar-ui font-semibold text-base ${difficulty === value ? 'text-ink' : ''}`}>{ar}</span>
                <span className={`font-en-body text-sm mt-0.5 ${difficulty === value ? 'text-ink/70' : 'text-cream-45'}`} lang="en">{en}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* C — Teams */}
        <Section badge="ج · C" labelAr="الفرق" labelEn="Teams">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team, idx) => (
              <TeamCard key={idx} team={team} onChange={(patch) => updateTeam(idx, patch)} />
            ))}
          </div>
        </Section>

        {/* D — Timer */}
        <Section badge="د · D" labelAr="الوقت" labelEn="Timer">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3 justify-center">
              <span className="font-ar-body font-bold text-5xl text-gold">{timerSecs}</span>
              <div className="flex flex-col">
                <span className="font-ar-body text-base text-cream-60">ثانية</span>
                <span className="font-en-body text-sm text-cream-45" lang="en">seconds</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={timerSecs}
                onChange={(e) => setTimerSecs(Number(e.target.value))}
                className="w-full cursor-pointer h-2 rounded-full appearance-none bg-gold/20"
                style={{ accentColor: 'var(--color-gold)' }}
                aria-label="وقت الإجابة"
              />
              <div className="flex justify-between px-0.5">
                {[15, 30, 45, 60].map((v) => (
                  <span key={v} className="font-en-body text-sm text-cream-45" lang="en">{v}s</span>
                ))}
              </div>
            </div>
            <p className="font-ar-ui text-sm text-cream-45 text-center border border-gold-faint rounded-lg px-3 py-2 bg-ink-80">
              للفريق الثاني سيكون نصف هذا الوقت ({Math.round(timerSecs / 2)} ثانية) ·{' '}
              <span lang="en" className="font-en-body">Team B gets {Math.round(timerSecs / 2)}s</span>
            </p>
          </div>
        </Section>

        {/* E — Categories (LAST step — depends on chosen mode) */}
        <Section
          badge="هـ · E"
          labelAr="اختر الفئات"
          labelEn="Pick Categories"
          trailing={
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-en-body border transition-colors ${
              selectionReady
                ? 'bg-gold/15 border-gold text-gold'
                : 'bg-cream-30/10 border-gold-faint text-cream-45'
            }`}>
              <span className="font-ar-ui">{effectiveSelected.length}</span>
              <span>/ 6</span>
              {selectionReady && <Check size={11} />}
            </div>
          }
        >
          {/* Guest mode: read-only 6 tiles */}
          {isGuest ? (
            <>
              <div className="rounded-xl border border-gold/30 bg-gold/8 px-4 py-2.5 mb-4">
                <p className="font-ar-ui text-base text-gold">
                  تم اختيار 6 فئات للضيف ·{' '}
                  <span lang="en" className="font-en-body text-gold-light text-sm">6 categories pre-selected for guest mode</span>
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CATEGORIES.filter((c) => guestSelected.includes(c.slug)).map((cat) => (
                  <CategoryTile key={cat.slug} cat={cat} isSelected asButton={false} />
                ))}
              </div>
            </>
          ) : mode === 'pick' ? (
            <>
              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-45 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في الفئات · Search categories"
                  className="w-full ps-9 pe-3 py-2 rounded-lg bg-ink-80 border border-gold-faint text-cream font-ar-ui text-sm placeholder:text-cream-45 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition"
                />
              </div>

              {/* Category grid */}
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {filteredCats.map((cat) => (
                  <CategoryTile
                    key={cat.slug}
                    cat={cat}
                    isSelected={selected.includes(cat.slug)}
                    asButton
                    onClick={() => handleTileToggle(cat.slug)}
                  />
                ))}
                {filteredCats.length === 0 && (
                  <div className="col-span-3 sm:col-span-5 md:col-span-6 py-8 text-center">
                    <p className="font-ar-ui text-base text-cream-45">لا توجد نتائج · <span lang="en">No results</span></p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Quick Pick or Surprise mode: show read-only selected tiles
            <>
              <p className="font-ar-ui text-sm text-cream-45 mb-3">
                {mode === 'quick' ? 'تم اختيار 6 فئات عشوائية · 6 random categories selected' : 'تم اختيار 6 فئات مفاجئة ✨ · Surprise selection ready'}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CATEGORIES.filter((c) => selected.includes(c.slug)).map((cat) => (
                  <CategoryTile key={cat.slug} cat={cat} isSelected asButton={false} />
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* ── Sticky bottom bar ──────────────────────────────────────── */}
      <div className="fixed bottom-0 start-0 end-0 z-30 bg-ink/95 border-t border-gold-faint px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-en-body shrink-0 transition-colors ${
            selectionReady
              ? 'border-gold bg-gold/15 text-gold'
              : 'border-gold-faint bg-ink-80 text-cream-45'
          }`}>
            <span className="font-ar-ui font-semibold">{effectiveSelected.length}</span>
            <span>/6</span>
            {selectionReady && <Check size={13} />}
          </div>
          <button
            type="button"
            disabled={!selectionReady}
            onClick={() => {
              startGame({
                categorySlugs: effectiveSelected,
                teams: teams.map((t, i) => ({
                  id: i + 1,
                  name: t.name || t.defaultNameAr,
                  nameEn: t.defaultNameEn,
                  color: t.color,
                  emoji: t.emoji,
                  players: t.players,
                })),
                difficulty,
                timerSeconds: timerSecs,
              });
              navigate('/reveal');
            }}
            className={`flex-1 py-3 rounded-xl font-ar-ui font-bold text-base flex flex-col items-center gap-0.5 transition-all ${
              selectionReady
                ? 'btn-gold'
                : 'bg-ink-80 border border-gold-faint text-cream-45 cursor-not-allowed opacity-50'
            }`}
          >
            <span>ابدأ اللعبة</span>
            <span className="font-en-body text-sm font-medium opacity-75" lang="en">Start Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
