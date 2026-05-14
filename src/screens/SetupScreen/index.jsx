import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { useCategories } from '../../lib/queries';
import CategoryTile from './CategoryTile';
import Section from './Section';
import TeamCard from './TeamCard';
import { GUEST_PRESET, DIFFICULTIES } from './constants';

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
