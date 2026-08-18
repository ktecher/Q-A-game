import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { useCategories, useAppSettings } from '../../lib/queries';
import { pickN } from '../../lib/random';
import { makeSetupTeams } from '../../lib/teams';
import {
  readSettings,
  writeSettings,
  ALLOWED_CHALLENGE_COUNTS,
} from '../../lib/settingsStorage';
import { GUEST_PRESET, CATEGORIES_PER_GAME } from '../../lib/gameDefaults';
import CategoryTile from './CategoryTile';
import Section from './Section';
import TeamCard from './TeamCard';
import { DIFFICULTIES } from './constants';

// A flush row of segments — the shape the sheet uses for difficulty and for the
// two challenge toggles. The active segment is the gold cabinet button.
function Segments({ options, value, onChange, disabled }) {
  return (
    <div className={`flex ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="flex-1 text-center"
            style={{
              padding: '14px 0',
              background: active
                ? 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)'
                : 'var(--panel)',
              border: `4px solid ${active ? 'var(--outline)' : 'var(--line)'}`,
            }}
          >
            <div
              className="font-ar-body leading-none"
              style={{
                fontSize: 28,
                fontWeight: active ? 800 : 700,
                color: active ? 'var(--outline)' : 'var(--muted)',
              }}
            >
              {opt.ar}
            </div>
            <div
              className="font-en-body leading-none uppercase"
              style={{ marginTop: 6, fontSize: 9, color: active ? 'var(--gold-sh)' : 'var(--muted2)' }}
              lang="en"
            >
              {opt.en}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const TIMER_SEGMENTS = 10;

// A status chip — green when the condition is met, inert line frame otherwise.
function CountChip({ ready, children }) {
  return (
    <span
      className="font-en-body leading-none inline-block"
      style={{
        fontSize: 12,
        padding: '6px 10px',
        background: ready ? 'var(--green)' : 'var(--cleared-bg)',
        color: ready ? 'var(--outline)' : 'var(--muted2)',
        border: ready ? 'none' : '4px solid var(--line)',
      }}
      lang="en"
    >
      {children}
    </span>
  );
}


export default function SetupScreen() {
  const navigate = useNavigate();
  const { user, guestProfile, isGuest } = useAuth();
  const { startGame } = useGame();
  const { data: CATEGORIES } = useCategories();
  const { data: appSettings } = useAppSettings();
  // Challenge rounds need BOTH the player's toggle below AND at least one
  // challenge type enabled in the admin dashboard Settings page.
  const anyChallengeType =
    appSettings.naming_challenge_enabled || appSettings.sketch_challenge_enabled;

  // Setup runs as two steps so neither page is a wall of controls:
  //   1 · the match rules  — timer, teams, challenge rounds
  //   2 · the content      — mode, difficulty, the six stages
  // Both feed one startGame() call, so the state stays in this component
  // rather than moving to a route parent.
  const [step, setStep] = useState(1);

  // Section D — mode
  const [mode, setMode] = useState('pick');

  // Section B — difficulty
  const [difficulty, setDifficulty] = useState('mixed');

  // Section C — teams
  const [teams, setTeams] = useState(makeSetupTeams);

  // Section D — timer
  const [timerSecs, setTimerSecs] = useState(30);

  // Section E — challenge rounds (remembered between games via settingsStorage).
  // Read once on mount; both pieces of section-E state come from the same blob.
  const [{ challengesEnabled: storedEnabled, challengeCount: storedCount }] =
    useState(readSettings);
  const [challengesEnabled, setChallengesEnabled] = useState(storedEnabled);
  // How many challenge cells to seed onto the board (2 or 4). Remembered
  // independently of `challengesEnabled` so toggling Disabled then re-enabling
  // restores the player's last count choice instead of resetting to default.
  const [challengeCount, setChallengeCount] = useState(storedCount);

  // Section F — categories (last because it depends on the picked mode)
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  /* ─── Derived ─── */

  const displayName = user?.email?.split('@')[0] ?? guestProfile?.name ?? 'ضيف';
  const guestSelected = GUEST_PRESET;
  const effectiveSelected = isGuest ? guestSelected : selected;
  const selectionReady = effectiveSelected.length === CATEGORIES_PER_GAME;

  // Full category objects for the chosen slugs — passed to startGame so the
  // in-progress game carries database-sourced visuals (image, icon, accent,
  // kind) rather than re-hydrating from the local code file.
  const effectiveCategories = effectiveSelected
    .map((slug) => CATEGORIES.find((c) => c.slug === slug))
    .filter(Boolean);

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
      if (prev.length >= CATEGORIES_PER_GAME) return [...prev.slice(1), slug];
      return [...prev, slug];
    });
  };

  const handleModeSelect = (val) => {
    setMode(val);
    if (val === 'quick' || val === 'surprise') {
      setSelected(pickN(CATEGORIES, CATEGORIES_PER_GAME).map((c) => c.slug));
    } else {
      setSelected([]);
    }
  };

  const updateTeam = (idx, patch) => {
    setTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const goHome = () => navigate('/home');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // Team names start empty (they show the default as a placeholder), so step 1
  // is only complete once both have actually been filled in.
  const teamsNamed = teams.every((t) => t.name.trim().length > 0);
  const isStepOne = step === 1;
  const timerFilled = Math.round((timerSecs / 60) * TIMER_SEGMENTS);

  return (
    <div className="min-h-screen flex flex-col" style={{ paddingBottom: 110 }}>
      {/* ── Sticky top header ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-3"
        style={{
          padding: '14px 20px',
          background: 'var(--panel)',
          borderBottom: '4px solid var(--gold-d)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={goHome}
            title="العودة للرئيسية · Back to home"
            className="font-en-body leading-none shrink-0 grid place-items-center"
            style={{
              width: 44,
              height: 44,
              background: 'var(--panel2)',
              border: '4px solid var(--line)',
              color: 'var(--gold-ink)',
              fontSize: 12,
            }}
          >
            <span aria-hidden="true">◄</span>
            <span className="sr-only" lang="en">Back to home</span>
          </button>
          <span
            className="font-ar-body font-extrabold leading-none truncate"
            style={{ fontSize: 34, color: 'var(--gold-ink)' }}
          >
            أم الهيمان
          </span>
        </div>
        <span
          className="font-en-body leading-none truncate uppercase shrink-0"
          style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}
          lang="en"
        >
          STEP {step}/2 · {isGuest ? 'GUEST' : displayName}
        </span>
      </header>

      {/* ── Page title ─────────────────────────────────────────────── */}
      <div className="text-center" style={{ padding: '26px 16px 8px' }}>
        <h2
          className="font-ar-body font-extrabold leading-none"
          style={{ fontSize: 'clamp(34px, 5vw, 56px)', color: 'var(--text)', textShadow: '4px 4px 0 var(--red-d)' }}
        >
          {isStepOne ? 'إعداد الفرق' : 'اختر الفئات'}
        </h2>
        <p
          className="font-en-body leading-none"
          style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.16em', marginTop: 8 }}
          lang="en"
        >
          {isStepOne ? 'PLAYERS · TIMER · CHALLENGES' : 'SELECT YOUR STAGE'}
        </p>
      </div>

      <div className="flex-1 flex flex-col" style={{ padding: '16px 24px', gap: 22 }}>
        {isStepOne ? (
          <>
          {/* A — Timer */}
          <Section badge="A" labelAr="الوقت" labelEn="Timer">
            <div
              className="flex items-center flex-wrap"
              style={{ gap: 16, padding: '14px 16px', background: 'var(--panel)', border: '4px solid var(--line)' }}
            >
              <span
                className="font-ar-body font-extrabold leading-none shrink-0"
                style={{ fontSize: 56, color: 'var(--gold-ink)' }}
                dir="ltr"
              >
                {timerSecs}
                <span style={{ fontSize: 22 }}>S</span>
              </span>
              <div className="flex-1 min-w-[140px] flex flex-col" style={{ gap: 8 }}>
                <div className="flex" style={{ gap: 4 }} aria-hidden="true">
                  {Array.from({ length: TIMER_SEGMENTS }, (_, i) => (
                    <span
                      key={i}
                      className="flex-1"
                      style={{ height: 26, background: i < timerFilled ? 'var(--gold)' : 'var(--line)' }}
                    />
                  ))}
                </div>
                {/* The meter is the readout; this stays the control so the value
                    is still keyboard- and screen-reader-operable. */}
                <input
                  type="range"
                  min={15}
                  max={60}
                  step={5}
                  value={timerSecs}
                  onChange={(e) => setTimerSecs(Number(e.target.value))}
                  className="w-full cursor-pointer h-2 appearance-none"
                  style={{ background: 'var(--line)', accentColor: 'var(--gold)' }}
                  aria-label="وقت الإجابة · Answer time in seconds"
                />
              </div>
              <span
                className="font-en-body shrink-0 text-center"
                style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}
                lang="en"
              >
                P2 GETS
                <br />
                {Math.round(timerSecs / 2)}S
              </span>
            </div>
          </Section>

          {/* B — Teams */}
          <Section badge="B" labelAr="الفرق" labelEn="Choose your fighters">
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 18 }}>
              {teams.map((team, idx) => (
                <TeamCard
                  key={idx}
                  team={team}
                  index={idx}
                  otherColor={teams[1 - idx]?.color}
                  onChange={(patch) => updateTeam(idx, patch)}
                />
              ))}
            </div>
          </Section>

          {/* C — Challenge rounds (no sheet screen; styled to match E) */}
          <Section badge="C" labelAr="جولات التحدّي" labelEn="Challenge rounds">
            <div className="flex flex-col" style={{ gap: 12 }}>
              <Segments
                options={[
                  { value: true, ar: 'مُفعّلة', en: 'Enabled' },
                  { value: false, ar: 'مُعطّلة', en: 'Disabled' },
                ]}
                value={challengesEnabled}
                onChange={setChallengesEnabled}
              />
              <Segments
                options={ALLOWED_CHALLENGE_COUNTS.map((n) => ({
                  value: n,
                  ar: n === 2 ? '٢' : '٤',
                  en: String(n),
                }))}
                value={challengeCount}
                onChange={setChallengeCount}
                disabled={!challengesEnabled}
              />
              <p
                className="font-en-body text-center"
                style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  lineHeight: 1.8,
                  background: 'var(--cleared-bg)',
                  border: '4px solid var(--line)',
                  padding: '8px 12px',
                }}
                lang="en"
              >
                {challengesEnabled
                  ? `${challengeCount} HIDDEN CELLS BECOME DOUBLE-POINT CHALLENGES`
                  : 'NO CHALLENGE ROUNDS THIS GAME'}
              </p>
            </div>
          </Section>
          </>
        ) : (
          <>
          {/* D — Mode picker */}
          <Section badge="D" labelAr="طريقة اللعب" labelEn="Mode">
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 14 }}>
              {[
                { val: 'quick',    ar: 'اختيار سريع', en: 'QUICK PICK'      },
                { val: 'pick',     ar: 'اختر الفئات', en: 'PICK CATEGORIES' },
                { val: 'surprise', ar: 'بطاقة مفاجأة', en: 'SURPRISE ME'    },
              ].map(({ val, ar, en }) => {
                const active = mode === val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleModeSelect(val)}
                    className="relative text-center"
                    style={{
                      padding: 16,
                      background: active ? 'var(--panel3)' : 'var(--panel)',
                      border: `4px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
                      boxShadow: active ? '0 6px 0 var(--gold-sh)' : '0 6px 0 var(--shadow)',
                    }}
                  >
                    {active && (
                      <span
                        className="absolute font-en-body leading-none"
                        style={{
                          top: -14,
                          insetInlineStart: 12,
                          fontSize: 10,
                          background: 'var(--gold)',
                          color: 'var(--outline)',
                          padding: '4px 6px',
                        }}
                        lang="en"
                      >
                        SELECTED
                      </span>
                    )}
                    <div
                      className="font-ar-body font-bold leading-none"
                      style={{ fontSize: 30, color: active ? 'var(--gold-ink)' : 'var(--text)' }}
                    >
                      {ar}
                    </div>
                    <div
                      className="font-en-body leading-none"
                      style={{ marginTop: 8, fontSize: 10, color: active ? 'var(--gold-d)' : 'var(--muted2)' }}
                      lang="en"
                    >
                      {en}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* E — Difficulty */}
          <Section badge="E" labelAr="الصعوبة" labelEn="Difficulty">
            <Segments
              options={DIFFICULTIES.map((d) => ({ value: d.value, ar: d.ar, en: d.en }))}
              value={difficulty}
              onChange={setDifficulty}
            />
          </Section>

          {/* F — Categories (depends on the chosen mode) */}
          <Section
            badge="F"
            labelAr="اختر الفئات"
            labelEn="Pick 6 stages"
            trailing={
              <CountChip ready={selectionReady}>
                {effectiveSelected.length}/{CATEGORIES_PER_GAME} READY
              </CountChip>
            }
          >
            {isGuest ? (
              <>
                <p
                  className="font-en-body"
                  style={{
                    fontSize: 10,
                    color: 'var(--gold-ink)',
                    background: 'var(--panel)',
                    border: '4px solid var(--gold-d)',
                    padding: '8px 12px',
                    marginBottom: 14,
                    letterSpacing: '0.08em',
                  }}
                  lang="en"
                >
                  6 STAGES PRE-SELECTED FOR GUEST MODE
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6" style={{ gap: 12 }}>
                  {CATEGORIES.filter((c) => guestSelected.includes(c.slug)).map((cat) => (
                    <CategoryTile key={cat.slug} cat={cat} isSelected asButton={false} />
                  ))}
                </div>
              </>
            ) : mode === 'pick' ? (
              <>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في الفئات"
                  aria-label="ابحث في الفئات · Search categories"
                  className="w-full font-ar-body font-bold"
                  style={{
                    background: 'var(--input-bg)',
                    border: '4px solid var(--blue)',
                    boxShadow: 'inset 4px 4px 0 var(--inset)',
                    padding: '8px 12px',
                    color: 'var(--text)',
                    fontSize: 26,
                    marginBottom: 14,
                  }}
                />
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6" style={{ gap: 12 }}>
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
                    <div
                      className="col-span-3 sm:col-span-5 md:col-span-6 text-center font-en-body"
                      style={{ padding: '32px 0', fontSize: 10, color: 'var(--muted2)' }}
                      lang="en"
                    >
                      NO RESULTS
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p
                  className="font-en-body"
                  style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 14, letterSpacing: '0.08em' }}
                  lang="en"
                >
                  {mode === 'quick' ? '6 RANDOM STAGES SELECTED' : 'SURPRISE SELECTION READY'}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6" style={{ gap: 12 }}>
                  {CATEGORIES.filter((c) => selected.includes(c.slug)).map((cat) => (
                    <CategoryTile key={cat.slug} cat={cat} isSelected asButton={false} />
                  ))}
                </div>
              </>
            )}
          </Section>
          </>
        )}
      </div>

      {/* ── Fixed bottom bar ───────────────────────────────────────── */}
      <div
        className="fixed bottom-0 start-0 end-0 z-30 flex items-center"
        style={{
          gap: 16,
          padding: '16px 24px',
          background: 'var(--panel)',
          borderTop: '4px solid var(--gold-d)',
        }}
      >
        {isStepOne ? (
          <>
            <button
              type="button"
              onClick={goHome}
              className="shrink-0 transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
              style={{
                padding: '14px 20px',
                background: 'var(--panel2)',
                border: '4px solid var(--line)',
                boxShadow: '0 8px 0 var(--shadow)',
                color: 'var(--text)',
              }}
            >
              <span className="font-ar-body font-bold leading-none" style={{ fontSize: 28 }}>
                رجوع
              </span>{' '}
              <span
                className="font-en-body leading-none"
                style={{ fontSize: 10, color: 'var(--muted)' }}
                lang="en"
              >
                HOME
              </span>
            </button>
            <button
              type="button"
              disabled={!teamsNamed}
              onClick={() => setStep(2)}
              title={teamsNamed ? undefined : 'أدخل اسمي الفريقين · Enter both team names'}
              className="flex-1 text-center transition-transform duration-100 enabled:hover:-translate-y-[3px] enabled:active:translate-y-[3px]"
              style={{
                padding: 14,
                background: teamsNamed
                  ? 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)'
                  : 'var(--cleared-bg)',
                border: `4px solid ${teamsNamed ? 'var(--outline)' : 'var(--line)'}`,
                boxShadow: teamsNamed ? '0 8px 0 var(--gold-sh)' : 'none',
                color: teamsNamed ? 'var(--outline)' : 'var(--muted2)',
                opacity: teamsNamed ? 1 : 0.45,
                cursor: teamsNamed ? undefined : 'not-allowed',
              }}
            >
              <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 38 }}>
                {teamsNamed ? 'اختر الفئات' : 'أدخل أسماء الفرق'}
              </span>
              <span
                className="font-en-body leading-none"
                style={{ fontSize: 12, marginInlineStart: 12 }}
                lang="en"
              >
                {teamsNamed ? 'NEXT ▸' : 'NAME BOTH TEAMS'}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="shrink-0 transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
              style={{
                padding: '14px 20px',
                background: 'var(--panel2)',
                border: '4px solid var(--blue)',
                boxShadow: '0 8px 0 var(--shadow)',
                color: 'var(--text)',
              }}
            >
              <span className="font-ar-body font-bold leading-none" style={{ fontSize: 28 }}>
                رجوع
              </span>{' '}
              <span
                className="font-en-body leading-none"
                style={{ fontSize: 10, color: 'var(--muted)' }}
                lang="en"
              >
                ◄ BACK
              </span>
            </button>
            <CountChip ready={selectionReady}>
              {effectiveSelected.length}/{CATEGORIES_PER_GAME}
            </CountChip>
            <button
              type="button"
              disabled={!selectionReady}
              onClick={() => {
                // Remember the challenge choices so they default the same next game.
                writeSettings({ challengesEnabled, challengeCount });
                startGame({
                  categorySlugs: effectiveSelected,
                  categories: effectiveCategories,
                  teams: teams.map((t, i) => ({
                    id: i + 1,
                    name: t.name.trim() || t.defaultNameAr,
                    nameEn: t.defaultNameEn,
                    color: t.color,
                    players: t.players,
                  })),
                  difficulty,
                  timerSeconds: timerSecs,
                  challengesEnabled: challengesEnabled && anyChallengeType,
                  challengeCount,
                });
                navigate('/reveal');
              }}
              className="flex-1 text-center transition-transform duration-100 enabled:hover:-translate-y-[3px] enabled:active:translate-y-[3px]"
              style={{
                padding: 14,
                background: selectionReady
                  ? 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)'
                  : 'var(--cleared-bg)',
                border: `4px solid ${selectionReady ? 'var(--outline)' : 'var(--line)'}`,
                boxShadow: selectionReady ? '0 8px 0 var(--gold-sh)' : 'none',
                color: selectionReady ? 'var(--outline)' : 'var(--muted2)',
                opacity: selectionReady ? 1 : 0.45,
                cursor: selectionReady ? undefined : 'not-allowed',
              }}
            >
              <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 38 }}>
                ابدأ اللعبة
              </span>
              <span
                className="font-en-body leading-none"
                style={{ fontSize: 12, marginInlineStart: 12 }}
                lang="en"
              >
                PRESS START
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
