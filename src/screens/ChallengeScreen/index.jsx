import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext';
import SwordIntro from './SwordIntro';
import AcceptStage from './AcceptStage';
import NamingStage from './NamingStage';
import SketchStage from './SketchStage';
import ResultStage from './ResultStage';

/**
 * ChallengeScreen — full-screen route for the challenge flow.
 *
 * Phase machine: intro → accept → naming|sketch → result.
 * Each stage owns its own layout; this screen just plumbs phase state and
 * dispatches game-state actions on accept/decline/award.
 */
export default function ChallengeScreen() {
  const navigate = useNavigate();
  const { state, awardChallenge, cancelChallenge } = useGame();
  const { currentChallenge, teams, activeTeamIdx } = state;

  const [phase, setPhase] = useState('intro'); // 'intro' | 'accept' | 'naming' | 'sketch' | 'result'
  const [challengeResult, setChallengeResult] = useState(null);

  // Bounce back to /play if there's no challenge in flight (refresh, direct URL hit, post-award)
  useEffect(() => {
    if (!currentChallenge) {
      navigate(state.started ? '/play' : '/setup', { replace: true });
    }
  }, [currentChallenge, state.started, navigate]);

  if (!currentChallenge) return null;

  const cellValue = currentChallenge.value;
  const activeTeam = teams[activeTeamIdx];

  const handleAccept = () =>
    setPhase(currentChallenge.variant === 'sketch' ? 'sketch' : 'naming');
  const handleDecline = () => {
    // CANCEL_CHALLENGE sets currentCell — BoardScreen's useEffect routes to /play/question
    cancelChallenge();
    navigate('/play');
  };
  const handleNamingEnd = (result) => {
    setChallengeResult(result);
    setPhase('result');
  };
  // Sketch rounds have no choke/count — the host judges the result manually.
  const handleSketchEnd = () => {
    setChallengeResult({ counts: [0, 0], chokeTeamIdx: null, mode: 'sketch' });
    setPhase('result');
  };
  const handleAward = (teamId) => {
    awardChallenge(teamId);
    navigate('/play');
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-transparent">
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <SwordIntro key="intro-phase" onComplete={() => setPhase('accept')} />
        )}
        {phase === 'accept' && (
          <AcceptStage
            key="accept-phase"
            cellValue={cellValue}
            team={activeTeam}
            variant={currentChallenge.variant}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
        {phase === 'naming' && (
          <NamingStage
            key="naming-phase"
            prompt={currentChallenge.prompt}
            teams={teams}
            startingTeamIdx={activeTeamIdx}
            cellValue={cellValue}
            onEnd={handleNamingEnd}
          />
        )}
        {phase === 'sketch' && (
          <SketchStage
            key="sketch-phase"
            team={activeTeam}
            otherTeam={teams[1 - activeTeamIdx]}
            challenge={currentChallenge}
            onEnd={handleSketchEnd}
          />
        )}
        {phase === 'result' && challengeResult && (
          <ResultStage
            key="result-phase"
            teams={teams}
            counts={challengeResult.counts}
            chokeTeamIdx={challengeResult.chokeTeamIdx}
            cellValue={cellValue}
            mode={challengeResult.mode}
            word={currentChallenge.prompt}
            onAward={handleAward}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
