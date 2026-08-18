
/* ─── ACCEPT STAGE · full-screen redesign of the challenge offer ─────── */

export default function AcceptStage({ cellValue, team, variant, onAccept, onDecline }) {
  const isSketch = variant === 'sketch';
  const rules = isSketch
    ? [
        {
          square: 'var(--purple)',
          ar: 'كلا الفريقين يرسمان معًا — رسّام واحد لكل فريق',
          en: 'Both teams draw at once — one drawer per team',
        },
        {
          square: 'var(--gold)',
          ar: 'كل فريق يمسح رمزه ويرسم كلمته السرية المختلفة',
          en: 'Each team scans its own QR and draws its own secret word',
        },
        {
          square: 'var(--blue)',
          ar: '٦٠ ثانية — أول فريق يخمّن كلمته يفوز',
          en: '60 seconds — first team to guess its word wins',
        },
        {
          square: 'var(--green)',
          ar: `الفائز يحصل على ضعف النقاط (${cellValue * 2})`,
          en: `Winner takes 2× points (${cellValue * 2})`,
        },
      ]
    : [
        {
          square: 'var(--purple)',
          ar: 'لاعب من كل فريق يتنافس وجهًا لوجه',
          en: 'One player from each team faces off',
        },
        {
          square: 'var(--blue)',
          ar: '٣٠ ثانية مشتركة، يتبادلان الإجابة كلمة بكلمة',
          en: '30 seconds shared, alternating word-by-word',
        },
        {
          square: 'var(--red)',
          ar: 'من يعجز عن الإجابة في دوره يخسر',
          en: 'If you choke on your turn, you lose',
        },
        {
          square: 'var(--green)',
          ar: `الفائز يحصل على ضعف النقاط (${cellValue * 2})`,
          en: `Winner takes 2× points (${cellValue * 2})`,
        },
      ];
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundColor: 'var(--bg)',
        backgroundImage:
          'linear-gradient(var(--grid-alt) 2px, transparent 2px), linear-gradient(90deg, var(--grid-alt) 2px, transparent 2px)',
        backgroundSize: '32px 32px, 32px 32px',
      }}
    >
      <div
        className="w-full text-center"
        style={{
          maxWidth: 720,
          background: 'var(--panel)',
          border: '6px solid var(--purple)',
          boxShadow: 'inset 0 0 0 4px var(--outline), 0 10px 0 var(--shadow)',
          padding: '36px 40px',
        }}
      >
        <div
          className="font-en-body leading-none animate-blink"
          style={{ fontSize: 14, color: 'var(--purple)', letterSpacing: '0.22em' }}
          lang="en"
        >
          ! BONUS DUEL !
        </div>

        <h1
          className="font-ar-body font-extrabold leading-none"
          style={{
            fontSize: 'clamp(34px, 5vw, 62px)',
            color: 'var(--gold-ink)',
            marginTop: 10,
            textShadow: '6px 6px 0 var(--purple-d)',
          }}
        >
          جولة التحدّي
        </h1>
        <p
          className="font-en-body leading-none"
          style={{ fontSize: 11, color: 'var(--text)', letterSpacing: '0.14em', marginTop: 12 }}
          lang="en"
        >
          {isSketch ? 'SKETCH DUEL' : 'NAMING DUEL'} · {cellValue * 2} PTS
        </p>

        {/* Which team tripped the cell */}
        <div
          className="inline-flex items-center justify-center"
          style={{
            gap: 12,
            marginTop: 22,
            padding: '10px 16px',
            background: 'var(--cleared-bg)',
            border: '4px solid var(--line)',
          }}
        >
          <span
            className="shrink-0"
            style={{ width: 22, height: 22, background: team.color, border: '3px solid var(--outline)' }}
          />
          <span
            className="font-ar-body font-bold leading-none"
            style={{ fontSize: 26, color: 'var(--text)' }}
          >
            {team.name} وقع على تحدٍ
          </span>
        </div>

        {/* Rules */}
        <div className="flex flex-col text-start" style={{ gap: 10, marginTop: 26 }}>
          {rules.map((r, i) => (
            <Rule key={i} square={r.square} ar={r.ar} en={r.en} />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex" style={{ gap: 14, marginTop: 28 }}>
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              padding: 16,
              background: 'var(--panel2)',
              border: '4px solid var(--blue)',
              boxShadow: '0 8px 0 var(--shadow)',
              color: 'var(--text)',
            }}
          >
            <span className="font-ar-body font-bold leading-none" style={{ fontSize: 30 }}>
              رفض
            </span>{' '}
            <span
              className="font-en-body leading-none"
              style={{ fontSize: 10, color: 'var(--muted)' }}
              lang="en"
            >
              NORMAL Q
            </span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="text-center transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
            style={{
              flex: 1.5,
              padding: 16,
              background: 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
              border: '4px solid var(--outline)',
              boxShadow: '0 8px 0 var(--gold-sh)',
              color: 'var(--outline)',
            }}
          >
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 34 }}>
              قبول
            </span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
              2× POINTS
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Rule({ square, ar, en }) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 12,
        padding: '10px 12px',
        background: 'var(--panel2)',
        border: '4px solid var(--line)',
      }}
    >
      <span className="shrink-0" style={{ width: 22, height: 22, background: square }} />
      <div className="min-w-0">
        <div
          className="font-ar-body font-bold leading-none"
          style={{ fontSize: 26, color: 'var(--text)' }}
        >
          {ar}
        </div>
        <div
          className="font-en-body leading-none uppercase"
          style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6 }}
          lang="en"
        >
          {en}
        </div>
      </div>
    </div>
  );
}
