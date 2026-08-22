import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext';
import { cellKey } from '../../lib/cellKey';
import { seededShuffle, seededPickN, seedFrom } from '../../lib/random';
import { makeSessionId } from '../../lib/sketchEncoding';
import {
  usePrefetchQuestions,
  useChallengePrompts,
  useDrawingWords,
  useAppSettings,
} from '../../lib/queries';
import ExitGameButton from '../../components/ExitGameButton';
import ScoreAdjustDialog from '../../components/ScoreAdjustDialog';
import ThemeToggle from '../../components/ThemeToggle';
import HudTeam from './HudTeam';
import CategoryHeader from './CategoryHeader';
import BoardCell from './BoardCell';
import { TIER_LEGEND } from './tierClasses';

export default function BoardScreen() {
  const navigate = useNavigate();
  const { state, pickCell, startChallenge, rowValues, totalCells } = useGame();
  const { categories, teams, picked, challengeCells, activeTeamIdx, gameOver, gameSeed } = state;
  const [adjustingTeamId, setAdjustingTeamId] = useState(null);
  const adjustingTeam = teams.find((t) => t.id === adjustingTeamId) ?? null;

  // Bulk-prefetch all questions for the 6 chosen categories so when user picks
  // a cell, the question is already in cache — no stub-then-real flash. The
  // gameSeed makes every remount re-seed the cache identically (no re-roll).
  usePrefetchQuestions(categories, gameSeed);

  // Warm the challenge prompts cache so picks are instant.
  const { data: prompts } = useChallengePrompts();
  // Drawing-challenge word pool + the admin feature flags. Both have offline
  // fallbacks, so they are always defined.
  const { data: drawingWords } = useDrawingWords();
  const { data: settings } = useAppSettings();

  // If game ended, kick to results
  useEffect(() => {
    if (gameOver) navigate('/play/results', { replace: true });
  }, [gameOver, navigate]);

  // If user lands on /play directly without starting, send to setup
  useEffect(() => {
    if (!state.started) navigate('/setup', { replace: true });
  }, [state.started, navigate]);

  // Whenever currentCell is set (from PICK_CELL or CANCEL_CHALLENGE → fall-through),
  // route to the question screen.
  useEffect(() => {
    if (state.currentCell) navigate('/play/question');
  }, [state.currentCell, navigate]);

  // Whenever a challenge is started, route to the dedicated challenge screen.
  useEffect(() => {
    if (state.currentChallenge) navigate('/play/challenge');
  }, [state.currentChallenge, navigate]);

  // Deal each surprise challenge cell its variant + content ONCE per game.
  // Derived from the game seed (stable across remounts); each cell takes the
  // next unused item(s) from a seeded-shuffled pool — and falls back to the
  // other variant if its own pool runs dry — so no two challenge cells (and,
  // for the head-to-head sketch, no two teams) share a word / naming prompt.
  const challengeAssignments = useMemo(() => {
    const keys = [...(challengeCells ?? [])].sort();
    if (keys.length === 0) return {};

    // Which challenge types are usable: the admin Settings page enables each,
    // and the naming round also needs a loaded challenge_prompts pool.
    const variants = [];
    if (settings.naming_challenge_enabled && prompts.length > 0) variants.push('naming');
    if (settings.sketch_challenge_enabled) variants.push('sketch');
    if (variants.length === 0) return {}; // no type available → all fall through

    // Pre-shuffled pools; the cursors below walk them as cells are assigned.
    const wordOrder = seededShuffle(drawingWords, seedFrom(gameSeed, 'sketch-words'));
    const promptOrder = seededShuffle(prompts, seedFrom(gameSeed, 'naming-prompts'));

    const out = {};
    let wi = 0; // next unused drawing word (a head-to-head sketch needs two)
    let pi = 0; // next unused naming prompt
    for (const key of keys) {
      const variant = seededPickN(variants, 1, seedFrom(gameSeed, 'variant', key))[0];
      const canSketch = wi + 1 < wordOrder.length; // two distinct words available
      const canName = pi < promptOrder.length;
      // Use the dealt variant; if its pool is spent, borrow the other one.
      const useSketch = variant === 'sketch' ? canSketch : !canName;
      if (useSketch && canSketch) {
        out[key] = { variant: 'sketch', words: [wordOrder[wi], wordOrder[wi + 1]] };
        wi += 2;
      } else if (canName) {
        out[key] = { variant: 'naming', prompt: promptOrder[pi] };
        pi += 1;
      }
      // else: both pools spent → leave unset → cell falls through to a normal Q
    }
    return out;
  }, [gameSeed, challengeCells, settings, prompts, drawingWords]);

  const handlePick = (cat, value, rowIdx) => {
    const key = cellKey(cat.slug, value, rowIdx);
    const assignment = challengeAssignments[key];

    if (challengeCells?.has(key) && assignment) {
      // Surprise! A challenge cell — variant + content were dealt at game start.
      if (assignment.variant === 'sketch') {
        // Head-to-head: one drawing session per team. sketch[i] belongs to
        // teams[i] — each team draws its own word on its own QR/canvas.
        const toSession = (w) => ({
          sessionId: makeSessionId(),
          prompt: { ar: w.ar, en: w.en },
          catAr: w.catAr,
          catEn: w.catEn,
        });
        startChallenge({
          categorySlug: cat.slug,
          value,
          rowIdx,
          variant: 'sketch',
          sketch: assignment.words.map(toSession),
        });
        return;
      }
      startChallenge({
        categorySlug: cat.slug,
        value,
        rowIdx,
        variant: 'naming',
        prompt: assignment.prompt,
      });
      return;
    }

    // Normal cell — or a challenge cell with no usable challenge type.
    pickCell({ categorySlug: cat.slug, value, rowIdx });
  };

  const playedCount = picked.size;
  const activeTeam = teams[activeTeamIdx];

  return (
    <div className="min-h-screen">
      {/* HUD bar — one flush row, hard-separated. Stacks below md. */}
      <header
        className="board-hud flex flex-col md:flex-row md:items-stretch"
        style={{ background: 'var(--panel)', borderBottom: '4px solid var(--gold-d)' }}
      >
        <HudTeam
          team={teams[0]}
          index={0}
          isActive={activeTeamIdx === 0}
          lifelines={state.lifelinesUsed?.[0]}
          onAdjust={() => setAdjustingTeamId(teams[0].id)}
        />

        {/* VS / round progress */}
        <div
          className="board-hud-vs w-full md:w-[190px] shrink-0 flex flex-col items-center justify-center gap-2"
          style={{
            padding: 10,
            background: 'var(--strip)',
            borderInlineEnd: '4px solid var(--outline)',
          }}
        >
          <span
            className="font-en-body leading-none"
            style={{
              color: 'var(--gold-ink)',
              fontSize: 26,
              textShadow: '4px 4px 0 var(--red-d)',
            }}
            lang="en"
          >
            VS
          </span>
          <span
            className="font-en-body leading-none"
            style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em' }}
            lang="en"
          >
            ROUND {playedCount}/{totalCells}
          </span>
          <div className="w-full" style={{ height: 14, background: 'var(--line)' }}>
            <div
              className="h-full"
              style={{
                width: `${(playedCount / totalCells) * 100}%`,
                background: 'var(--green)',
              }}
            />
          </div>
        </div>

        <HudTeam
          team={teams[1]}
          index={1}
          isActive={activeTeamIdx === 1}
          lifelines={state.lifelinesUsed?.[1]}
          onAdjust={() => setAdjustingTeamId(teams[1].id)}
        />

        {/* Cabinet controls */}
        <div className="flex items-center justify-center gap-2 px-4 py-2">
          <ThemeToggle size={44} />
          <button
            type="button"
            aria-label="Toggle sound"
            className="font-en-body flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              background: 'var(--panel2)',
              border: '4px solid var(--line)',
              color: 'var(--gold-ink)',
              fontSize: 12,
            }}
          >
            <span aria-hidden="true">♪</span>
          </button>
          <button
            type="button"
            aria-label="Pause"
            className="font-en-body flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              background: 'var(--panel2)',
              border: '4px solid var(--line)',
              color: 'var(--gold-ink)',
              fontSize: 12,
            }}
          >
            <span aria-hidden="true">II</span>
          </button>
          <ExitGameButton variant="icon" />
        </div>
      </header>

      <div className="px-4 md:px-6" style={{ paddingTop: 'var(--brd-pad-t)', paddingBottom: 'var(--brd-pad-b)' }}>
        {/* Status row */}
        <div className="flex items-center justify-between gap-3 font-en-body" style={{ fontSize: 'var(--brd-status-fs)', marginBottom: 'var(--brd-status-mb)' }}>
          <span style={{ color: 'var(--muted)', letterSpacing: '0.08em' }} lang="en">
            SELECT A BLOCK · {playedCount}/{totalCells} CLEARED
          </span>
          <span style={{ color: 'var(--gold-ink)', letterSpacing: '0.08em' }}>
            <span lang="en">▶ P{activeTeamIdx + 1} TURN · </span>
            <span className="font-ar-body font-bold" style={{ fontSize: 24 }}>
              دور {activeTeam?.name}
            </span>
          </span>
        </div>

        {/* The Board */}
        <div
          className="grid"
          style={{ gap: 'var(--brd-gap)', gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
        >
          {/* Row 0: category headers */}
          {categories.map((cat) => (
            <CategoryHeader key={`hdr-${cat.slug}`} category={cat} />
          ))}

          {/* Body rows: 6 difficulty tiers × 6 categories */}
          {rowValues.map((value, rowIdx) =>
            categories.map((cat) => {
              const key = cellKey(cat.slug, value, rowIdx);
              const isPicked = picked.has(key);
              return (
                <BoardCell
                  key={key}
                  category={cat}
                  value={value}
                  isPicked={isPicked}
                  onPick={(c, v) => handlePick(c, v, rowIdx)}
                />
              );
            })
          )}
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap items-center gap-x-[22px] gap-y-2 font-en-body"
          style={{ color: 'var(--muted2)', fontSize: 9, letterSpacing: '0.08em', marginTop: 18 }}
          lang="en"
        >
          {TIER_LEGEND.map(({ label, bg, border }) => (
            <span key={label} className="flex items-center gap-2">
              <span style={{ width: 16, height: 16, background: bg, border: `3px solid ${border}` }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Score-adjust modal */}
      <ScoreAdjustDialog team={adjustingTeam} onClose={() => setAdjustingTeamId(null)} />
    </div>
  );
}
