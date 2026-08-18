import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext';
import DuelIntro from './DuelIntro';
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
  // The intro outlives its own phase: it flips to `accept` while its pixel wipe
  // covers the screen, then stays mounted on top until the blocks finish
  // clearing — so they uncover AcceptStage instead of uncovering the intro.
  const [introVisible, setIntroVisible] = useState(true);
  const [challengeResult, setChallengeResult] = useState(null);

  // Bounce back to /play if there's no challenge in flight (refresh, direct URL hit, post-award)
  useEffect(() => {
    if (!currentChallenge) {
      navigate(state.started ? '/play' : '/setup', { replace: true });
    }
  }, [currentChallenge, state.started, navigate]);

  // Sketch rounds have no choke/count — the host judges the result manually.
  // Memoised (a hook, so it must precede the early return): SketchStage holds
  // it in an effect dependency while ending the round.
  // Both intro callbacks are memoised for the same reason handleSketchEnd is:
  // DuelIntro holds them in an effect dependency that owns its beat timers, so
  // a fresh identity on every parent render would tear those timers down and
  // restart the 3.5s timeline — onCover flipping the phase is itself a render.
  const handleIntroCover = useCallback(() => setPhase('accept'), []);
  const handleIntroDone = useCallback(() => setIntroVisible(false), []);

  const handleSketchEnd = useCallback(() => {
    setChallengeResult({ counts: [0, 0], chokeTeamIdx: null, mode: 'sketch' });
    setPhase('result');
  }, []);

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
  const handleAward = (teamId) => {
    awardChallenge(teamId);
    navigate('/play');
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-transparent">
      {introVisible && (
        <DuelIntro
          key="intro-phase"
          onCover={handleIntroCover}
          onComplete={handleIntroDone}
          duration={3.5}
          variant={currentChallenge.variant}
          teams={teams}
          activeTeamIdx={activeTeamIdx}
          points={cellValue * 2}
        />
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
          teams={teams}
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
          sketchWords={currentChallenge.sketch?.map((s) => s.prompt)}
          onAward={handleAward}
        />
      )}
    </div>
  );
}
