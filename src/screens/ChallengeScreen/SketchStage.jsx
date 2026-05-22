import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { QRCode } from 'react-qr-code';
import { Zap, X as XIcon, Play } from 'lucide-react';
import { buildSketchUrl } from '../../lib/sketchEncoding';
import { useTheme } from '../../contexts/ThemeContext';
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

export default function SketchStage({ teams, challenge, onEnd }) {
  const { isDark } = useTheme();
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
    isDark,
    timeLeft: phase === 'running' ? timeLeft : null,
    ended,
  });
  const {
    canvasRef: canvasRefB,
    boxRef: boxRefB,
    subscribed: subscribedB,
    connected: connectedB,
  } = useSketchSession({
    sessionId: sketch[1]?.sessionId,
    isDark,
    timeLeft: phase === 'running' ? timeLeft : null,
    ended,
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

  return (
    <motion.div
      key="sketch"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col px-3 py-3 md:px-6 md:py-5"
    >
      {/* Header — title + the shared timer */}
      <header className="flex items-center justify-between gap-3 mb-3">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-ar-ui font-semibold bg-gold/15 border border-gold-faint"
          style={{ color: 'var(--color-gold)' }}
        >
          <Zap size={15} />
          تحدي الرسم
          <span className="font-en-body normal-case opacity-80" lang="en">
            · Sketch Duel
          </span>
        </div>
        {phase === 'running' ? (
          <div
            className="font-en-display font-bold leading-none shrink-0"
            style={{
              fontSize: 'clamp(36px, 6vw, 68px)',
              letterSpacing: '-0.04em',
              color: urgent ? '#C44150' : 'var(--color-gold)',
              textShadow: urgent ? 'var(--glow-text-crimson-wide)' : 'var(--glow-text-gold-deep)',
            }}
          >
            {timeLeft}
          </div>
        ) : (
          <span className="font-ar-ui text-sm text-cream-60 text-end">
            {phase === 'ended'
              ? 'انتهت الجولة'
              : bothConnected
                ? 'الفريقان جاهزان'
                : 'في انتظار الرسّامين'}
            <span className="font-en-body italic text-xs opacity-70 ms-1" lang="en">
              ·{' '}
              {phase === 'ended'
                ? 'Round over'
                : bothConnected
                  ? 'Both teams ready'
                  : 'Waiting for drawers'}
            </span>
          </span>
        )}
      </header>

      {/* Split canvases — one panel per team */}
      <div className="flex-1 grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1 gap-3 md:gap-4 min-h-0">
        <TeamPanel
          team={teams[0]}
          word={sketch[0]}
          isDark={isDark}
          started={phase !== 'waiting'}
          canvasRef={canvasRefA}
          boxRef={boxRefA}
          subscribed={subscribedA}
          connected={connectedA}
        />
        <TeamPanel
          team={teams[1]}
          word={sketch[1]}
          isDark={isDark}
          started={phase !== 'waiting'}
          canvasRef={canvasRefB}
          boxRef={boxRefB}
          subscribed={subscribedB}
          connected={connectedB}
        />
      </div>

      {/* Footer — host controls */}
      <footer className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {phase === 'waiting' ? (
            <>
              <p className="font-ar-ui text-sm text-cream">
                بعد أن يمسح الفريقان الرمزين، اضغط «ابدأ الجولة»
              </p>
              <p className="font-en-body text-xs text-cream-60 italic" lang="en">
                Once both teams have scanned their QR, press Start round.
              </p>
            </>
          ) : (
            <>
              <p className="font-ar-ui text-sm text-cream">
                كل فريق يخمّن رسمته — أول فريق يعرف كلمته يفوز!
              </p>
              <p className="font-en-body text-xs text-cream-60 italic" lang="en">
                Each team guesses its own drawing — first team to get it wins.
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {phase === 'waiting' ? (
            <>
              <button
                type="button"
                onClick={endRound}
                className="btn-outline inline-flex items-center gap-2 px-4 py-2.5 rounded-xl"
              >
                <XIcon size={15} />
                <span className="font-ar-ui text-sm font-semibold">تخطّي</span>
                <span className="font-en-body text-xs opacity-70" lang="en">
                  · Skip
                </span>
              </button>
              <button
                type="button"
                onClick={beginRound}
                className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl"
              >
                <Play size={15} />
                <span className="font-ar-ui text-sm font-semibold">ابدأ الجولة</span>
                <span className="font-en-body text-xs opacity-80" lang="en">
                  · Start round
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={endRound}
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl"
            >
              <XIcon size={15} />
              <span className="font-ar-ui text-sm font-semibold">إنهاء الجولة</span>
              <span className="font-en-body text-xs opacity-80" lang="en">
                · End round
              </span>
            </button>
          )}
        </div>
      </footer>
    </motion.div>
  );
}

/* One half of the split screen: a team's QR (before its drawer connects) or
   its live canvas (after). */
function TeamPanel({ team, word, isDark, started, canvasRef, boxRef, subscribed, connected }) {
  // Show the QR only until the round is under way; once it starts keep the
  // canvas up even if this team's presence briefly flickers.
  const showCanvas = started || connected;
  const qrUrl = word
    ? buildSketchUrl({
        origin: window.location.origin,
        titleAr: word.prompt.ar,
        titleEn: word.prompt.en,
        lang: 'ar',
        sessionId: word.sessionId,
        catAr: word.catAr,
        catEn: word.catEn,
        theme: isDark ? 'dark' : 'light',
      })
    : '';

  return (
    <div
      className="flex flex-col min-h-0 rounded-2xl p-3"
      style={{
        background: `linear-gradient(150deg, ${team.color}26, var(--color-ink-50))`,
        border: `2px solid ${team.color}aa`,
      }}
    >
      {/* Team label + connection status */}
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: team.color }}
            aria-hidden="true"
          />
          <span className="font-ar-ui text-base text-cream truncate">{team.name}</span>
          <span className="font-en-body text-xs text-cream-60 italic truncate" lang="en">
            · {team.nameEn}
          </span>
        </div>
        {connected ? (
          <span
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0"
            style={{ background: `${team.color}33`, border: `1px solid ${team.color}`, color: team.color }}
          >
            ● يرسم
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 bg-ink-80 border border-gold-faint text-cream-45">
            ○ في الانتظار
          </span>
        )}
      </div>

      {/* Live canvas once the round is under way; the QR to scan before that */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {showCanvas ? (
          <div
            ref={boxRef}
            className="rounded-xl overflow-hidden"
            style={{
              background: isDark ? CANVAS_PAPER.dark : CANVAS_PAPER.light,
              boxShadow: '0 10px 32px rgba(0, 0, 0, 0.45)',
            }}
          >
            <canvas ref={canvasRef} className="block w-full h-full" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            {subscribed && qrUrl ? (
              <div className="bg-white rounded-2xl p-3 inline-block">
                <QRCode value={qrUrl} size={168} bgColor="#FFFFFF" fgColor="#0A0F1A" level="M" />
              </div>
            ) : (
              <div className="w-[192px] h-[192px] rounded-2xl bg-ink-80 border border-gold-faint flex items-center justify-center">
                <span className="font-ar-ui text-sm text-cream-45">جارٍ التحضير…</span>
              </div>
            )}
            <p className="font-ar-ui text-sm text-cream">لاعب واحد يمسح الرمز ويرسم الكلمة</p>
            <p className="font-en-body text-xs text-cream-60 italic" lang="en">
              One player scans · sees the word · draws it
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
