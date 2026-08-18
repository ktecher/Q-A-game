import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCode } from 'react-qr-code';
import { buildSketchUrl } from '../../lib/sketchEncoding';
import { formatTime } from '../../lib/format';
import { CANVAS_PAPER } from '../../lib/sketchTheme';
import useSketchSession from './useSketchSession';

const SKETCH_TIME = 60; // seconds — one shared clock both teams race against
const POLL_MS = 250; // clock granularity (sub-second so the round starts crisply)
const END_HOLD_MS = 900; // hold on the ended screen so the 'end' broadcast lands

/* ─── SKETCH STAGE · head-to-head Pictionary ───────────────────────────────
   Both teams draw at the same time on a split screen. Each team gets its own
   QR + word; once both drawers connect, a shared 60s clock starts. The host
   watches both canvases — the team whose word their group guesses first wins
   (the host awards on the result screen). */

// The handoff pins the sketch surface to cream paper (#F4ECD8 with a #D8CFB8
// inset) on both screens, so the canvas no longer follows the app theme. Ink
// therefore has to stay dark everywhere — useSketchSession's dark fallback is
// #ffffff, which would be invisible on this paper — and the phone is sent the
// light theme for the same reason.
const CANVAS_IS_DARK = false;

export default function SketchStage({ teams, challenge, onEnd }) {
  const sketch = challenge.sketch ?? [];

  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SKETCH_TIME);
  // Derived — no stored "phase", so no setState transition is needed for it.
  const phase = ended ? 'ended' : running ? 'running' : 'waiting';

  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const startAtRef = useRef(0);

  // One realtime session per team (index 0 = teams[0], 1 = teams[1]). The
  // returns are destructured straight away so refs and state stay distinct.
  const {
    canvasRef: canvasRefA,
    boxRef: boxRefA,
    subscribed: subscribedA,
    connected: connectedA,
  } = useSketchSession({
    sessionId: sketch[0]?.sessionId,
    isDark: CANVAS_IS_DARK,
    timeLeft: phase === 'running' ? timeLeft : null,
    ended,
    canvasMounted: phase !== 'waiting',
  });
  const {
    canvasRef: canvasRefB,
    boxRef: boxRefB,
    subscribed: subscribedB,
    connected: connectedB,
  } = useSketchSession({
    sessionId: sketch[1]?.sessionId,
    isDark: CANVAS_IS_DARK,
    timeLeft: phase === 'running' ? timeLeft : null,
    ended,
    canvasMounted: phase !== 'waiting',
  });

  // Both drawers are on — the host may now press Start. The round never
  // auto-starts; the host always controls the kickoff.
  const bothConnected = connectedA && connectedB;

  // Begin / end the shared round. The setState calls here only ever run from
  // an event handler or the poll callback below — never synchronously inside
  // an effect body — which is what react-hooks/set-state-in-effect requires.
  const beginRound = useCallback(() => {
    if (startedRef.current || endedRef.current) return;
    startedRef.current = true;
    startAtRef.current = Date.now();
    setRunning(true);
  }, []);
  const endRound = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
  }, []);

  // A polling clock — once the host presses Start it counts the round down off
  // a timestamp (set in beginRound) so the shared timer can't drift.
  useEffect(() => {
    const id = setInterval(() => {
      if (endedRef.current || !startedRef.current) return;
      const left = Math.max(
        0,
        SKETCH_TIME - Math.floor((Date.now() - startAtRef.current) / 1000),
      );
      setTimeLeft(left);
      if (left <= 0) endRound();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [endRound]);

  // Once ended, hand back to ChallengeScreen → ResultStage. The short delay
  // lets the final 'end' broadcast reach the phones before this unmounts.
  useEffect(() => {
    if (!ended) return undefined;
    const id = setTimeout(onEnd, END_HOLD_MS);
    return () => clearTimeout(id);
  }, [ended, onEnd]);

  const urgent = phase === 'running' && timeLeft <= 10;
  // Start stays locked until both phones are attached — the round is unplayable
  // for a team whose drawer never joined.
  const startDisabled = phase === 'waiting' && !bothConnected;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        // The bonus screen swaps the blue tilemap for the purple one.
        backgroundColor: 'var(--bg)',
        backgroundImage:
          'linear-gradient(var(--grid-alt) 2px, transparent 2px), linear-gradient(90deg, var(--grid-alt) 2px, transparent 2px)',
        backgroundSize: '32px 32px, 32px 32px',
      }}
    >
      <div className="text-center shrink-0" style={{ padding: '18px 16px 4px' }}>
        <div
          className="font-en-body leading-none animate-blink"
          style={{ fontSize: 14, color: 'var(--purple)', letterSpacing: '0.22em' }}
          lang="en"
        >
          ! BONUS DUEL !
        </div>
        <div
          className="font-ar-body font-extrabold leading-none"
          style={{
            fontSize: 'clamp(34px, 5vw, 62px)',
            color: 'var(--gold-ink)',
            marginTop: 10,
            textShadow: '6px 6px 0 var(--purple-d)',
          }}
        >
          جولة التحدّي
        </div>
        <div
          className="font-en-body leading-none"
          style={{ fontSize: 11, color: 'var(--text)', letterSpacing: '0.14em', marginTop: 12 }}
          lang="en"
        >
          DOUBLE POINTS · {challenge.value * 2} PTS · DRAW IT ON YOUR PHONE
        </div>
      </div>

      <div
        className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2"
        style={{ gap: 24, padding: '20px 32px 8px' }}
      >
        <TeamPanel
          team={teams[0]}
          index={0}
          word={sketch[0]}
          timeLabel={formatTime(timeLeft)}
          urgent={urgent}
          scanning={phase === 'waiting'}
          canvasRef={canvasRefA}
          boxRef={boxRefA}
          subscribed={subscribedA}
          connected={connectedA}
        />
        <TeamPanel
          team={teams[1]}
          index={1}
          word={sketch[1]}
          timeLabel={formatTime(timeLeft)}
          urgent={urgent}
          scanning={phase === 'waiting'}
          canvasRef={canvasRefB}
          boxRef={boxRefB}
          subscribed={subscribedB}
          connected={connectedB}
        />
      </div>

      {/* Host controls — not on the sheet, but the round needs a start/end. */}
      <footer
        className="shrink-0 flex items-center justify-between gap-4 flex-wrap"
        style={{ padding: '14px 32px 22px' }}
      >
        <span
          className="font-en-body"
          style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.8, letterSpacing: '0.08em' }}
          lang="en"
        >
          {phase !== 'waiting'
            ? 'EACH TEAM GUESSES ITS OWN DRAWING — FIRST TO GET IT WINS'
            : bothConnected
              ? 'BOTH DRAWERS CONNECTED · PRESS START'
              : 'BOTH TEAMS SCAN THEIR QR · THEN PRESS START'}
        </span>
        <div className="flex items-center" style={{ gap: 14 }}>
          {phase === 'waiting' && (
            <button
              type="button"
              onClick={endRound}
              className="transition-transform duration-100 hover:-translate-y-[3px] active:translate-y-[3px]"
              style={{
                padding: '12px 20px',
                background: 'var(--panel2)',
                border: '4px solid var(--line)',
                boxShadow: '0 8px 0 var(--shadow)',
                color: 'var(--text)',
              }}
            >
              <span className="font-ar-body font-bold leading-none" style={{ fontSize: 26 }}>
                تخطّي
              </span>{' '}
              <span
                className="font-en-body leading-none"
                style={{ fontSize: 10, color: 'var(--muted)' }}
                lang="en"
              >
                SKIP
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={phase === 'waiting' ? beginRound : endRound}
            disabled={phase === 'waiting' && !bothConnected}
            className="transition-transform duration-100 enabled:hover:-translate-y-[3px] enabled:active:translate-y-[3px] disabled:cursor-not-allowed"
            style={{
              padding: '12px 24px',
              background: startDisabled
                ? 'var(--cleared-bg)'
                : 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
              border: `4px solid ${startDisabled ? 'var(--line)' : 'var(--outline)'}`,
              boxShadow: startDisabled ? 'none' : '0 8px 0 var(--gold-sh)',
              color: startDisabled ? 'var(--muted2)' : 'var(--outline)',
              opacity: startDisabled ? 0.45 : 1,
            }}
          >
            <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 30 }}>
              {phase === 'waiting' ? 'ابدأ الجولة' : 'إنهاء الجولة'}
            </span>{' '}
            <span className="font-en-body leading-none" style={{ fontSize: 11 }} lang="en">
              {phase === 'waiting' ? 'START' : 'END'}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}

/* One half of the split screen. Two states, switched together by the host:
   - scanning: a full-panel QR for that team's drawer to scan
   - drawing:  the live canvas, from the moment the host presses Start
   The sheet draws both at once, but that's a mock of the mid-round state — it
   never showed the scan step, and a footer-sized QR is unscannable across a
   room. */
function TeamPanel({ team, index, word, timeLabel, urgent, scanning, canvasRef, boxRef, subscribed, connected }) {
  const accent = index === 0 ? 'var(--blue)' : 'var(--red)';
  const qrUrl = word
    ? buildSketchUrl({
        origin: window.location.origin,
        titleAr: word.prompt.ar,
        titleEn: word.prompt.en,
        lang: 'ar',
        sessionId: word.sessionId,
        catAr: word.catAr,
        catEn: word.catEn,
        theme: 'light',
      })
    : '';

  return (
    <div
      className="flex flex-col min-h-0"
      style={{
        gap: 14,
        padding: 18,
        background: 'var(--panel)',
        border: `4px solid ${accent}`,
        boxShadow: '0 8px 0 var(--shadow)',
      }}
    >
      <div className="flex items-center justify-between gap-3 shrink-0">
        <span className="font-en-body leading-none truncate" style={{ fontSize: 11, color: accent }}>
          <span lang="en">P{index + 1} · </span>
          <span className="font-ar-body font-bold" style={{ fontSize: 24 }}>
            {team.name}
          </span>
        </span>
        {scanning ? (
          <span className="flex items-center gap-2 shrink-0">
            <span
              className={connected ? '' : 'animate-blink'}
              style={{ width: 12, height: 12, background: connected ? 'var(--green)' : 'var(--line)' }}
              aria-hidden="true"
            />
            <span
              className="font-en-body leading-none"
              style={{ fontSize: 10, color: connected ? 'var(--green)' : 'var(--muted2)' }}
              lang="en"
            >
              {connected ? 'READY' : 'WAITING'}
            </span>
          </span>
        ) : (
          <span
            className={`font-en-body leading-none shrink-0 ${urgent ? 'animate-flash' : ''}`}
            style={{ fontSize: 11, color: urgent ? 'var(--red-ink)' : 'var(--gold-ink)' }}
            lang="en"
          >
            {timeLabel}
          </span>
        )}
      </div>

      {scanning ? (
        <>
          {/* Full-panel scan target */}
          <div
            className="flex-1 min-h-0 grid place-items-center"
            style={{
              background: '#F4ECD8',
              border: '4px solid var(--outline)',
              boxShadow: 'inset 0 0 0 4px #D8CFB8',
              padding: 16,
            }}
          >
            {subscribed && qrUrl ? (
              <QRCode
                value={qrUrl}
                size={320}
                bgColor="#F4ECD8"
                fgColor="#070A12"
                level="M"
                viewBox="0 0 320 320"
                style={{ width: '100%', height: '100%', maxWidth: 340, maxHeight: '100%' }}
              />
            ) : (
              <span
                className="font-en-body leading-none animate-blink"
                style={{ fontSize: 11, color: 'var(--outline)' }}
                lang="en"
              >
                PREPARING…
              </span>
            )}
          </div>
          <div className="text-center shrink-0">
            <div
              className="font-ar-body font-bold leading-none"
              style={{ fontSize: 28, color: 'var(--text)' }}
            >
              امسح للرسم
            </div>
            <div
              className="font-en-body leading-none"
              style={{ fontSize: 9, color: connected ? 'var(--green)' : 'var(--muted)', marginTop: 6 }}
              lang="en"
            >
              {connected ? 'DRAWER CONNECTED' : 'ONE PLAYER SCANS · SEES THE WORD · DRAWS IT'}
            </div>
          </div>
        </>
      ) : (
        // useSketchSession measures `box.parentElement` and then sets an explicit
        // width/height on the box itself, so the box needs a plain flex wrapper
        // to measure against — it can't be the flex child directly.
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div
            ref={boxRef}
            className="overflow-hidden"
            style={{
              background: CANVAS_PAPER.light,
              border: '4px solid var(--outline)',
              boxShadow: 'inset 0 0 0 4px #D8CFB8',
            }}
          >
            <canvas ref={canvasRef} className="block w-full h-full" />
          </div>
        </div>
      )}
    </div>
  );
}
