import { useEffect, useMemo, useRef, useState } from 'react';
import { ensurePlayerSession, claimSeat, peekGame, setReady as setSeatReady, placeBid, setHukm, playCard } from '../../lib/koutClient';
import { useKoutGame } from '../../lib/useKoutGame';
import { koutPlayerSupabase } from '../../lib/koutPlayerClient';
import { suitLabelAr } from '../../lib/koutCards';
import { MIN_BID, MAX_BID, PASS, teamOf, scoreRound } from '../../../supabase/functions/_shared/koutRules.js';
import { TEAM_COLOR_FALLBACK } from '../../lib/teams';
import { toArabicDigits } from '../../lib/format';
import { arabicKoutError } from '../../lib/koutErrors';
import HandStrip from './HandStrip';

// seat_count is only ever 4 or 6 (see 0010_kout.sql). `peekGame` (added
// alongside this screen, see task-14 report) returns it plus which seats are
// taken and by whom, so the ring below is sized and labelled for real once it
// resolves. Until then — or if it fails (bad code, offline) — fall back to
// the larger ring; the tap itself, not this data, is what the server judges.
const MAX_SEATS = 6;
const SUITS = ['S', 'H', 'D', 'C'];

function seatLabel(seats, seat) {
  const row = seats.find((s) => s.seat === seat);
  return row?.name || `مقعد ${seat + 1}`;
}

// This device's own claimed seat, remembered per game so a reload (or a
// second claim attempt after one already succeeded here) can recognise it
// without another server round trip. Scoped to koutPlayerSupabase's own
// identity by construction: if that session is ever gone, this key is
// meaningless anyway (ensurePlayerSession would mint a fresh anonymous uid).
const mySeatKey = (joinCode) => `uah.kout_seat.${joinCode}`;
function readMySeat(joinCode) {
  try {
    const v = localStorage.getItem(mySeatKey(joinCode));
    return v === null ? null : Number(v);
  } catch {
    return null; // private mode / storage disabled — just means no memory across reloads
  }
}

function SeatPicker({ name, setName, seatCount, seatInfo, disabledSeats, claiming, pickedSeat, onClaim }) {
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
          const mine = seat === pickedSeat;
          // `taken` is advisory (from peekGame, possibly a moment stale) —
          // it dims the seat and shows who's in it, but never disables the
          // tap: the seat might be yours from before a reload, and claimSeat
          // now lets you reclaim it in any status. Only a server-confirmed
          // rejection (failedHere) or a missing name actually blocks tapping.
          const dim = !mine && (failedHere || Boolean(occupant?.taken));
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
                // "Mine" fills solid with the outline colour so a tap reads as
                // registered the instant it's made — the whole point being to
                // stop the tap-around-and-hope behaviour the stale picker used
                // to cause. Gold ink on that near-black fill is high-contrast
                // in both themes (--outline is dark in both), unlike --text
                // which flips and would vanish against it in light mode.
                background: mine ? 'var(--outline)' : dim ? 'var(--cleared-bg)' : 'var(--panel)',
                border: `4px solid ${mine ? 'var(--outline)' : dim ? 'var(--line)' : TEAM_COLOR_FALLBACK[team]}`,
                color: mine ? 'var(--gold)' : dim ? 'var(--muted2)' : 'var(--text)',
                boxShadow: blocked ? 'none' : '0 6px 0 var(--shadow)',
                opacity: canClaim ? 1 : 0.6,
                fontSize: 22,
              }}
            >
              {seat + 1}
              {occupant?.taken && occupant.name && (
                <span className="font-ar-body truncate" style={{ fontSize: 9, maxWidth: 58 }}>
                  {/* Ready is genuinely useful here: it tells someone picking
                      a seat who's already settled in versus who just landed
                      on the QR scan and hasn't looked up yet. */}
                  {occupant.ready ? '✓ ' : ''}{occupant.name}
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
  // The Arabic line above tells the player what to do; this one says what
  // actually broke. Kept separate and shown small: a sign-in failure is the
  // one error nobody can diagnose remotely, because it happens on someone
  // else's phone where no console is reachable. Swallowing it cost a full
  // round of live testing against a server that could not have worked.
  const [sessionErrorDetail, setSessionErrorDetail] = useState('');
  const [name, setName] = useState('');
  const [peek, setPeek] = useState(null); // { seatCount, seats: [{ seat, taken, name }] }
  const [disabledSeats, setDisabledSeats] = useState(() => new Set());
  const [claiming, setClaiming] = useState(false);
  // Seeded from localStorage, not null: if this device already holds a seat
  // in this game (an earlier successful claim), the picker should show it as
  // theirs from the first render, before any tap this session.
  const [pickedSeat, setPickedSeat] = useState(() => readMySeat(joinCode));
  const [joined, setJoined] = useState(null); // { gameId, seat }
  const [actionError, setActionError] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    let alive = true;
    ensurePlayerSession()
      .then(() => { if (alive) setReady(true); })
      .catch((e) => {
        console.error('[kout] sign-in failed', e);
        if (!alive) return;
        setSessionError('تعذّر تسجيل الدخول، أعد فتح الرابط من جديد');
        // status separates the layers: 422 = anonymous sign-ins disabled on
        // the project, 500 = a trigger on auth.users raising inside the
        // signup transaction, network error = no status at all.
        setSessionErrorDetail([e?.message, e?.status && `(${e.status})`].filter(Boolean).join(' '));
      });
    return () => { alive = false; };
  }, []);

  // Pre-join visibility into the real seat_count and who's already seated —
  // needs a session first, since peekGame still runs behind the same "must
  // be signed in" gate as every other action. RLS deliberately hides
  // kout_games/kout_seats from anyone not yet seated (0010_kout.sql), so
  // there's no realtime channel available pre-join — poll instead. This is
  // a handful of phones in one room, not a scaling concern, so 2s is fine.
  // Stops as soon as this player has joined; useKoutGame takes over with
  // real realtime from there.
  useEffect(() => {
    if (!ready || !joinCode || joined) return undefined;
    let alive = true;
    let gotOne = false; // once we've shown real data, a dropped poll just retries quietly
    let toldOnce = false; // ...but a poll that's never once succeeded gets exactly one banner

    function poll() {
      peekGame(joinCode)
        .then((p) => {
          if (!alive) return;
          gotOne = true;
          setPeek(p);
        })
        .catch((e) => {
          if (!alive || gotOne || toldOnce) return;
          toldOnce = true;
          setActionError(arabicKoutError(e.message));
        });
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [ready, joinCode, joined]);

  useEffect(() => {
    if (!actionError) return undefined;
    const t = setTimeout(() => setActionError(''), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  // Player client on purpose, and it must be the same one that claimed the
  // seat: kout_hands' policy is `user_id = auth.uid()`, evaluated against the
  // subscriber's session for the realtime stream too. Pass the app client here
  // and this phone is seated but never receives its own cards.
  const { game, seats, hand, error: gameError } = useKoutGame(joined?.gameId ?? null, koutPlayerSupabase);

  // useKoutGame surfaces a failed kout_games/kout_seats/kout_hands query here
  // specifically so it doesn't quietly render as an empty hand (see
  // useKoutGame.js). Derived straight from render rather than mirrored into
  // actionError via an effect: it disappears on its own the moment the next
  // refetch succeeds, and it never blanks the game underneath it.
  const gameErrorAr = gameError ? arabicKoutError(gameError) : '';

  async function handleClaim(seat) {
    if (claiming || !name.trim()) return;
    setClaiming(true);
    setPickedSeat(seat); // fill it immediately — the round trip is what made taps look ignored
    try {
      const { gameId } = await claimSeat(joinCode, seat, name.trim());
      if (!mountedRef.current) return;
      try { localStorage.setItem(mySeatKey(joinCode), String(seat)); } catch { /* best-effort only */ }
      setJoined({ gameId, seat });
    } catch (e) {
      if (!mountedRef.current) return;
      // This device already holds a DIFFERENT seat in this game — a genuine
      // reclaim (e.g. a second tab), not a failure. Recover into that seat
      // instead of stranding them on a picker where every free seat will
      // hit the same rejection.
      if (e.message === 'you already hold a seat in this game') {
        const known = readMySeat(joinCode);
        if (known !== null) {
          try {
            const p = await peekGame(joinCode);
            if (mountedRef.current) {
              setJoined({ gameId: p.gameId, seat: known });
              return;
            }
          } catch { /* peek failed too — fall through to the banner below */ }
        }
      }
      setPickedSeat(readMySeat(joinCode)); // back to whatever this device truly holds, if anything
      setDisabledSeats((prev) => new Set(prev).add(seat));
      setActionError(arabicKoutError(e.message));
    } finally {
      if (mountedRef.current) setClaiming(false);
    }
  }

  // Every mutation funnels through here so one place turns a server refusal
  // into an inline Arabic message instead of an unhandled rejection.
  //
  // Returns whether the action succeeded. Still never rethrows — HandStrip
  // depends on `await onPlay(...)` always settling — but a caller that shows
  // something optimistically needs to know whether to keep it. The four
  // onClick handlers below ignore the result, as React ignores any value a
  // handler returns; only the play path reads it.
  async function guarded(fn) {
    try {
      await fn();
      return true;
    } catch (e) {
      setActionError(arabicKoutError(e.message));
      return false;
    }
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 24 }}>
        <div className="text-center">
          <p className="font-ar-body font-bold" style={{ fontSize: 20, color: 'var(--red)' }}>{sessionError}</p>
          {sessionErrorDetail && (
            <p dir="ltr" style={{ fontSize: 12, opacity: 0.65, marginTop: 10, wordBreak: 'break-word' }}>
              {sessionErrorDetail}
            </p>
          )}
        </div>
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
            pickedSeat={pickedSeat}
            onClaim={handleClaim}
          />
        )}
        {actionError && <ErrorBanner text={actionError} />}
      </>
    );
  }

  if (!game) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <p className="font-ar-body font-bold" style={{ fontSize: 20, color: 'var(--muted)' }}>جارٍ تحميل اللعبة...</p>
        </div>
        {gameErrorAr && <ErrorBanner text={gameErrorAr} />}
      </>
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
        {game.status === 'lobby' && (() => {
          const mySeatRow = seats.find((s) => s.seat === mySeat);
          const iAmReady = Boolean(mySeatRow?.ready);
          const readyCount = seats.filter((s) => s.ready).length;
          return (
            <>
              <p className="font-ar-body font-bold text-center" style={{ fontSize: 24, color: 'var(--gold-ink)' }}>
                بانتظار المضيف
              </p>
              <p className="font-en-body" style={{ fontSize: 10, color: 'var(--muted)' }} lang="en">
                {seats.filter((s) => s.user_id).length}/{game.seat_count} SEATED · {readyCount}/{game.seat_count} READY
              </p>
              <button
                type="button"
                onClick={() => guarded(() => setSeatReady(joined.gameId, !iAmReady))}
                className="font-ar-body font-extrabold transition-transform duration-100 hover:-translate-y-1 active:translate-y-1"
                style={{
                  padding: '16px 40px',
                  fontSize: 22,
                  background: iAmReady ? 'var(--panel2)' : 'linear-gradient(var(--gold) 50%, var(--gold-d) 50%)',
                  border: `4px solid ${iAmReady ? 'var(--green)' : 'var(--outline)'}`,
                  color: iAmReady ? 'var(--green)' : 'var(--outline)',
                  boxShadow: iAmReady ? 'none' : '0 6px 0 var(--gold-sh)',
                }}
              >
                {iAmReady ? 'جاهز! (اضغط للإلغاء)' : 'جاهز'}
              </button>
            </>
          );
        })()}

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

        {/* Cards are dealt BEFORE the first bid (index.ts startRound), and both
            bidding and naming the hukm are decisions about the hand you hold —
            made blind until now, because the strip only rendered once play
            began. Shown to every seat, not just whoever is on turn: the others
            are deciding what they will bid when it reaches them. */}
        {(game.status === 'bidding' || game.status === 'hukm') && (
          <HandStrip hand={hand} trick={[]} myTurn={false} onPlay={() => {}} readOnly />
        )}

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

      {(actionError || gameErrorAr) && <ErrorBanner text={actionError || gameErrorAr} />}
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
