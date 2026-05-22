# Pictionary Challenge — Implementation Plan (v2)

> Status: **PROPOSED — awaiting review.** No code written yet.
> v2 incorporates a four-agent review (architect, critic, research, designer).
> Decisions locked: **one drawer per round**; challenge cells are **randomly**
> `sketch` or `naming`; **60-second** drawing rounds; **local bilingual** word list.

### What changed from v1 (review fixes)

- **Pairing now uses Supabase Presence**, not a one-shot `{t:'ready'}` message —
  closes a real "host stuck on Waiting forever" race (flagged by architect + critic).
- **`broadcast: { self: false }`** added — Supabase echoes messages to the sender
  by default; unhandled it silently corrupts strokes (critic).
- **Host-refresh mid-round** is now an explicit, honest behavior (round restarts),
  not a hand-wave.
- **Session id uses a hex helper**, not `crypto.randomUUID()` — the latter is
  unavailable on `http://<lan-ip>` dev origins (critic).
- **Once-only round-end guard** in the host hook (critic).
- `getCoalescedEvents()` Safari fallback, receiver `devicePixelRatio` scaling,
  `ResultStage` gets `chokeTeamIdx={null}` explicitly + a word-reveal chip.
- New **Phase 0**: a throwaway realtime spike to de-risk before real code.
- **Sketch Rush teardown** (Yalla Arcade) folded in: the receiver dedupes
  strokes by `id` (idempotent against Supabase redelivery/reconnect), the phone
  caps a stroke at **300 points**, and each point may carry a relative
  timestamp for future replay.

## 1. Goal

Add a Pictionary-style variant to the existing Challenge Round. When a team
accepts a "sketch" challenge:

1. The big screen shows a QR code.
2. One player from the active team scans it with their phone.
3. A secret word appears on their phone (behind an anti-spoiler gate).
4. They tap **Ready** → a blank white canvas fills their phone.
5. They draw the word with their finger.
6. Their strokes appear **live, as they draw**, on the big screen.
7. Their team shouts guesses; the host awards the round.

This reuses ~80% of the existing challenge flow. The only genuinely new
capability is a **live phone → big-screen channel**.

## 2. How it works (data flow)

```
BIG SCREEN  (/play/challenge → ChallengeScreen, phase 'sketch')        PHONE  (/draw.html)
┌───────────────────────────────────────────┐                  ┌──────────────────────────┐
│ SketchStage                                │                  │ decode #d= → word + sid   │
│  sessionId read from currentChallenge       │                  │ anti-spoiler gate         │
│  channel.subscribe(); WAIT for 'SUBSCRIBED' │                  │ tap "Ready"               │
│  then render QR  ───────────────────────────┼──scan───────────►│ subscribe sketch-<sid>    │
│                                             │                  │ presence.track(drawer)    │
│  presence 'join' (drawer) → start 60s timer │   ┌──────────┐    │ finger draws:             │
│        ▲                                    │   │ SUPABASE │◄───┤  - render locally (0 lag) │
│        │  stroke batches (broadcast)        │   │ REALTIME │    │  - buffer pts, flush      │
│        └────────────────────────────────────┼───┤ Broadcast│───►│    ~20×/sec via rAF       │
│  redraws <canvas> live                      │   │ +Presence│    │ Undo / Clear / Done       │
│  sends {t:'timer'} / {t:'expired'} ─────────┼──►└──────────┘───►│ (self:false → no echo)    │
│  on done/timeout → phase 'result'           │                  │ receives timer → mirrors  │
└───────────────────────────────────────────┘                  └──────────────────────────┘

Vercel only serves static files. The realtime socket is phone↔Supabase and
big-screen↔Supabase directly — Vercel is never in the live path.
```

## 3. Architecture decisions

| Decision | Choice | Why |
|---|---|---|
| Realtime transport | **Supabase Realtime Broadcast** (ephemeral) + **Presence** for pairing | Already a dependency; Vercel cannot host a WebSocket server; no DB table / migration; anon key joins a public channel with no login. Presence syncs membership to late joiners with no race. |
| Channel | `sketch-<sessionId>`, **public**, created with `broadcast:{self:false}` | Public channel = anon phone joins with no auth. `self:false` stops each side receiving its own messages. |
| Pairing / readiness | **Presence**, not a `{t:'ready'}` broadcast | Broadcast has no buffering; a one-shot ready message is lost if the host hasn't finished subscribing. Presence `join` is the reliable "drawer connected" signal and also gives "drawer disconnected". |
| Phone page | **A 2nd Vite entry** — `draw.html` at repo root → `src/draw/main.js` | The draw page needs the Supabase client; a Vite entry bundles only Supabase + draw code (no React/router), version-pinned, no runtime CDN dependency. `import.meta.env.VITE_*` is inlined into the chunk at build (the anon key is already browser-public). Confirmed by architect + research: repo-root HTML is a valid Rollup input; static `dist/draw.html` outranks the SPA catch-all in prod. |
| Wire format | **Vector stroke deltas**, normalized 0–1 coords (4 dp), batched per animation frame | Bitmaps are 10–100× larger. Normalized coords map a small phone canvas onto a big screen of any aspect ratio. Vanilla pointer-event canvas (no `perfect-freehand` — overkill for MVP per research). |
| Word source | **Local `src/data/drawingWords.js`** (curated bilingual nouns) | Zero infra, instant. `pickDrawingWord(exclude)` avoids repeating a word within one game. |
| Fit in code | **New `sketch` phase** inside `ChallengeScreen`, parallel to `naming` | Reuses `SwordIntro`, `AcceptStage`, `ResultStage`, and all 3 challenge reducer actions. |
| Winner model | Drawer draws for the active team; host awards via reused `ResultStage` | Both team cards stay tappable so a "steal" (other team blurts the answer) still works. |

### gameReducer.js needs **no change** (verified)

`START_CHALLENGE` does `currentChallenge: action.payload` — extra fields
(`variant`, `sessionId`) ride along. `gameStorage` serialize/deserialize only
special-case the `Set` fields; `currentChallenge` is a plain object and
round-trips losslessly through `JSON`. No `STORAGE_VERSION` bump.
**Invariant for the executor:** `sessionId` is generated **once** in
`BoardScreen.handlePick` and is **read-only** everywhere else — `SketchStage`
must never generate one, or host-refresh would orphan the phone.

## 4. Wire protocol

Channel `sketch-<sessionId>`, created `{ config: { broadcast: { self: false } } }`,
**Presence** enabled. Broadcast event name `'evt'`; payload discriminated by `t`.
`self:false` means neither side receives its own messages; every handler still
`switch`es on `t` and ignores unknown types.

**Presence** (pairing — replaces a `ready` message)
- Phone: after `subscribe()` returns `SUBSCRIBED`, `channel.track({ role:'drawer' })`.
- Host: watches `presence` `join`/`leave`. A `drawer` join = start the 60s round.
  A `drawer` leave mid-round = show "drawer disconnected" + the Skip button.

**Phone → Big screen** (broadcast)
| Msg | Meaning |
|---|---|
| `{t:'s', id, color, w}` | Stroke begin (`id` = incrementing counter) |
| `{t:'p', id, pts:[[x,y],…]}` | Batch of points, normalized 0–1, 4 dp |
| `{t:'e', id}` | Stroke end |
| `{t:'u'}` | Undo last stroke |
| `{t:'c'}` | Clear canvas |
| `{t:'sync', strokes:[…]}` | Full stroke-list push — used by Undo-after-Clear and reconnect recovery |
| `{t:'done'}` | Drawer tapped Done |

**Big screen → Phone** (broadcast)
| Msg | Meaning |
|---|---|
| `{t:'timer', r}` | Remaining seconds (sent each 1s tick) — also the phone's "host is live" ack |
| `{t:'expired'}` | Time up — phone locks the canvas |
| `{t:'end'}` | Host ended the round early (Skip) |

Throttling: the phone accumulates `pointermove` points (via
`getCoalescedEvents()` with a `?? [e]` Safari fallback), flushes **one
`{t:'p'}` per `requestAnimationFrame`, gated to ≤20/sec**, always flushing on
stroke end. The local canvas is drawn synchronously on every move so the drawer
feels zero latency. Supabase client is created with
`realtime: { params: { eventsPerSecond: 30 } }` — the budget counts **all**
message types (`s`/`e`/`u`/`c` too), not just `p`.

The receiver is **idempotent** — strokes and points are keyed by stroke `id`,
so a Supabase reconnect or message redelivery never double-draws (borrowed from
a Yalla Arcade *Sketch Rush* teardown). The phone **caps a stroke at 300
points**, silently dropping further `pointermove`s — a guard against one
runaway scribble. Each point may carry an optional relative `t` (ms since
stroke start) to enable future stroke replay.

## 5. New files

| File | Responsibility |
|---|---|
| `src/lib/sketchEncoding.js` | `encodeSketch`/`decodeSketch`/`buildSketchUrl` — mirrors `charadesEncoding.js`. Payload `{v:1, ar, en, l, s:sessionId, ca?, ce?}` (`ca`/`ce` = optional bilingual category for the on-canvas hint). URL `${origin}/draw.html#d=<token>`. Plus `makeSessionId()` — an 8-char hex id from `Math.random()` (not `crypto.randomUUID()`, which is undefined on non-secure dev origins). |
| `src/data/drawingWords.js` | Curated array of bilingual drawable nouns `{ar, en, category?}` (~40–60 items). `pickDrawingWord(excludeEnSet)` helper to avoid repeats within a game. |
| `draw.html` | Phone page shell (repo root → Vite entry). Inline CSS cloned from `c.html` styling. `<script type="module" src="/src/draw/main.js">`. |
| `src/draw/main.js` | Phone logic (plain JS): decode hash → gate → word reveal → Ready → canvas. Pointer Events, `touch-action:none`, devicePixelRatio scaling, normalized coords, rAF-batched broadcast, Undo / single-tap Clear / Done. Imports `sketchEncoding.js` + `supabase.js` from `src/lib`. |
| `src/screens/ChallengeScreen/SketchStage.jsx` | Big-screen stage. QR + spoiler-blocker + waiting copy, then the live `<canvas>`, timer, host "Skip" / "End round" button. Uses `useSketchSession`. |
| `src/screens/ChallengeScreen/useSketchSession.js` | Host hook: subscribes to `sketch-<sessionId>` (waits for `SUBSCRIBED`), watches Presence, demuxes incoming strokes into a stroke list, drives a rAF canvas redraw, runs the 60s countdown, broadcasts `timer`/`expired`/`end`. Single `ended` flag — first of {done, timer-0, skip} wins; later triggers ignored. |
| `src/lib/sketchEncoding.test.js` | Vitest round-trip test: encode→decode equality, version-mismatch → null, malformed input → null. |

## 6. Modified files

| File | Change |
|---|---|
| `vite.config.js` | Add `build.rollupOptions.input: { main: 'index.html', draw: 'draw.html' }`. Set `server.host: true` so a phone on the LAN can reach the dev server. |
| `src/lib/supabase.js` | Add `{ realtime: { params: { eventsPerSecond: 30 } } }` to `createClient`. Harmless for the rest of the app (no other Realtime use). |
| `src/screens/BoardScreen/index.jsx` | In `handlePick`, when a challenge cell is picked, decide `variant` randomly (`Math.random() < 0.5 ? 'sketch' : 'naming'`). For `'sketch'`: `sessionId = makeSessionId()`, `prompt = pickDrawingWord(...)`, pass `{…, variant:'sketch', sessionId, prompt}` to `startChallenge`. For `'naming'`: unchanged (prompt from `challenge_prompts`). |
| `src/screens/ChallengeScreen/index.jsx` | Extend phase union with `'sketch'`. In `handleAccept`, branch on `currentChallenge.variant` → `setPhase('sketch')` or `'naming'`. Add a `<SketchStage>` branch in `<AnimatePresence>`; its `onEnd` sets the result and goes to `'result'`. |
| `src/screens/ChallengeScreen/AcceptStage.jsx` | Accept an optional `variant` prop. For `'sketch'`, render this rule set (4 bilingual `Rule`s) instead of the naming rules: 1) "رسّام واحد من فريقك يرسم على هاتفه" / "One player from your team draws on their phone"; 2) "امسح الرمز، شاهد الكلمة، وارسمها" / "Scan the QR, see a secret word, draw it"; 3) "٦٠ ثانية — فريقك يخمّن بصوت عالٍ" / "60 seconds — your team shouts guesses"; 4) "الفائز يحصل على ضعف النقاط (N)" / "Winner takes 2× points (N)". Icons: reuse `Hourglass`, `Trophy`, `Zap` (already imported); verify `Pencil`/`Smartphone` exist in `lucide-react ^1.14.0` or substitute. Header ("جولة التحدي") unchanged. |
| `src/screens/ChallengeScreen/ResultStage.jsx` | Add optional `mode` prop. When `'sketch'`: gate out the per-team "named" `count` block (no meaning for drawing), and render a **word-reveal chip** between the trophy header and the team cards — "الكلمة كانت: <word>" / "The word was: <word>", scale-in on mount. Sketch path passes `mode='sketch'`, `chokeTeamIdx={null}` (explicit — keeps the auto-winner crown off), and the `prompt` object for the chip. |
| `vercel.json` *(optional)* | A `/draw` → `/draw.html` pretty alias may be added — but **only above** the `/(.*)` catch-all line, or it gets swallowed. Not required: the QR points at `/draw.html` directly and that file exists, so it is served without a rewrite. |

## 7. Phone drawing page detail (`src/draw/main.js`)

- **Decode** `location.hash` via `decodeSketch` → `{ar, en, lang, sessionId}`. Invalid → error screen. If `isSupabaseConfigured` is false, show an error instead of connecting to the placeholder client.
- **Gate**: full-screen "اضغط للكشف / Tap to reveal" overlay (cloned from `c.html`).
- **Word reveal**: big primary word + secondary language + a gold **"جاهز · Ready"** button with subtext "رأيتُها · I've seen it — start the canvas" so nobody taps before reading.
- **Ready** → hide word, show canvas, `channel.subscribe()`; on `SUBSCRIBED` → `channel.track({role:'drawer'})`.
- **Canvas**: `touch-action:none`, sized to `cssSize × devicePixelRatio`, `ctx.scale(dpr,dpr)`. Pointer Events + `setPointerCapture`. Header strip shows a faint **category hint** ("فئة: حيوانات / Category: Animals") — never the word. `pointerdown` → new stroke id + `{t:'s'}`; `pointermove` → push coalesced normalized points to a buffer + draw locally; rAF loop flushes `{t:'p'}` ≤20/sec; `pointerup` → flush + `{t:'e'}`.
- **Controls** (minimal): **Undo** (one step, `{t:'u'}`), **Clear** (single tap → `{t:'c'}` + wipe + a 0.4s "مسح / Cleared" toast during which Undo still restores), **Done** (`{t:'done'}`). One ink color on white, one brush width. No color picker / eraser / zoom.
- **Receives** `{t:'timer'}` (mirror a read-only countdown), `{t:'expired'}`/`{t:'end'}` → lock canvas (overlay `pointer-events:none`), show "انتهى الوقت / Time's up".

## 8. Host stage detail (`SketchStage.jsx` + `useSketchSession.js`)

- On mount: read `sessionId` from `currentChallenge` (read-only), `channel.subscribe()`. **Render the QR only after the `SUBSCRIBED` status callback** — so the channel is live before any phone can join.
- **Before a drawer joins**: show the QR (`react-qr-code`, named import as in `QuestionScreen`), a team-colored card, a pulsing "في انتظار الرسّام / Waiting for drawer…", a **spoiler-blocker** ("⚠ الرسّام فقط يمسح الرمز / Only the drawer scans — everyone else look away!"), a line for each team (active team: "get ready to guess"; other team: "stay silent, watch only"), and a host **"تخطّي / Skip"** escape hatch.
- **Presence `join` of a `drawer`**: hide QR, reveal a large centered white `<canvas>` (`devicePixelRatio`-scaled), start a **60-second** countdown (`SKETCH_TIME = 60`), broadcast `{t:'timer', r}` each 1s tick.
- Incoming `s`/`p`/`e`/`u`/`c` mutate a stroke list; an always-on rAF loop redraws the canvas with quadratic-curve smoothing (cancelled on unmount). Normalized coords scale to the canvas size.
- **Round ends** on `{t:'done'}`, timer 0 (broadcast `{t:'expired'}`), or host Skip/End (broadcast `{t:'end'}`). A single `ended` flag guards `onEnd()` so it fires exactly once → `ChallengeScreen` goes to `'result'`.
- `ResultStage` (`mode='sketch'`, `chokeTeamIdx={null}`, `prompt`) shows the word-reveal chip + both teams; host taps the team that guessed it, or "No winner". `awardChallenge(teamId)` → `value×2` → `/play`. Unchanged.

## 9. Supabase setup

- **No migration, no new table, no new env var.** Reuses `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Dashboard check: Project → Realtime enabled (default), and `sketch-*` channels usable as **public** (no Realtime Authorization / RLS policy forcing private channels) so an anon phone joins with no login. If the project has Realtime Authorization on, either add a permissive policy for `sketch-*` or confirm public Broadcast is allowed.
- Free-tier headroom: 1 game = 2 connections (phone + screen); limits are 200 connections / 100 msg/s / 2M msg/month. A 60s round at ~20 msg/s ≈ 1,200 messages. Fine for a party game.

## 10. Edge cases

| Case | Handling |
|---|---|
| Phone never scans | Host "Skip" button on the waiting screen → broadcasts `{t:'end'}`, ends round → `ResultStage` "No winner". |
| Subscribe-race (phone joins before host is subscribed) | Eliminated: host renders the QR only after `SUBSCRIBED`; pairing is via Presence (syncs to late joiners), not a one-shot message. |
| Two people scan | One drawer is a social rule (host directs; spoiler-blocker copy reinforces). MVP: host starts the round on the first `drawer` Presence join; a second is ignored. |
| Drawer disconnects mid-round | Presence `leave` → host shows "drawer disconnected" + Skip. |
| Connection drop mid-draw | Supabase auto-reconnects; strokes during the gap are lost (a small gap). Acceptable for doodles. |
| Big screen refresh mid-round | `sessionId` is persisted in `currentChallenge`, so the host rejoins the **same** channel; Presence still shows the drawer. The host re-walks `SwordIntro` → Accept (local `phase` is not persisted), then `startRound` broadcasts a fresh 60s timer. The phone detects the timer jumping back up, **unlocks if it had locked and re-syncs its current drawing** to the now-blank host — the drawing is preserved and the round continues. A rare accidental reload; recovers with no re-scan. |
| Phone backgrounded / screen locked mid-draw | Mobile suspends rAF + may drop the socket; the 60s host timer keeps running. On return the phone reconnects (Presence re-sync) but lost strokes don't replay. Accepted MVP behavior. |
| Done vs timer-expiry race | `useSketchSession`'s single `ended` flag — the first trigger wins, the rest are ignored. |

## 11. Phased build plan

**Phase 0 — Realtime spike (de-risk, throwaway)**
- [ ] ~30 lines, two browser tabs, one channel: confirm `broadcast:{self:false}`, Presence `track`/`join` timing, and broadcast delivery — tested on a **real phone over LAN** (`server.host:true`). Validates the riskiest assumptions before any real code. Discard after.

**Phase 1 — Phone page, drawing only (no network)** ✅ built
- [x] `src/lib/sketchEncoding.js` (+ `makeSessionId`) and `src/lib/sketchEncoding.test.js` (9 tests pass)
- [x] `src/data/drawingWords.js` (~60 bilingual words, `pickDrawingWord`)
- [x] `draw.html` + `src/draw/main.js`: decode → gate → word → Ready → canvas with **local** drawing + Undo / Clear / Done
- [x] `vite.config.js`: multi-entry input + `server.host:true`; `package.json`: `test` script
- [x] Build verified: `npm run build` emits `dist/draw.html` + a **4 kB** phone bundle, no React/router (grows to ~53 kB in Phase 3 when the Supabase client is added); lint + tests green
- [x] Reviewed (code-reviewer + verifier): 3 majors fixed — Ready double-tap guard, single canvas-rect source of truth, multi-touch + `pointercancel` handling; encoding + word-pool tests expanded
- [ ] Pending user: open `draw.html#d=<token>` on a real phone — confirm drawing feels smooth

**Phase 2 — Challenge-flow integration (QR static, no channel)** ✅ built
- [x] `BoardScreen.handlePick`: random variant (via `pickN`) + `sessionId` + word
- [x] `ChallengeScreen`: `'sketch'` phase + `handleAccept` branch + `handleSketchEnd`
- [x] `AcceptStage`: sketch rule set (4 bilingual rules, `variant` prop)
- [x] `SketchStage`: QR (`buildSketchUrl`) + spoiler-blocker + team roles + waiting + host Skip
- [x] Build verified: lint + 16 tests + build green
- [ ] Pending user: in-game — land a sketch challenge cell → QR shows → scanning opens the word

**Phase 3 — Realtime wiring** ✅ built
- [x] `src/lib/supabase.js`: `eventsPerSecond: 30`
- [x] `useSketchSession.js`: subscribe + `SUBSCRIBED` gate, Presence pairing, stroke demux (s/p/e/u/c/sync/done), rAF canvas paint, 60s timer, `endedRef` once-guard
- [x] `src/draw/main.js`: join channel, `track` presence, rAF-batched `{t:'p'}` broadcast, sync-on-subscribe recovery, receive timer/expired/end
- [x] `SketchStage.jsx`: QR view (SUBSCRIBED-gated) ↔ live-canvas view, host End button, drawer-offline badge
- [x] Verified: Pictionary files lint-clean, 16 tests pass, build green, phone bundle ~53 kB gzip (no React); **live Supabase realtime test passed** (subscribe + broadcast + presence) against the real project
- [x] Reviewed (code-reviewer + verifier): 2 majors fixed — `sync`-stroke normalization, host-refresh recovery (phone re-syncs + unlocks on a timer jump)
- [ ] Pending user: real phone + big screen — draw → strokes appear live; timer counts down on both

**Phase 4 — Result + polish** ✅ built
- [x] `ResultStage` sketch mode (`mode`/`word` props): per-team count hidden, word-reveal chip; naming mode unchanged
- [x] `ChallengeScreen`: `namingResult`→`challengeResult`; sketch result carries `mode:'sketch'`, passes `word` → `awardChallenge` path intact
- [x] Host "End round" button + "drawer disconnected" badge (Phase 3 `SketchStage`); Clear undo-window toast (Phase 1)
- [x] Quadratic-curve stroke smoothing on the host canvas (`paintStrokes`)
- [x] Verified: Pictionary files lint-clean, 16 tests pass, build green

**Phase 5 — Verify** ✅ built
- [x] `npm run build` green; Pictionary files lint-clean (`src/draw/main.js` plain JS lints with no override); 16 tests pass
- [x] Phase 4 review minors fixed (phase-machine doc comment, word-chip guard)
- [x] Final review panel: verifier PASS (live realtime re-tested) + security-reviewer "ship with accepted-risks" + holistic code-review
- [x] Security hardening applied: host caps untrusted `pts`/`strokes` payloads; `makeSessionId` uses `crypto.getRandomValues`; `decodeSketch` defaults `lang`
- [ ] OPEN: wire `pickDrawingWord` dedup — needs a small `gameReducer.js` change (a `usedDrawingWords` array); deferred because `gameReducer.js` is under concurrent edit by the admin-dashboard work
- [ ] Pending user: end-to-end on a real phone (LAN dev `npm run dev`, or a Vercel preview)

## 12. Decisions (locked)

1. **Variant per cell** — each of the 2 challenge cells per game is **randomly**
   `naming` or `sketch`, decided in `handlePick`.
2. **Drawing time** — **60 seconds** (`SKETCH_TIME = 60`), starting only when the
   drawer's Presence `join` fires (scanning/reading doesn't eat the clock).
3. **Word source** — local `src/data/drawingWords.js`, **bilingual** `{ar, en}`.

## 13. Risks

1. **Subscribe race / lost pairing** — mitigated by Presence + `SUBSCRIBED` gate
   (§4, §8). De-risked first in Phase 0.
2. **Broadcast self-echo** — mitigated by `broadcast:{self:false}` (§4).
3. **Message-rate budget** — mandatory rAF batching; `eventsPerSecond:30` counts
   all message types (§4).
4. **Phone can't reach Supabase** (locked-down WiFi) → mitigated by a phone
   error state + the host Skip button.
5. **Standalone phone bundle bloat** — the Vite entry only bundles what
   `src/draw/main.js` imports; keep its imports to `sketchEncoding.js` +
   `supabase.js` (no React/router).

## 14. Out of scope (future)

Multi-drawer "everyone draws at once" grid; re-scan / multi-scan lockout UX;
moving the word list to Supabase; color/brush options; `perfect-freehand`
stroke rendering; per-point timestamp replay. (Host-refresh recovery — listed
here in v1 — was implemented in Phase 3; see §10.)
