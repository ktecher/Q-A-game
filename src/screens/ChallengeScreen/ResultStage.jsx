/* ─── RESULT STAGE · full-screen winner reveal ─────────────────────────
   Two big team cards side-by-side. Clicking a card awards that team.
   The other-team card is crowned when it wins automatically (opponent choked).
   A smaller "No award" button below lets the host deny the award. */

// P1 is the blue side of the cabinet, P2 the red one — same as the board HUD.
const SIDES = [
  { border: 'var(--blue)', panel: 'var(--blue-p)', ink: 'var(--blue)', label: 'P1' },
  { border: 'var(--red)', panel: 'var(--red-p)', ink: 'var(--red)', label: 'P2' },
];

export default function ResultStage({
  teams,
  counts,
  chokeTeamIdx,
  cellValue,
  mode,
  sketchWords,
  onAward,
}) {
  const autoWinnerIdx = chokeTeamIdx !== null ? 1 - chokeTeamIdx : null;
  const award = cellValue * 2;
  const isSketch = mode === 'sketch';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        padding: '26px 32px 30px',
        backgroundColor: 'var(--bg)',
        backgroundImage:
          'linear-gradient(var(--grid-alt) 2px, transparent 2px), linear-gradient(90deg, var(--grid-alt) 2px, transparent 2px)',
        backgroundSize: '32px 32px, 32px 32px',
      }}
    >
      {/* Header */}
      <div className="text-center shrink-0">
        <div
          className="font-en-body leading-none"
          style={{ fontSize: 12, color: 'var(--purple)', letterSpacing: '0.22em' }}
          lang="en"
        >
          BONUS DUEL · {award} PTS
        </div>
        <h1
          className="font-ar-body font-extrabold leading-none"
          style={{
            fontSize: 'clamp(34px, 5vw, 62px)',
            color: 'var(--gold-ink)',
            marginTop: 12,
            textShadow: '6px 6px 0 var(--purple-d)',
          }}
        >
          {autoWinnerIdx !== null ? `${teams[autoWinnerIdx].name} فاز` : 'من يستحق الفوز؟'}
        </h1>
        <p
          className="font-en-body leading-none uppercase"
          style={{ fontSize: 11, color: 'var(--text)', letterSpacing: '0.14em', marginTop: 12 }}
          lang="en"
        >
          {autoWinnerIdx !== null
            ? `${teams[autoWinnerIdx].nameEn} WINS — OPPONENT CHOKED`
            : 'ONE TEAM TAKES THE BLOCK'}
        </p>

        {isSketch && sketchWords && (
          <div className="flex flex-wrap justify-center" style={{ gap: 14, marginTop: 18 }}>
            {teams.map((t, i) =>
              sketchWords[i] ? (
                <div
                  key={t.id}
                  className="text-center"
                  style={{
                    padding: '10px 16px',
                    background: 'var(--cleared-bg)',
                    border: `4px solid ${SIDES[i].border}`,
                  }}
                >
                  <div
                    className="font-en-body leading-none uppercase"
                    style={{ fontSize: 9, color: 'var(--muted2)', letterSpacing: '0.2em' }}
                    lang="en"
                  >
                    {SIDES[i].label} WORD
                  </div>
                  <div
                    className="font-ar-body font-bold leading-none"
                    style={{ fontSize: 30, color: 'var(--text)', marginTop: 8 }}
                  >
                    {sketchWords[i].ar}
                  </div>
                  <div
                    className="font-en-body leading-none uppercase"
                    style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6 }}
                    lang="en"
                  >
                    {sketchWords[i].en}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Team cards */}
      <div
        className="flex-1 grid grid-cols-1 md:grid-cols-2 w-full mx-auto items-stretch"
        style={{ maxWidth: 1000, gap: 18, marginTop: 22 }}
      >
        {teams.map((team, idx) => (
          <TeamResultCard
            key={team.id}
            team={team}
            side={SIDES[idx]}
            count={counts[idx]}
            choked={chokeTeamIdx === idx}
            isAutoWinner={autoWinnerIdx === idx}
            award={award}
            hideCount={isSketch}
            onClick={() => onAward(team.id)}
          />
        ))}
      </div>

      {/* No-award option */}
      <div className="flex justify-center shrink-0" style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={() => onAward(null)}
          className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
          style={{
            minWidth: 150,
            padding: 18,
            background: 'var(--cleared-bg)',
            border: '4px solid var(--line)',
          }}
        >
          <div className="font-en-body leading-none" style={{ fontSize: 16, color: 'var(--muted2)' }}>
            <span aria-hidden="true">✕</span>
          </div>
          <div
            className="font-ar-body font-bold leading-none"
            style={{ fontSize: 30, color: 'var(--muted)', marginTop: 8 }}
          >
            بلا منح
          </div>
          <div
            className="font-en-body leading-none"
            style={{ fontSize: 9, color: 'var(--muted2)', marginTop: 8 }}
            lang="en"
          >
            NO AWARD
          </div>
        </button>
      </div>
    </div>
  );
}

function TeamResultCard({ team, side, count, choked, isAutoWinner, award, hideCount, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-center text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
      style={{
        gap: 10,
        padding: 22,
        background: side.panel,
        border: `4px solid ${isAutoWinner ? 'var(--gold)' : side.border}`,
        boxShadow: isAutoWinner ? '0 8px 0 var(--gold-sh)' : '0 8px 0 var(--shadow)',
      }}
    >
      {isAutoWinner && (
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
          WINNER
        </span>
      )}

      <span
        className="font-en-body leading-none"
        style={{ fontSize: 10, color: side.ink, letterSpacing: '0.1em' }}
        lang="en"
      >
        AWARD {side.label}
      </span>
      <span
        className="font-ar-body font-bold leading-none truncate max-w-full"
        style={{ fontSize: 34, color: 'var(--text)' }}
      >
        {team.name}
      </span>

      {!hideCount && (
        <>
          <span
            className="font-ar-body font-extrabold leading-none"
            style={{ fontSize: 64, color: side.ink }}
            dir="ltr"
          >
            {count}
          </span>
          <span
            className="font-en-body leading-none"
            style={{ fontSize: 9, color: 'var(--muted)' }}
            lang="en"
          >
            NAMED
          </span>
        </>
      )}

      {choked && (
        <span
          className="font-en-body leading-none"
          style={{
            fontSize: 9,
            color: 'var(--red-ink)',
            background: 'var(--cleared-bg)',
            border: '4px solid var(--red)',
            padding: '6px 10px',
          }}
          lang="en"
        >
          ✕ CHOKED
        </span>
      )}

      <span
        className="font-ar-body font-extrabold leading-none"
        style={{ fontSize: 46, color: side.ink }}
        dir="ltr"
      >
        +{award}
      </span>
    </button>
  );
}
