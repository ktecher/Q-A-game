import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ColorSwatchPicker from '../../components/ColorSwatchPicker';
import { TEAM_COLORS } from '../SetupScreen/constants';
import { STORAGE_KEYS } from '../../lib/storageKeys';
import { ensureSession, createGame } from '../../lib/koutClient';
import { seatAngleDeg, ellipsePct, readKoutOrientation } from '../../lib/koutGeometry';

const SEAT_COUNTS = [4, 6];
const DEFAULT_NAMES = ['فريق ١', 'فريق ٢'];

// Same ellipse convention as SeatRing.jsx (slot 0 = top, increasing slot =
// counterclockwise) — this is the one formula both sides must agree on.
const RX = 40;
const RY = 37;

function Label({ ar, en, center }) {
  return (
    <div className={center ? 'text-center' : ''}>
      <span className="font-ar-body font-bold leading-none" style={{ fontSize: 13, color: 'var(--text)' }}>
        {ar}
      </span>
      <span
        className="font-en-body leading-none"
        style={{ fontSize: 8, color: 'var(--muted2)', marginInlineStart: 6 }}
        lang="en"
      >
        {en}
      </span>
    </div>
  );
}

/* Host setup — mirrored to a TV, landscape, ~844×390. Three sections on one
   screen (seats, teams, seat-1 orientation) so there is nothing to scroll
   past. The chosen team colours are sent to `create` and stored on the game
   row; TableScreen/SeatRing/SeatScreen/TrickArea all read them from there. */
export default function SetupScreen() {
  const navigate = useNavigate();
  const [seatCount, setSeatCount] = useState(4);
  const [names, setNames] = useState(DEFAULT_NAMES);
  const [colors, setColors] = useState([TEAM_COLORS[0], TEAM_COLORS[1]]);
  const [orientationRaw, setOrientation] = useState(() => readKoutOrientation());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // A stored (or previously tapped) orientation can be out of range after
  // switching seat counts — e.g. slot 5 from a 6-seat game with only 4 seats
  // now. Clamp on read rather than in an effect, so there is no extra render.
  const orientation = orientationRaw < seatCount ? orientationRaw : 0;

  const updateName = (i, value) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  const updateColor = (i, hex) =>
    setColors((prev) => prev.map((c, idx) => (idx === i ? hex : c)));

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await ensureSession();
      const teamNames = names.map((n, i) => n.trim() || DEFAULT_NAMES[i]);
      const { gameId } = await createGame(seatCount, teamNames, colors);
      localStorage.setItem(STORAGE_KEYS.KOUT_SEAT1_POS, String(orientation));
      navigate(`/kout/table?g=${gameId}`);
    } catch (e) {
      setError(e.message || 'حدث خطأ، حاول مرة أخرى');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '8px 16px', background: 'var(--panel)', borderBottom: '3px solid var(--gold-d)' }}
      >
        <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 20, color: 'var(--gold-ink)' }}>
          كوت · إعداد
        </span>
        <a
          href="/home"
          className="font-en-body leading-none"
          style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em' }}
          lang="en"
        >
          ◄ HOME
        </a>
      </div>

      <div className="flex-1 flex items-stretch" style={{ padding: '8px 14px', gap: 12, minHeight: 0 }}>
        {/* Step 1 — seat count */}
        <div className="flex flex-col shrink-0" style={{ gap: 6, width: 100 }}>
          <Label ar="المقاعد" en="SEATS" />
          <div className="flex flex-col flex-1" style={{ gap: 6 }}>
            {SEAT_COUNTS.map((n) => {
              const active = seatCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSeatCount(n)}
                  className="flex-1 transition-transform duration-100 enabled:hover:-translate-y-[2px]"
                  style={{
                    background: active ? 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)' : 'var(--panel)',
                    border: `4px solid ${active ? 'var(--outline)' : 'var(--line)'}`,
                    boxShadow: active ? '0 4px 0 var(--gold-sh)' : 'none',
                  }}
                >
                  <span
                    className="font-en-body font-extrabold leading-none"
                    style={{ fontSize: 26, color: active ? 'var(--outline)' : 'var(--text)' }}
                    lang="en"
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — teams: name + mutually-exclusive colour */}
        <div className="flex flex-col flex-1" style={{ gap: 6, minWidth: 0 }}>
          <Label ar="الفرق" en="TEAMS" />
          <div className="flex-1 flex flex-col" style={{ gap: 6 }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex-1 flex items-center"
                style={{ gap: 10, padding: '4px 10px', minWidth: 0, background: 'var(--panel)', border: `3px solid ${colors[i]}` }}
              >
                <input
                  type="text"
                  value={names[i]}
                  maxLength={16}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={DEFAULT_NAMES[i]}
                  aria-label={i === 0 ? 'اسم الفريق الأول' : 'اسم الفريق الثاني'}
                  className="flex-1 min-w-0 font-ar-body font-bold"
                  style={{
                    background: 'var(--input-bg)',
                    border: '3px solid var(--line)',
                    padding: '4px 8px',
                    color: 'var(--text)',
                    fontSize: 16,
                  }}
                />
                <ColorSwatchPicker
                  colors={TEAM_COLORS}
                  value={colors[i]}
                  otherValue={colors[1 - i]}
                  onChange={(hex) => updateColor(i, hex)}
                  size={16}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Step 3 — seat-1 orientation ring */}
        <div className="flex flex-col items-center shrink-0" style={{ gap: 4, width: 140 }}>
          <Label ar="اتجاه المقعد ١" en="SEAT 1" center />
          <div className="relative flex-1" style={{ width: '100%' }}>
            {Array.from({ length: seatCount }, (_, slot) => {
              const { left, top } = ellipsePct(seatAngleDeg(slot, seatCount, 0), RX, RY);
              const active = orientation === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={active}
                  aria-label="اجعل هذا الموضع هو المقعد رقم ١"
                  onClick={() => setOrientation(slot)}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 30,
                    height: 30,
                    background: active ? 'var(--gold)' : 'var(--panel2)',
                    border: `3px solid ${active ? 'var(--outline)' : 'var(--line)'}`,
                  }}
                >
                  {active && (
                    <span className="font-en-body font-bold leading-none" style={{ fontSize: 12, color: 'var(--outline)' }}>
                      ١
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="flex items-center shrink-0"
        style={{ gap: 10, padding: '8px 16px', background: 'var(--panel)', borderTop: '3px solid var(--gold-d)' }}
      >
        {error && (
          <span className="font-ar-body font-bold truncate" style={{ fontSize: 12, color: 'var(--red-ink)' }}>
            {error}
          </span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={handleStart}
          className="flex-1 text-center transition-transform duration-100 enabled:hover:-translate-y-[2px] enabled:active:translate-y-[2px]"
          style={{
            padding: '8px 0',
            background: busy ? 'var(--cleared-bg)' : 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
            border: `4px solid ${busy ? 'var(--line)' : 'var(--outline)'}`,
            boxShadow: busy ? 'none' : '0 4px 0 var(--gold-sh)',
            color: busy ? 'var(--muted2)' : 'var(--outline)',
          }}
        >
          <span className="font-ar-body font-extrabold leading-none" style={{ fontSize: 20 }}>
            {busy ? 'جارٍ الإنشاء…' : 'ابدأ اللعبة'}
          </span>
        </button>
      </div>
    </div>
  );
}
