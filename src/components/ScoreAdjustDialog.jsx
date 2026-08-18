import { useGame } from '../contexts/GameContext';
import { formatScore } from '../lib/format';
import Modal from './Modal';

const PRESETS = [50, 100, 200, 400, 600];

/**
 * Score-adjust modal — opens when user taps a team block in the board HUD.
 * Presets +/- 50/100/200/400/600 apply immediately and stack so multiple
 * taps compose. The "Reset to 0" button hard-resets the team's score.
 *
 * Props:
 *   team    — the team object (or null when closed)
 *   onClose — () => void; called on backdrop click, X, Esc, or "Done"
 */
export default function ScoreAdjustDialog({ team, onClose }) {
  const { adjustScore } = useGame();
  const open = !!team;

  if (!team) return null;

  const apply = (delta) => adjustScore(team.id, delta);
  const resetToZero = () => adjustScore(team.id, -team.score);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="adjust-score-title"
      className="w-full max-w-md"
      style={{ padding: '28px 32px', borderColor: team.color }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute font-en-body leading-none"
        style={{ top: 10, insetInlineEnd: 12, fontSize: 12, color: 'var(--red)' }}
      >
        <span aria-hidden="true">✕</span>
      </button>

      {/* Header — team identity + current score */}
      <div className="flex flex-col items-center text-center" style={{ gap: 8 }}>
        <span
          id="adjust-score-title"
          className="font-en-body leading-none"
          style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}
        >
          <span lang="en">ADJUST SCORE · </span>تعديل النتيجة
        </span>
        <div className="flex items-center" style={{ gap: 10 }}>
          <span
            className="shrink-0"
            style={{ width: 22, height: 22, background: team.color, border: '3px solid var(--outline)' }}
          />
          <span
            className="font-ar-body font-bold leading-none truncate"
            style={{ fontSize: 30, color: 'var(--text)' }}
          >
            {team.name}
          </span>
        </div>
        <span
          className="font-ar-body font-extrabold leading-none tabular-nums"
          style={{ fontSize: 56, color: 'var(--gold-ink)', textShadow: '4px 4px 0 var(--gold-sh)' }}
          dir="ltr"
        >
          {formatScore(team.score)}
        </span>
      </div>

      {/* Preset adjustment grid */}
      <div className="grid grid-cols-5" style={{ gap: 6, marginTop: 20 }}>
        {PRESETS.map((amount) => (
          <PresetButton key={`minus-${amount}`} amount={amount} sign="−" tone="red" onClick={() => apply(-amount)} />
        ))}
        {PRESETS.map((amount) => (
          <PresetButton key={`plus-${amount}`} amount={amount} sign="+" tone="gold" onClick={() => apply(amount)} />
        ))}
      </div>

      {/* Helper actions */}
      <div
        className="flex items-center justify-between gap-3"
        style={{ marginTop: 20, paddingTop: 16, borderTop: '4px solid var(--line)' }}
      >
        <button
          type="button"
          onClick={resetToZero}
          disabled={team.score === 0}
          className="font-en-body leading-none disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.08em' }}
          lang="en"
        >
          RESET TO 0
        </button>
        <button
          type="button"
          onClick={onClose}
          className="transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
            border: '4px solid var(--outline)',
            boxShadow: '0 8px 0 var(--gold-sh)',
            color: 'var(--outline)',
          }}
        >
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 28 }}>
            تم
          </span>{' '}
          <span className="font-en-body leading-none" style={{ fontSize: 10 }} lang="en">
            DONE
          </span>
        </button>
      </div>
    </Modal>
  );
}

function PresetButton({ amount, sign, tone, onClick }) {
  const isGold = tone === 'gold';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center transition-transform duration-100 active:translate-y-[2px]"
      style={{
        padding: '8px 2px',
        background: isGold ? 'var(--panel3)' : 'var(--red-p)',
        border: `4px solid ${isGold ? 'var(--gold)' : 'var(--red)'}`,
        color: isGold ? 'var(--gold-ink)' : 'var(--red-ink)',
      }}
    >
      <span className="font-en-body leading-none" style={{ fontSize: 9 }} aria-hidden="true">
        {sign}
      </span>
      <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 24, marginTop: 4 }} dir="ltr">
        {amount}
      </span>
    </button>
  );
}
