// Rail team card for the split-stage question screen: a colour block, the team
// name, and a one-word state. Replaces the old gradient chip.
//
// status: 'answering' | 'waiting' | 'done'
const STATUS = {
  answering: { en: 'ANSWERING…', color: 'var(--gold-ink)', blink: true },
  waiting: { en: 'WAITING', color: 'var(--muted2)', blink: false },
  done: { en: 'DONE', color: 'var(--muted2)', blink: false },
};

export default function TeamCell({ team, status, accent }) {
  const isAnswering = status === 'answering';
  const s = STATUS[status] ?? STATUS.done;

  return (
    <div
      className="flex items-center gap-2.5"
      style={{
        padding: 10,
        background: isAnswering ? 'var(--blue-p)' : 'var(--panel)',
        border: `4px solid ${isAnswering ? accent : 'var(--line)'}`,
      }}
    >
      <span
        className="shrink-0"
        style={{
          width: 34,
          height: 34,
          background: team.color,
          border: '3px solid var(--outline)',
        }}
      />
      <div className="min-w-0">
        <div
          className="font-ar-body font-bold leading-none truncate"
          style={{ fontSize: 24, color: isAnswering ? 'var(--text)' : 'var(--muted)' }}
        >
          {team.name}
        </div>
        <div
          className={`font-en-body leading-none ${s.blink ? 'animate-blink' : ''}`}
          style={{ fontSize: 9, color: s.color, marginTop: 4 }}
          lang="en"
        >
          {s.en}
        </div>
      </div>
    </div>
  );
}
