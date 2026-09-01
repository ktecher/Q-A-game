import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureSession, claimSeat, peekGame, placeBid, setHukm, playCard } from '../../lib/koutClient';
import { useKoutGame } from '../../lib/useKoutGame';
import { suitLabelAr } from '../../lib/koutCards';
import { MIN_BID, MAX_BID, PASS, teamOf, scoreRound } from '../../../supabase/functions/_shared/koutRules.js';
import { TEAM_COLOR_FALLBACK } from '../../lib/teams';
import { toArabicDigits } from '../../lib/format';
import HandStrip from './HandStrip';

// seat_count is only ever 4 or 6 (see 0010_kout.sql). `peekGame` (added
// alongside this screen, see task-14 report) returns it plus which seats are
// taken and by whom, so the ring below is sized and labelled for real once it
// resolves. Until then — or if it fails (bad code, offline) — fall back to
// the larger ring; the tap itself, not this data, is what the server judges.
const MAX_SEATS = 6;
const SUITS = ['S', 'H', 'D', 'C'];

// Every rejection the Edge Function can send, in Arabic, so nothing reaches
// the console as a raw thrown error. Unlisted messages fall back to a
// generic line rather than leaking English.
function arabicError(message) {
  const known = {
    'seat taken': 'هذا المقعد محجوز، اختر مقعدًا آخر',
    'no such seat': 'لا يوجد هذا المقعد في هذه اللعبة',
    'game already started': 'اللعبة بدأت بالفعل',
    'no such game': 'تعذّر العثور على اللعبة، تحقق من الرمز',
    'not your turn': 'ليس دورك الآن',
    'illegal play': 'لا يمكنك لعب هذه الورقة',
    'that card is not in your hand': 'هذه الورقة ليست بيدك',
    'you hold no seat here': 'لا تملك مقعدًا في هذه اللعبة',
    'only the high bidder names hukm': 'صاحب أعلى مزايدة هو من يحدد الحكم',
    'bid must be 5-9 or pass': 'المزايدة يجب أن تكون بين ٥ و٩ أو الطاف',
  };
  if (known[message]) return known[message];
  if (message?.startsWith('not in ')) return 'لا يمكنك فعل ذلك الآن، انتظر قليلاً';
  return 'حدث خطأ، حاول مرة أخرى';
}

function seatLabel(seats, seat) {
  const row = seats.find((s) => s.seat === seat);
  return row?.name || `مقعد ${seat + 1}`;
}

function SeatPicker({ name, setName, seatCount, seatInfo, disabledSeats, claiming, onClaim }) {
  const radius = 96;
  const center = 116;
  const canClaim = name.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ padding: 24, gap: 24 }}>
      <h1 className="font-ar-body font-extrabold text-center leading-none" style={{ fontSize: 36, color: 'var(--gold-ink)' }}>
        كوت
      </h1>
      <p className="font-en-body text-center" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em' }} lang="en">
        CHOOSE YOUR SEAT
      </p>

      <input
        type="text"
        value={name}
        maxLength={20}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسمك"
        aria-label="اسمك"
        className="w-full max-w-xs font-ar-body font-bold text-center"
        style={{
          background: 'var(--input-bg)',
          border: '4px solid var(--blue)',
          boxShadow: 'inset 4px 4px 0 var(--inset)',
          padding: '10px 12px',
          color: 'var(--text)',
          fontSize: 24,
        }}
      />

      {!canClaim && (
        <p className="font-ar-body" style={{ fontSize: 14, color: 'var(--muted)' }}>
          أدخل اسمك ثم اختر مقعدك
        </p>
      )}

      <div className="relative" style={{ width: center * 2, height: center * 2 }}>
        {Array.from({ length: seatCount }, (_, seat) => seat).map((seat) => {
          const angle = (seat / seatCount) * 2 * Math.PI - Math.PI / 2;
          const x = center + radius * Math.cos(angle) - 34;
          const y = center + radius * Math.sin(angle) - 34;
          const team = teamOf(seat);
          const occupant = seatInfo.find((s) => s.seat === seat);
          const failedHere = disabledSeats.has(seat);
          // `taken` is advisory (from peekGame, possibly a moment stale) —
          // it dims the seat and shows who's in it, but never disables the
          // tap: the seat might be yours from before a reload, and claimSeat
          // now lets you reclaim it in any status. Only a server-confirmed
          // rejection (failedHere) or a missing name actually blocks tapping.
          const dim = failedHere || Boolean(occupant?.taken);
          const blocked = failedHere || !canClaim || claiming;
          return (
            <button
              key={seat}
              type="button"
              disabled={blocked}
              onClick={() => onClaim(seat)}
              className="absolute flex flex-col items-center justify-center font-en-body font-bold transition-transform duration-100 enabled:hover:-translate-y-1"
              style={{
                left: x,
                top: y,
                width: 68,
                height: 68,
                background: dim ? 'var(--cleared-bg)' : 'var(--panel)',
                border: `4px solid ${dim ? 'var(--line)' : TEAM_COLOR_FALLBACK[team]}`,
                color: dim ? 'var(--muted2)' : 'var(--text)',
                boxShadow: blocked ? 'none' : '0 6px 0 var(--shadow)',
                opacity: canClaim ? 1 : 0.6,
                fontSize: 22,
              }}
            >
              {seat + 1}
              {occupant?.taken && occupant.name && (
                <span className="font-ar-body truncate" style={{ fontSize: 9, maxWidth: 58 }}>
                  {occupant.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusStrip({ game }) {
  const [t0, t1] = game.team_names ?? ['فريق ١', 'فريق ٢'];
  const [s0, s1] = game.score ?? [0, 0];
  const teamColors = game.team_colors ?? TEAM_COLOR_FALLBACK;
  return (
    <div
      className="flex items-center justify-between sticky top-0 z-10"
      style={{ padding: '10px 16px', background: 'var(--panel)', borderBottom: '4px solid var(--gold-d)' }}
    >
      <span className="font-ar-body font-bold leading-none truncate" style={{ fontSize: 16, color: teamColors[0] }}>
        {t0} · {s0}
      </span>
      <span className="font-en-body leading-none" style={{ fontSize: 9, color: 'var(--muted)' }} lang="en">
        الهدف ١٠١
      </span>
      <span className="font-ar-body font-bold leading-none truncate" style={{ fontSize: 16, color: teamColors[1] }}>
        {s1} · {t1}
      </span>
    </div>
  );
}

export default function SeatScreen() {
  const joinCode = useMemo(() => window.location.hash.replace(/^#/, ''), []);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [name, setName] = useState('');
  const [peek, setPeek] = useState(null); // { seatCount, seats: [{ seat, taken, name }] }
  const [disabledSeats, setDisabledSeats] = useState(() => new Set());
  const [claiming, setClaiming] = useState(false);
  const [joined, setJoined] = useState(null); // { gameId, seat }
  const [actionError, setActionError] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    let alive = true;
    ensureSession()
      .then(() => { if (alive) setReady(true); })
      .catch(() => { if (alive) setSessionError('تعذّر تسجيل الدخول، أعد فتح الرابط من جديد'); });
    return () => { alive = false; };
  }, []);

  // Pre-join visibility into the real seat_count and who's already seated —
  // needs a session first, since peekGame still runs behind the same "must
  // be signed in" gate as every other action.
  useEffect(() => {
    if (!ready || !joinCode) return undefined;
    let alive = true;
    peekGame(joinCode)
      .then((p) => { if (alive) setPeek(p); })
      .catch((e) => { if (alive) setActionError(arabicError(e.message)); });
    return () => { alive = false; };
  }, [ready, joinCode]);

  useEffect(() => {
    if (!actionError) return undefined;
    const t = setTimeout(() => setActionError(''), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  const { game, seats, hand } = useKoutGame(joined?.gameId ?? null);

  async function handleClaim(seat) {
    if (claiming || !name.trim()) return;
    setClaiming(true);
    try {
      const { gameId } = await claimSeat(joinCode, seat, name.trim());
      if (!mountedRef.current) return;
      setJoined({ gameId, seat });
    } catch (e) {
      if (!mountedRef.current) return;
      setDisabledSeats((prev) => new Set(prev).add(seat));
      setActionError(arabicError(e.message));
    } finally {
      if (mountedRef.current) setClaiming(false);
    }
  }

  // Every mutation funnels through here so one place turns a server refusal
  // into an inline Arabic message instead of an unhandled rejection.
  async function guarded(fn) {
    try {
      await fn();
    } catch (e) {
      setActionError(arabicError(e.message));
    }
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 24 }}>
        <p className="font-ar-body font-bold text-center" style={{ fontSize: 20, color: 'var(--red)' }}>{sessionError}</p>
      </div>
    );
  }

  if (!joinCode) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 24 }}>
        <p className="font-ar-body font-bold text-center" style={{ fontSize: 20, color: 'var(--red)' }}>
          رابط الدخول غير صالح
        </p>
      </div>
    );
  }

  if (!ready || !joined) {
    return (
      <>
        {!ready ? (
          <div className="min-h-screen flex items-center justify-center">
            <p className="font-ar-body font-bold" style={{ fontSize: 20, color: 'var(--muted)' }}>جارٍ الاتصال...</p>
          </div>
        ) : (
          <SeatPicker
            name={name}
            setName={setName}
            seatCount={peek?.seatCount ?? MAX_SEATS}
            seatInfo={peek?.seats ?? []}
            disabledSeats={disabledSeats}
            claiming={claiming}
            onClaim={handleClaim}
          />
        )}
        {actionError && <ErrorBanner text={actionError} />}
      </>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-ar-body font-bold" style={{ fontSize: 20, color: 'var(--muted)' }}>جارٍ تحميل اللعبة...</p>
      </div>
    );
  }

  const mySeat = joined.seat;
  const myTurn = game.turn_seat === mySeat;
  const teamColors = game.team_colors ?? TEAM_COLOR_FALLBACK;
  const standingBid = seats.reduce(
    (max, s) => (typeof s.bid === 'number' && s.bid !== PASS && s.bid > max ? s.bid : max),
    0,
  );

  return (
    <div className="min-h-screen flex flex-col">
      <StatusStrip game={game} />

      <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: 20, gap: 16 }}>
        {game.status === 'lobby' && (
          <>
            <p className="font-ar-body font-bold text-center" style={{ fontSize: 24, color: 'var(--gold-ink)' }}>
              بانتظار المضيف
            </p>
            <p className="font-en-body" style={{ fontSize: 10, color: 'var(--muted)' }} lang="en">
              {seats.filter((s) => s.user_id).length}/{game.seat_count} SEATED
            </p>
          </>
        )}

        {game.status === 'bidding' && (myTurn ? (
          <>
            <p className="font-ar-body font-bold" style={{ fontSize: 20, color: 'var(--gold-ink)' }}>دورك — زايد</p>
            <div className="flex flex-wrap justify-center" style={{ gap: 10 }}>
              {Array.from({ length: MAX_BID - MIN_BID + 1 }, (_, i) => MIN_BID + i).map((n) => {
                const enabled = n > standingBid;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!enabled}
                    onClick={() => guarded(() => placeBid(joined.gameId, n))}
                    className="font-en-body font-bold enabled:hover:-translate-y-1 transition-transform duration-100"
                    style={{
                      width: 56,
                      height: 56,
                      fontSize: 24,
                      background: enabled ? 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)' : 'var(--cleared-bg)',
                      border: `4px solid ${enabled ? 'var(--outline)' : 'var(--line)'}`,
                      color: enabled ? 'var(--outline)' : 'var(--muted2)',
                      boxShadow: enabled ? '0 6px 0 var(--gold-sh)' : 'none',
                    }}
                  >
                    {toArabicDigits(n)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => guarded(() => placeBid(joined.gameId, PASS))}
                className="font-ar-body font-bold enabled:hover:-translate-y-1 transition-transform duration-100"
                style={{
                  padding: '0 18px',
                  height: 56,
                  fontSize: 22,
                  background: 'var(--panel2)',
                  border: '4px solid var(--red)',
                  color: 'var(--text)',
                  boxShadow: '0 6px 0 var(--shadow)',
                }}
              >
                طاف
              </button>
            </div>
          </>
        ) : (
          <p className="font-ar-body font-bold text-center" style={{ fontSize: 20, color: 'var(--muted)' }}>
            دور {seatLabel(seats, game.turn_seat)}
          </p>
        ))}

        {game.status === 'hukm' && (game.bidder_seat === mySeat ? (
          <>
            <p className="font-ar-body font-bold" style={{ fontSize: 20, color: 'var(--gold-ink)' }}>اختر الحكم</p>
            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              {SUITS.map((suit) => (
                <button
                  key={suit}
                  type="button"
                  onClick={() => guarded(() => setHukm(joined.gameId, suit))}
                  className="font-ar-body font-bold flex flex-col items-center justify-center enabled:hover:-translate-y-1 transition-transform duration-100"
                  style={{
                    width: 100,
                    height: 100,
                    fontSize: 40,
                    background: 'var(--panel)',
                    border: '4px solid var(--outline)',
                    color: suit === 'H' || suit === 'D' ? 'var(--red)' : 'var(--text)',
                    boxShadow: '0 6px 0 var(--shadow)',
                  }}
                >
                  <span>{suit === 'S' ? '♠' : suit === 'H' ? '♥' : suit === 'D' ? '♦' : '♣'}</span>
                  <span style={{ fontSize: 14, marginTop: 4 }}>{suitLabelAr(suit)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="font-ar-body font-bold text-center" style={{ fontSize: 18, color: 'var(--muted)' }}>
            {seatLabel(seats, game.bidder_seat)} يحدد الحكم على {toArabicDigits(game.bid)}
          </p>
        ))}

        {game.status === 'playing' && (
          <>
            <p className="font-ar-body font-bold" style={{ fontSize: 16, color: myTurn ? 'var(--gold-ink)' : 'var(--muted)' }}>
              {myTurn ? 'دورك — العب ورقة' : `دور ${seatLabel(seats, game.turn_seat)}`}
            </p>
            <HandStrip
              hand={hand}
              trick={game.trick}
              myTurn={myTurn}
              onPlay={(card) => guarded(() => playCard(joined.gameId, card))}
            />
          </>
        )}

        {game.status === 'round_end' && (() => {
          const delta = scoreRound({
            bid: game.bid, bidderSeat: game.bidder_seat, mulzum: game.mulzum, tricksWon: game.tricks_won,
          });
          return (
            <>
              <p className="font-ar-body font-extrabold" style={{ fontSize: 22, color: 'var(--gold-ink)' }}>
                نهاية الجولة
              </p>
              <p className="font-ar-body" style={{ fontSize: 18, color: teamColors[0] }}>
                {game.team_names[0]}: +{delta[0]}
              </p>
              <p className="font-ar-body" style={{ fontSize: 18, color: teamColors[1] }}>
                {game.team_names[1]}: +{delta[1]}
              </p>
              <p className="font-ar-body font-bold text-center" style={{ fontSize: 14, color: 'var(--muted)' }}>
                بانتظار المضيف للجولة التالية
              </p>
            </>
          );
        })()}

        {game.status === 'finished' && (
          <>
            <p className="font-ar-body font-extrabold" style={{ fontSize: 26, color: teamColors[game.winner_team] }}>
              فاز {game.team_names[game.winner_team]}!
            </p>
            <p className="font-en-body" style={{ fontSize: 12, color: 'var(--muted)' }} lang="en">
              {game.score[0]} — {game.score[1]}
            </p>
            <a href="/home" className="font-ar-body font-bold" style={{ fontSize: 14, color: 'var(--blue-ink)' }}>
              العودة للرئيسية
            </a>
          </>
        )}
      </div>

      {actionError && <ErrorBanner text={actionError} />}
    </div>
  );
}

function ErrorBanner({ text }) {
  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-30 text-center font-ar-body font-bold"
      style={{ padding: '12px 16px', background: 'var(--red-d)', color: '#F4ECD8', borderTop: '4px solid var(--outline)' }}
      role="alert"
    >
      {text}
    </div>
  );
}
