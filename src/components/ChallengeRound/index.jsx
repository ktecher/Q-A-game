import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext';
import { cellKey } from '../../lib/cellKey';
import AcceptDialog from './AcceptDialog';
import NamingPhase from './NamingPhase';
import ResultDialog from './ResultDialog';

/* ─── ROOT · orchestrates the three phases ───────────────────────────── */

// The inner component is keyed on the challenge cell so a new challenge
// remounts it with fresh phase/state — no setState-in-effect needed.
function ChallengeInner() {
  const { state, awardChallenge, cancelChallenge } = useGame();
  const { currentChallenge, teams, activeTeamIdx } = state;
  const [phase, setPhase] = useState('accept'); // 'accept' | 'naming' | 'result'
  const [namingResult, setNamingResult] = useState(null);

  if (!currentChallenge) return null;

  const cellValue = currentChallenge.value;
  const activeTeam = teams[activeTeamIdx];

  const handleAccept = () => setPhase('naming');
  const handleDecline = () => cancelChallenge();
  const handleNamingEnd = (result) => {
    setNamingResult(result);
    setPhase('result');
  };
  const handleAward = (teamId) => awardChallenge(teamId);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <AnimatePresence mode="wait">
        {phase === 'accept' && (
          <AcceptDialog
            key="accept-phase"
            cellValue={cellValue}
            teamName={activeTeam.name}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
        {phase === 'naming' && (
          <NamingPhase
            key="naming-phase"
            prompt={currentChallenge.prompt}
            teams={teams}
            startingTeamIdx={activeTeamIdx}
            cellValue={cellValue}
            onEnd={handleNamingEnd}
          />
        )}
        {phase === 'result' && namingResult && (
          <ResultDialog
            key="result-phase"
            teams={teams}
            counts={namingResult.counts}
            chokeTeamIdx={namingResult.chokeTeamIdx}
            cellValue={cellValue}
            onAward={handleAward}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChallengeRound() {
  const { state } = useGame();
  const ch = state.currentChallenge;
  if (!ch) return null;
  // Key on the cell triple — when a NEW challenge starts, force a remount
  // so phase resets to 'accept' without needing a setState-in-effect.
  const key = cellKey(ch.categorySlug, ch.value, ch.rowIdx);
  return <ChallengeInner key={key} />;
}
