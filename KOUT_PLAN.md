# Kout (كوت) — Implementation Plan (v1)

> Status: **PROPOSED — awaiting review.** No code written yet.
> Scope locked through a 6-round design interview. **Hand (هاند) is explicitly
> out of scope** — it is a separate engine and gets its own plan after Kout
> survives a real diwaniya.
>
> **For agentic workers:** implement task-by-task. Steps use `- [ ]` checkboxes.
> Do not skip Phase 0 — it de-risks the one assumption the whole design rests on.

**Goal:** A playable 4- or 6-player Kout where the host's phone (mirrored to a
TV) is the table and each player's phone is their hand, with the deck owned by
the server so no card can be duplicated and no player can see another's hand.

**Architecture:** Server-authoritative. A Supabase Edge Function owns shuffle,
deal, and every play; a pure JS rules module (unit-tested with the repo's
existing vitest) holds the game logic; Postgres RLS makes a hand readable only
by the phone that holds it; devices learn about state changes through
RLS-filtered Postgres Changes. No client ever holds the deck.

**Tech Stack:** React 19 + Vite (existing SPA), Supabase (Postgres + RLS + Auth
anonymous sign-in + Realtime Postgres Changes + Edge Functions), vitest.

**Spec:** this document. The rules are transcribed from
[Jawaker Kout Bo 6](https://blog.jawaker.com/en/koutbo6-rules-en/) and
[Jawaker Kout Bo 4](https://blog.jawaker.com/en/koutbo4-rules-en/), confirmed
line-by-line by the product owner in design round 3.

---

## Global Constraints

- **Host viewport is ~844 × 390.** `src/index.css:250` — "Phone mirrored to a TV
  in landscape gives a ~390px-tall viewport." Every host screen must fit this.
  Test at 844×390, not on a desktop.
- **The host screen is mirrored to a TV. It must never render a card face that
  belongs to a player's hand.** Not in a debug panel, not behind a flag.
- **The host is not a player.** 4-player Kout = 5 devices. 6-player = 7 devices.
- **Arabic-first, RTL.** Match the existing pixel-arcade theme
  (`b8d9bb2 feat(theme): rebuild the UI as a 2D pixel-arcade cabinet`) and the
  CSS custom properties already in `src/index.css` (`--gold`, `--blue`, `--red`,
  `--panel`, `--outline`, `--gold-ink`).
- **Table name prefix is `kout_`.** `game_sessions` is already taken by the quiz
  (`supabase/migrations/0001_initial.sql:101`). Do not touch it.
- **Existing quiz flow must not change.** The only edit to shipped code is
  `src/screens/HomeScreen.jsx` gaining two more cards.
- **Migrations are numbered and commented in the existing house style.** See
  `supabase/migrations/0007_seen_question_tracking.sql` for the banner format.
  Next free number: **0010**.
- **Tests live beside their source as `*.test.js`** and run under the repo's
  bare vitest (no config file; `npm test` → `vitest run`). Node environment by
  default; add `/** @vitest-environment jsdom */` at the top of a file only if
  it touches the DOM.

---

## 1. The rules, as built

Locked in design round 3. If a diwaniya plays differently, this section is what
changes.

**Deck** — sized so it deals out exactly, with no stock:

| Variant | Deck | Count | Deal |
|---|---|---|---|
| Bo 4 | 52 minus ranks 2–5, minus `6H` and `6D`, plus both jokers | **36** | 4 × 9 |
| Bo 6 | full 52 plus both jokers | **54** | 6 × 9 |

**Rank in suit:** `7 8 9 10 J Q K A` (bo-4), `2 … A` (bo-6).

**Trick power, strongest first:** red joker → **Ace of hukm** → black joker →
other hukm by rank → lead suit by rank → everything else loses.

**Bidding:** counterclockwise from the dealer's right. Bid 5 (باب) … 9 (بوان),
or pass (طاف). If all pass, the last player is **مُلزم** — forced to bid 5. The
high bidder names hukm and leads the first trick. **There is no صن / no-trump in
Kout** (that is Baloot).

**Following:** must follow the lead suit if able; otherwise anything.

**Jokers:** a joker has **no suit** and can **never be hukm** — hukm is always
one of the four suits, never "joker". A joker **may lead a trick at any time**,
with no restriction. Because it carries no suit, a joker-led trick sets **no
lead suit**: every other player may play anything, and only a higher-power card
(red joker → ace of hukm → black joker → other hukm) can take it.

> **This diverges from Jawaker**, which restricts leading a joker until the hukm
> honours are gone or the bid is 8/9. The house rule above is the product
> owner's, confirmed directly, and house rules win (design round 4).

**Scoring:**
- Bid made → the bidding team scores the **tricks it actually took**.
- Bid failed → the **opponents** score **double the bid** (minimum 5 when مُلزم).
- A successful بوان (9) scores **36**.

**Game ends** when a team reaches **101**, or reaches **51 while the opponents
are still on 0**, or wins a first-round بوان taking all 9.

**One documented assumption**, flagged for the first play-test:
*A made bid scores tricks taken, not the bid.* Jawaker's bo-4 page says "earned
Lamas added to team score"; its bo-6 page says "scores the number of tricks
bid". Confirmed as tricks-taken in design round 3. Isolated in `scoreRound`.

---

## 2. How it works (data flow)

```
HOST PHONE → TV (landscape 844×390)          SUPABASE                 PLAYER PHONE ×4 or ×6
┌──────────────────────────────┐      ┌─────────────────────┐      ┌────────────────────────┐
│ /kout        setup + QR       │      │  Edge Function      │      │ scan QR                │
│ /kout/table  the table        │      │  `kout`             │      │ /kout/seat#<joinCode>  │
│                               │      │   ├ create          │      │ signInAnonymously()    │
│  creates game ────────────────┼─────►│   ├ claimSeat  ◄────┼──────┤ claim a seat           │
│  shows QR (from host menu)    │      │   ├ startRound      │      │                        │
│                               │      │   ├ bid       ◄─────┼──────┤ tap 5–9 or طاف         │
│  renders: current trick,      │      │   ├ setHukm   ◄─────┼──────┤ pick ♠♥♦♣              │
│  two coloured capture piles,  │      │   └ play      ◄─────┼──────┤ tap a legal card       │
│  seat ring, bid+hukm badge,   │      │  (service role —    │      │                        │
│  scores vs 101                │      │   the ONLY writer)  │      │ renders: own 9 cards,  │
│         ▲                     │      │                     │      │ illegal ones greyed    │
│         │ postgres_changes    │      │  kout_games  ───────┼─────►│         ▲              │
│         │ kout_games          │      │  kout_seats  ───────┼─────►│         │ + kout_hands │
│         └─────────────────────┼──────┤  kout_hands ── RLS ─┼──────┘  (own row only)        │
└──────────────────────────────┘      └─────────────────────┘      └────────────────────────┘

Vercel serves static files only. Every socket is device ↔ Supabase.
Clients NEVER write game tables — they call the Edge Function, which holds the
service-role key and is the single authority on what is legal.
```

**Why this shape.** The three worries — "no repeated card", "nobody sees my
hand", "my phone died in round 4" — are one problem: who owns the deck. Putting
the deck in one server-side function with the hand behind an RLS policy answers
all three at once, and reconnect comes free because the state was never in a
browser tab.

---

## 3. Architecture decisions

| Decision | Choice | Why |
|---|---|---|
| Deck ownership | **Server-authoritative.** Edge Function shuffles and deals with the service-role key | The only place that can guarantee 36/54 distinct cards *and* keep hands secret. A browser-side deal is one devtools tab away from cheating and one refresh away from a dead game. |
| Rules location | **Pure ESM module at `supabase/functions/_shared/koutRules.js`** | Deno (Edge Function) and vitest can both import that one path. Putting it under `src/` would strand the Edge Function; duplicating it would guarantee drift. |
| Secrecy | **RLS on `kout_hands`: `using (user_id = auth.uid())`** | One line does read-authorisation *and* realtime delivery filtering. No custom channel-secret scheme to get wrong. |
| Hand storage | **Separate `kout_hands` table**, not a column on `kout_seats` | The table has public columns (name, bid, card count) and one secret column. Splitting lets RLS be a one-liner and lets the host subscribe to `kout_seats` without a view — Postgres Changes works on tables, not views. |
| Deck integrity | `dealHands()` asserts it emitted exactly `seatCount × 9` **distinct** cards before any write | One tested function instead of a row-per-card schema you fight in every query. |
| Transport | **Postgres Changes**, not Broadcast | RLS already decides who may read what; Broadcast would make you re-solve secrecy per message type. |
| Player identity | **`supabase.auth.signInAnonymously()` on scan** | RLS needs an `auth.uid()`. Players never see a login screen. Fits the existing guest-mode shape in `AuthContext`. |
| Player UI | **Lazy-loaded React routes in the existing SPA**, not a second Vite entry | `draw.html` is a separate entry because a 60-second doodle page should not ship React. A Kout seat is a 40-minute stateful session that needs auth, realtime and routing — it *is* the app. Lazy-load it like `Dashboard` so the quiz bundle is unaffected. |
| Bo-4 vs bo-6 | **One engine, a `seatCount` flag** | Having read both rulesets they differ only in deck and team size. Same bidding, same مُلزم, same joker rule, same scoring, same 101. |
| History | `kout_results` keeps the final score; hands and tricks are discarded | Cheap, and "Bu Faisal has never won a بوان" is what brings a diwaniya back. Per-trick history is a later problem. |

---

## 4. File structure

**Create**

| Path | Responsibility |
|---|---|
| `supabase/functions/_shared/koutRules.js` | Pure game logic. No I/O, no Supabase import. The only file that knows what a legal play is. |
| `supabase/functions/_shared/koutRules.test.js` | vitest suite for the above. |
| `supabase/functions/kout/index.ts` | HTTP entry. Auth check, load state, call rules, write back. Thin — no rules live here. |
| `supabase/migrations/0010_kout.sql` | `kout_games`, `kout_seats`, `kout_hands`, `kout_results`, RLS, realtime publication. |
| `src/lib/koutClient.js` | Typed wrappers over the Edge Function (`createGame`, `claimSeat`, `placeBid`, `setHukm`, `playCard`). |
| `src/lib/useKoutGame.js` | Subscribes to the three tables for one game id; returns `{ game, seats, hand }`. Shared by host and player. |
| `src/lib/koutCards.js` | Card → display glyph/colour. Browser-only presentation; kept out of the rules module. |
| `src/screens/Kout/SetupScreen.jsx` | Host: 4 vs 6, team names + colours, seat-1 orientation. Creates the game. |
| `src/screens/Kout/TableScreen.jsx` | Host: the table. 844×390. |
| `src/screens/Kout/SeatScreen.jsx` | Player: claim a seat, then bid / pick hukm / play. |
| `src/screens/Kout/SeatRing.jsx` | Host sub-component: seats laid out counterclockwise. |
| `src/screens/Kout/TrickArea.jsx` | Host sub-component: cards in the current trick + the two capture piles. |
| `src/screens/Kout/HandStrip.jsx` | Player sub-component: 9 cards, illegal ones greyed. |
| `src/screens/Kout/JoinQr.jsx` | Full-screen QR, opened from the host menu. |

**Modify**

| Path | Change |
|---|---|
| `src/App.jsx:36-52` | Four lazy routes: `/kout`, `/kout/table`, `/kout/seat`. |
| `src/screens/HomeScreen.jsx:88-118` | Replace the single `ابدأ اللعبة` link with three game cards. |

---

## Phase 0 — De-risk the one load-bearing assumption

Everything above assumes **Postgres Changes honours RLS per subscriber**, so a
phone subscribed to `kout_hands` receives only its own row. If that is wrong,
the design changes. Prove it before writing real code. (Precedent: Pictionary's
plan opened with the same kind of throwaway spike.)

### Task 0: Realtime RLS spike

**Files:**
- Create: `scratch/kout-spike.md` (findings; deleted at the end of the phase)
- Create: a throwaway table via the Supabase SQL editor — **not** a migration

- [ ] **Step 1: Create the throwaway table and policy**

In the Supabase SQL editor:

```sql
create table public.spike_hands (
  id serial primary key,
  user_id uuid not null,
  cards jsonb not null
);
alter table public.spike_hands enable row level security;
create policy "own hand only" on public.spike_hands
  for select to authenticated using (user_id = auth.uid());
alter publication supabase_realtime add table public.spike_hands;
```

- [ ] **Step 2: Open two browsers, sign each in anonymously**

In each browser console on the running dev app:

```js
const { data } = await supabase.auth.signInAnonymously();
console.log(data.user.id);
supabase.channel('spike')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'spike_hands' },
      (p) => console.log('GOT', p.new))
  .subscribe();
```

- [ ] **Step 3: Insert one row for each uid from the SQL editor**

```sql
insert into public.spike_hands (user_id, cards) values
  ('<uid-A>', '["AS","KH"]'), ('<uid-B>', '["7C","9D"]');
```

- [ ] **Step 4: Record the verdict**

Expected: browser A logs only its own row; browser B logs only its own. Write
what actually happened into `scratch/kout-spike.md`.

**If B sees A's row, STOP and report.** The fallback is a `kout_hands` read via
an RPC over HTTPS plus a public Broadcast channel carrying only non-secret
events — a real design change, not a patch.

- [ ] **Step 5: Tear down**

```sql
drop table public.spike_hands;
```

```bash
rm -rf scratch/
git status --short   # must be clean — the spike leaves no trace
```

---

## Phase 1 — The rules module (no infrastructure, all vitest)

The whole game, as pure functions. Every edge case that will bite you at 1am in
a diwaniya gets a test here, where it is cheap.

### Task 1: Deck construction

**Files:**
- Create: `supabase/functions/_shared/koutRules.js`
- Test: `supabase/functions/_shared/koutRules.test.js`

**Interfaces:**
- Produces: `RANKS_BO6`, `RANKS_BO4`, `SUITS`, `RED_JOKER`, `BLACK_JOKER`,
  `buildDeck(seatCount) → string[]`, `suitOf(card) → 'S'|'H'|'D'|'C'|null`,
  `rankOf(card) → string|null`, `isJoker(card) → boolean`.
  A card is a 2-character string, rank then suit: `'AS'`, `'TH'`, `'7C'`.
  Ten is `'T'`. Jokers are `'JR'` and `'JB'` and have no suit.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { buildDeck, suitOf, rankOf, isJoker, RED_JOKER, BLACK_JOKER } from './koutRules.js';

describe('buildDeck', () => {
  it('bo-6 is the full 52 plus both jokers', () => {
    const deck = buildDeck(6);
    expect(deck).toHaveLength(54);
    expect(new Set(deck).size).toBe(54);
    expect(deck).toContain('2S');
    expect(deck).toContain(RED_JOKER);
    expect(deck).toContain(BLACK_JOKER);
  });

  it('bo-4 strips 2-5 and the two red sixes, leaving 36', () => {
    const deck = buildDeck(4);
    expect(deck).toHaveLength(36);
    expect(new Set(deck).size).toBe(36);
    for (const c of ['2S', '3H', '4D', '5C', '6H', '6D']) expect(deck).not.toContain(c);
    for (const c of ['6S', '6C', '7H', 'AS']) expect(deck).toContain(c);
  });

  it('always deals out exactly, nine each, no stock', () => {
    expect(buildDeck(4).length).toBe(4 * 9);
    expect(buildDeck(6).length).toBe(6 * 9);
  });

  it('rejects any other seat count', () => {
    expect(() => buildDeck(5)).toThrow(/seatCount/);
  });
});

describe('card helpers', () => {
  it('reads suit and rank', () => {
    expect(suitOf('TH')).toBe('H');
    expect(rankOf('TH')).toBe('T');
    expect(suitOf(RED_JOKER)).toBe(null);
    expect(isJoker(BLACK_JOKER)).toBe(true);
    expect(isJoker('AS')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: FAIL — "Failed to resolve import ./koutRules.js"

- [ ] **Step 3: Implement**

```js
/* Kout (كوت) rules — pure functions, no I/O.
   Imported by BOTH the Deno Edge Function and vitest, which is why it lives
   under supabase/functions/_shared/ and uses nothing but standard ESM. */

export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS_BO6 = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RANKS_BO4 = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RED_JOKER = 'JR';
export const BLACK_JOKER = 'JB';
export const HAND_SIZE = 9;

export function isJoker(card) {
  return card === RED_JOKER || card === BLACK_JOKER;
}
export function suitOf(card) {
  return isJoker(card) ? null : card[1];
}
export function rankOf(card) {
  return isJoker(card) ? null : card[0];
}

/* Bo-4 removes 2-5 outright AND the two RED sixes. Both matter: dropping only
   2-5 leaves 38 cards, which does not divide by 4. The red-six removal is what
   makes the deal come out exactly. */
export function buildDeck(seatCount) {
  if (seatCount !== 4 && seatCount !== 6) {
    throw new Error(`buildDeck: seatCount must be 4 or 6, got ${seatCount}`);
  }
  const ranks = seatCount === 6 ? RANKS_BO6 : RANKS_BO4;
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      if (seatCount === 4 && rank === '6' && (suit === 'H' || suit === 'D')) continue;
      deck.push(rank + suit);
    }
  }
  deck.push(RED_JOKER, BLACK_JOKER);
  return deck;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/koutRules.js supabase/functions/_shared/koutRules.test.js
git commit -m "feat(kout): build the bo-4 and bo-6 decks"
```

---

### Task 2: Shuffle and deal, with the integrity assertion

**Files:**
- Modify: `supabase/functions/_shared/koutRules.js`
- Test: `supabase/functions/_shared/koutRules.test.js`

**Interfaces:**
- Consumes: `buildDeck` from Task 1.
- Produces: `makeRng(seed) → () => number` (deterministic, for tests),
  `shuffle(deck, rng) → string[]` (pure, returns a new array),
  `dealHands(seatCount, rng) → string[][]` (`seatCount` arrays of 9).

- [ ] **Step 1: Write the failing test**

```js
import { makeRng, shuffle, dealHands, buildDeck } from './koutRules.js';

describe('shuffle', () => {
  it('is a permutation, not a mutation', () => {
    const deck = buildDeck(4);
    const out = shuffle(deck, makeRng(1));
    expect(out).toHaveLength(deck.length);
    expect([...out].sort()).toEqual([...deck].sort());
    expect(deck[0]).toBe(buildDeck(4)[0]); // input untouched
  });

  it('is deterministic for a given seed', () => {
    expect(shuffle(buildDeck(6), makeRng(42))).toEqual(shuffle(buildDeck(6), makeRng(42)));
  });

  it('actually moves cards', () => {
    const deck = buildDeck(6);
    expect(shuffle(deck, makeRng(7))).not.toEqual(deck);
  });
});

describe('dealHands', () => {
  it.each([4, 6])('gives %i players nine distinct cards each, using the whole deck', (n) => {
    const hands = dealHands(n, makeRng(3));
    expect(hands).toHaveLength(n);
    for (const h of hands) expect(h).toHaveLength(9);
    const all = hands.flat();
    expect(all).toHaveLength(n * 9);
    expect(new Set(all).size).toBe(n * 9); // THE no-duplicate guarantee
    expect([...all].sort()).toEqual([...buildDeck(n)].sort());
  });

  it('throws rather than dealing a corrupt deck', () => {
    // An rng that returns >= 1 would push an out-of-range index.
    expect(() => dealHands(4, () => 1)).not.toThrow(); // clamped, still valid
    const hands = dealHands(4, () => 1);
    expect(new Set(hands.flat()).size).toBe(36);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: FAIL — "makeRng is not a function"

- [ ] **Step 3: Implement**

```js
/* mulberry32 — small, fast, seedable. Tests pass a seed; production passes a
   crypto-backed rng so a shuffle is not predictable from the game id. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    // Clamp: a hostile or buggy rng returning >= 1 must not index out of range.
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* The single point where deck integrity is enforced. Nothing writes a hand to
   the database without passing through here, so "no repeated card" is a
   property of one tested function rather than of every query. */
export function dealHands(seatCount, rng) {
  const deck = shuffle(buildDeck(seatCount), rng);
  const hands = [];
  for (let seat = 0; seat < seatCount; seat++) {
    hands.push(deck.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE));
  }
  const flat = hands.flat();
  if (flat.length !== seatCount * HAND_SIZE || new Set(flat).size !== flat.length) {
    throw new Error('dealHands: corrupt deal — duplicate or missing cards');
  }
  return hands;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/koutRules.js supabase/functions/_shared/koutRules.test.js
git commit -m "feat(kout): shuffle and deal with a no-duplicate guarantee"
```

---

### Task 3: Trick power and the trick winner

**Files:**
- Modify: `supabase/functions/_shared/koutRules.js`
- Test: `supabase/functions/_shared/koutRules.test.js`

**Interfaces:**
- Consumes: `isJoker`, `suitOf`, `rankOf`, `RANKS_BO6`.
- Produces: `cardPower(card, { hukm, leadSuit, seatCount }) → number`
  (higher wins; `0` means the card cannot win the trick),
  `trickWinner(trick, { hukm, leadSuit, seatCount }) → number`
  where `trick` is `[{ seat, card }, …]` and the return is the winning **seat**.

- [ ] **Step 1: Write the failing test**

```js
import { trickWinner, cardPower, RED_JOKER, BLACK_JOKER } from './koutRules.js';

const ctx = { hukm: 'S', leadSuit: 'H', seatCount: 4 };

describe('trickWinner', () => {
  it('highest card of the lead suit wins a plain trick', () => {
    const trick = [
      { seat: 0, card: '9H' }, { seat: 1, card: 'KH' },
      { seat: 2, card: '7H' }, { seat: 3, card: 'TH' },
    ];
    expect(trickWinner(trick, ctx)).toBe(1);
  });

  it('an off-suit discard cannot win', () => {
    const trick = [
      { seat: 0, card: '7H' }, { seat: 1, card: 'AD' },
      { seat: 2, card: 'AC' }, { seat: 3, card: '8H' },
    ];
    expect(trickWinner(trick, ctx)).toBe(3);
  });

  it('any hukm beats any lead-suit card', () => {
    const trick = [
      { seat: 0, card: 'AH' }, { seat: 1, card: '7S' },
      { seat: 2, card: 'KH' }, { seat: 3, card: 'QH' },
    ];
    expect(trickWinner(trick, ctx)).toBe(1);
  });

  it('ranks hukm among itself', () => {
    const trick = [
      { seat: 0, card: '7H' }, { seat: 1, card: '7S' },
      { seat: 2, card: 'KS' }, { seat: 3, card: 'TS' },
    ];
    expect(trickWinner(trick, ctx)).toBe(2);
  });

  it('orders red joker > ace of hukm > black joker > other hukm', () => {
    const p = (c) => cardPower(c, ctx);
    expect(p(RED_JOKER)).toBeGreaterThan(p('AS'));
    expect(p('AS')).toBeGreaterThan(p(BLACK_JOKER));
    expect(p(BLACK_JOKER)).toBeGreaterThan(p('KS'));
    expect(p('KS')).toBeGreaterThan(p('AH'));
  });

  it('red joker takes a trick containing the ace of hukm', () => {
    const trick = [
      { seat: 0, card: 'AS' }, { seat: 1, card: RED_JOKER },
      { seat: 2, card: BLACK_JOKER }, { seat: 3, card: 'KS' },
    ];
    expect(trickWinner(trick, ctx)).toBe(1);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: FAIL — "trickWinner is not a function"

- [ ] **Step 3: Implement**

```js
/* Power bands, so comparisons never need branching at the call site:
     4000  red joker
     3000  ace of hukm
     2000  black joker
     1000+ other hukm, by rank
      100+ lead suit, by rank
         0 cannot win
   A joker is always in the top band regardless of what was led — jokers have
   no suit and are never "off-suit". */
export function cardPower(card, { hukm, leadSuit, seatCount }) {
  if (card === RED_JOKER) return 4000;
  if (card === BLACK_JOKER) return 2000;
  const ranks = seatCount === 6 ? RANKS_BO6 : RANKS_BO4;
  const r = ranks.indexOf(rankOf(card));
  const s = suitOf(card);
  if (s === hukm) return rankOf(card) === 'A' ? 3000 : 1000 + r;
  if (s === leadSuit) return 100 + r;
  return 0;
}

export function trickWinner(trick, ctx) {
  let best = null;
  let bestPower = -1;
  for (const { seat, card } of trick) {
    const p = cardPower(card, ctx);
    if (p > bestPower) {
      bestPower = p;
      best = seat;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/koutRules.js supabase/functions/_shared/koutRules.test.js
git commit -m "feat(kout): rank trick power with joker and hukm-ace overrides"
```

---

### Task 4: Legal plays — follow suit, and the suitless joker

**Files:**
- Modify: `supabase/functions/_shared/koutRules.js`
- Test: `supabase/functions/_shared/koutRules.test.js`

**Interfaces:**
- Consumes: `isJoker`, `suitOf`.
- Produces:
  `leadSuitFor(trick) → 'S'|'H'|'D'|'C'|null` — `null` both before anyone has
  played and when a **joker** led, because a joker carries no suit;
  `legalPlays(hand, { trick, seatCount }) → string[]`.
  `trick` is `[]` when this player is leading.

  House rule (product owner, design round 7): **a joker may lead at any time**
  and can never be hukm. So leading is unrestricted, and a joker-led trick
  imposes no suit on anyone.

- [ ] **Step 1: Write the failing test**

```js
import { legalPlays, leadSuitFor, RED_JOKER, BLACK_JOKER } from './koutRules.js';

const base = { seatCount: 4 };

describe('legalPlays — leading', () => {
  it('lets the leader play anything at all', () => {
    const hand = ['7H', 'AS', RED_JOKER, BLACK_JOKER];
    expect(legalPlays(hand, { ...base, trick: [] }).sort()).toEqual([...hand].sort());
  });

  it('never restricts a joker lead', () => {
    const out = legalPlays(['9C', RED_JOKER, BLACK_JOKER], { ...base, trick: [] });
    expect(out).toContain(RED_JOKER);
    expect(out).toContain(BLACK_JOKER);
  });
});

describe('legalPlays — following', () => {
  it('must follow the lead suit when able', () => {
    const hand = ['7H', 'KH', 'AS', '9C'];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out.sort()).toEqual(['7H', 'KH']);
  });

  it('may play anything when void in the lead suit', () => {
    const hand = ['AS', '9C', RED_JOKER];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out.sort()).toEqual([...hand].sort());
  });

  it('does not count a joker as following suit', () => {
    const hand = ['7H', RED_JOKER];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out).toEqual(['7H']); // holding a heart, the heart is forced
  });

  it('frees everyone when a joker led — no suit was set', () => {
    const hand = ['7H', 'AS', '9C'];
    const out = legalPlays(hand, { ...base, trick: [{ seat: 0, card: RED_JOKER }] });
    expect(out.sort()).toEqual([...hand].sort());
  });

  it('still frees everyone when the black joker led', () => {
    const out = legalPlays(['7H', 'AS'], { ...base, trick: [{ seat: 0, card: BLACK_JOKER }] });
    expect(out).toHaveLength(2);
  });

  it('always leaves at least one legal card', () => {
    const out = legalPlays([RED_JOKER, BLACK_JOKER], { ...base, trick: [{ seat: 0, card: 'TH' }] });
    expect(out).toHaveLength(2);
  });
});

describe('leadSuitFor', () => {
  it('is the suit of the first card', () => {
    expect(leadSuitFor([{ seat: 0, card: 'TH' }])).toBe('H');
  });
  it('is null when a joker led — a joker has no suit', () => {
    expect(leadSuitFor([{ seat: 0, card: RED_JOKER }])).toBe(null);
    expect(leadSuitFor([{ seat: 0, card: BLACK_JOKER }])).toBe(null);
  });
  it('is null before anyone has played', () => {
    expect(leadSuitFor([])).toBe(null);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: FAIL — "legalPlays is not a function"

- [ ] **Step 3: Implement**

```js
/* A joker has no suit and can never be hukm. Two consequences, both house rule
   (design round 7), and both deliberately simpler than Jawaker's published
   variant — which gates a joker lead behind the hukm honours or a bid of 8/9:

     1. Leading is completely unrestricted. Any card, any time.
     2. A joker-led trick sets NO lead suit, so nobody has anything to follow
        and every player may play whatever they like into it. Only a
        higher-power card can take it — see cardPower. */

export function leadSuitFor(trick) {
  if (!trick || trick.length === 0) return null;
  const first = trick[0].card;
  return isJoker(first) ? null : suitOf(first);
}

export function legalPlays(hand, { trick }) {
  const lead = leadSuitFor(trick);
  if (lead === null) return [...hand];        // leading, or a joker was led
  const following = hand.filter((c) => suitOf(c) === lead);
  return following.length > 0 ? following : [...hand];
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/koutRules.js supabase/functions/_shared/koutRules.test.js
git commit -m "feat(kout): follow-suit rules with the suitless, always-leadable joker"
```

---


### Task 5: Bidding, مُلزم, and round scoring

**Files:**
- Modify: `supabase/functions/_shared/koutRules.js`
- Test: `supabase/functions/_shared/koutRules.test.js`

**Interfaces:**
- Produces:
  `MIN_BID = 5`, `MAX_BID = 9`, `PASS = -1`, `TARGET_SCORE = 101`,
  `teamOf(seat) → 0|1` (seats alternate, so `seat % 2`),
  `nextSeat(seat, seatCount) → number` (counterclockwise = ascending),
  `resolveBidding(bids, { seatCount, lastSeat }) → { winnerSeat, bid, mulzum }`
  where `bids` is an array indexed by seat holding a bid, `PASS`, or `null`,
  `scoreRound({ bid, bidderSeat, mulzum, tricksWon }) → [number, number]`
  where `tricksWon` is `[team0, team1]` and the return is the points **added**,
  `checkGameOver(score, { roundNo, bid, tricksWon, bidderSeat }) → 0|1|null`.

- [ ] **Step 1: Write the failing test**

```js
import {
  resolveBidding, scoreRound, checkGameOver, teamOf, nextSeat, PASS,
} from './koutRules.js';

describe('seating', () => {
  it('alternates teams around the table', () => {
    expect([0, 1, 2, 3, 4, 5].map(teamOf)).toEqual([0, 1, 0, 1, 0, 1]);
  });
  it('turns counterclockwise and wraps', () => {
    expect(nextSeat(3, 4)).toBe(0);
    expect(nextSeat(4, 6)).toBe(5);
  });
});

describe('resolveBidding', () => {
  it('the highest bid wins', () => {
    expect(resolveBidding([5, PASS, 7, PASS], { seatCount: 4, lastSeat: 3 }))
      .toEqual({ winnerSeat: 2, bid: 7, mulzum: false });
  });

  it('forces the last seat to five when everyone passes — مُلزم', () => {
    expect(resolveBidding([PASS, PASS, PASS, PASS], { seatCount: 4, lastSeat: 3 }))
      .toEqual({ winnerSeat: 3, bid: 5, mulzum: true });
  });

  it('keeps the first of two equal bids — you cannot match, only raise', () => {
    expect(resolveBidding([7, PASS, 7, PASS], { seatCount: 4, lastSeat: 3 }).winnerSeat).toBe(0);
  });
});

describe('scoreRound', () => {
  it('a made bid scores the tricks actually taken', () => {
    // Bid 5, took 6 → team 0 gets 6, not 5.
    expect(scoreRound({ bid: 5, bidderSeat: 0, mulzum: false, tricksWon: [6, 3] }))
      .toEqual([6, 0]);
  });

  it('a failed bid gives the opponents double the bid', () => {
    expect(scoreRound({ bid: 7, bidderSeat: 0, mulzum: false, tricksWon: [6, 3] }))
      .toEqual([0, 14]);
  });

  it('a failed مُلزم gives the minimum five', () => {
    expect(scoreRound({ bid: 5, bidderSeat: 1, mulzum: true, tricksWon: [5, 4] }))
      .toEqual([5, 0]);
  });

  it('a made بوان is worth thirty-six', () => {
    expect(scoreRound({ bid: 9, bidderSeat: 1, mulzum: false, tricksWon: [0, 9] }))
      .toEqual([0, 36]);
  });

  it('scores the bidding team from the correct seat', () => {
    expect(scoreRound({ bid: 5, bidderSeat: 1, mulzum: false, tricksWon: [3, 6] }))
      .toEqual([0, 6]);
  });
});

describe('checkGameOver', () => {
  const noWin = { roundNo: 3, bid: 5, tricksWon: [5, 4], bidderSeat: 0 };
  it('ends at 101', () => {
    expect(checkGameOver([104, 60], noWin)).toBe(0);
    expect(checkGameOver([99, 60], noWin)).toBe(null);
  });
  it('ends at 51 when the opponents are still on zero', () => {
    expect(checkGameOver([55, 0], noWin)).toBe(0);
    expect(checkGameOver([55, 3], noWin)).toBe(null);
  });
  it('ends on a first-round بوان that takes all nine', () => {
    expect(checkGameOver([36, 0], { roundNo: 1, bid: 9, tricksWon: [9, 0], bidderSeat: 0 })).toBe(0);
  });
  it('does not end on a بوان in a later round', () => {
    expect(checkGameOver([36, 40], { roundNo: 2, bid: 9, tricksWon: [9, 0], bidderSeat: 0 })).toBe(null);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run supabase/functions/_shared/koutRules.test.js`
Expected: FAIL — "resolveBidding is not a function"

- [ ] **Step 3: Implement**

```js
export const MIN_BID = 5;
export const MAX_BID = 9;
export const PASS = -1;
export const TARGET_SCORE = 101;
export const SHUTOUT_SCORE = 51;
export const BAWN_SCORE = 36;

/* Seats alternate around the table, so team is simply parity. This is what
   makes partnership play work and is why the host picks seat 1's position at
   setup — the on-screen ring must match the physical room. */
export const teamOf = (seat) => seat % 2;
export const nextSeat = (seat, seatCount) => (seat + 1) % seatCount;

export function resolveBidding(bids, { seatCount, lastSeat }) {
  let winnerSeat = null;
  let bid = 0;
  for (let seat = 0; seat < seatCount; seat++) {
    const b = bids[seat];
    if (typeof b !== 'number' || b === PASS) continue;
    if (b > bid) {            // strictly greater — you raise, you cannot match
      bid = b;
      winnerSeat = seat;
    }
  }
  if (winnerSeat === null) {
    return { winnerSeat: lastSeat, bid: MIN_BID, mulzum: true }; // مُلزم
  }
  return { winnerSeat, bid, mulzum: false };
}

export function scoreRound({ bid, bidderSeat, mulzum, tricksWon }) {
  const bidTeam = teamOf(bidderSeat);
  const other = bidTeam === 0 ? 1 : 0;
  const taken = tricksWon[bidTeam];
  const out = [0, 0];
  if (taken >= bid) {
    out[bidTeam] = bid === MAX_BID ? BAWN_SCORE : taken;
  } else {
    out[other] = mulzum ? Math.max(MIN_BID, bid * 2) : bid * 2;
  }
  return out;
}

export function checkGameOver(score, { roundNo, bid, tricksWon, bidderSeat }) {
  for (const team of [0, 1]) {
    const other = team === 0 ? 1 : 0;
    if (score[team] >= TARGET_SCORE) return team;
    if (score[team] >= SHUTOUT_SCORE && score[other] === 0) return team;
  }
  if (roundNo === 1 && bid === MAX_BID && tricksWon[teamOf(bidderSeat)] === 9) {
    return teamOf(bidderSeat);
  }
  return null;
}
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS — the new Kout tests plus every pre-existing test.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/koutRules.js supabase/functions/_shared/koutRules.test.js
git commit -m "feat(kout): resolve bidding, مُلزم and round scoring"
```

---

### Task 6: A full-round property test

The engine is only trustworthy if a whole round can be played end to end
without ever losing or duplicating a card. This is the test that catches the
class of bug the whole architecture exists to prevent.

**Files:**
- Create: `supabase/functions/_shared/koutRound.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1–5.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import {
  dealHands, makeRng, legalPlays, trickWinner, leadSuitFor,
  nextSeat, teamOf, scoreRound, HAND_SIZE,
} from './koutRules.js';

/* Plays a whole round with every player choosing their first legal card.
   Asserts the invariants that must hold no matter what: nine tricks, every
   card played exactly once, tricks split between the two teams. */
function playRound(seatCount, seed) {
  const hands = dealHands(seatCount, makeRng(seed));
  const dealt = hands.flat();
  const hukm = 'S';
  const bid = 5;
  const bidderSeat = 0;
  const playedCards = [];
  const tricksWon = [0, 0];
  let leader = bidderSeat;

  for (let t = 0; t < HAND_SIZE; t++) {
    const trick = [];
    let seat = leader;
    for (let i = 0; i < seatCount; i++) {
      const options = legalPlays(hands[seat], { trick, seatCount });
      expect(options.length).toBeGreaterThan(0);
      const card = options[0];
      hands[seat] = hands[seat].filter((c) => c !== card);
      trick.push({ seat, card });
      playedCards.push(card);
      seat = nextSeat(seat, seatCount);
    }
    const leadSuit = leadSuitFor(trick);
    leader = trickWinner(trick, { hukm, leadSuit, seatCount });
    tricksWon[teamOf(leader)] += 1;
  }
  return { dealt, playedCards, tricksWon, hands };
}

describe('a complete round', () => {
  it.each([4, 6])('plays out with %i seats without losing a card', (seatCount) => {
    for (let seed = 1; seed <= 25; seed++) {
      const { dealt, playedCards, tricksWon, hands } = playRound(seatCount, seed);
      expect(playedCards).toHaveLength(seatCount * HAND_SIZE);
      expect(new Set(playedCards).size).toBe(playedCards.length);
      expect([...playedCards].sort()).toEqual([...dealt].sort());
      for (const h of hands) expect(h).toHaveLength(0);
      expect(tricksWon[0] + tricksWon[1]).toBe(HAND_SIZE);
    }
  });

  it('always produces a score for exactly one team', () => {
    const { tricksWon } = playRound(4, 11);
    const points = scoreRound({ bid: 5, bidderSeat: 0, mulzum: false, tricksWon });
    expect(points.filter((p) => p > 0)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run supabase/functions/_shared/koutRound.test.js`
Expected: PASS if Tasks 1–5 are correct. **If it fails, the bug is in the rules
module, not in this test** — fix the module.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/koutRound.test.js
git commit -m "test(kout): play whole rounds and assert no card is lost"
```

---

## Phase 2 — Schema and the RLS policy that does the real work

### Task 7: The migration

**Files:**
- Create: `supabase/migrations/0010_kout.sql`

**Interfaces:**
- Produces: tables `kout_games`, `kout_seats`, `kout_hands`, `kout_results`.

- [ ] **Step 1: Write the migration**

```sql
-- ════════════════════════════════════════════════════════════════════
--   Kout (كوت) — server-authoritative card game
--   Migration: 0010_kout
-- ════════════════════════════════════════════════════════════════════
--
-- The whole design turns on one idea: the deck is owned by the server, so
-- a client can neither invent a card nor read someone else's hand.
--
--   kout_games  — one row per game. Public to everyone seated in it.
--   kout_seats  — one row per seat. Public columns only: who, which team,
--                 what they bid, how many cards they hold. NO card faces.
--   kout_hands  — the secret. One row per seat, RLS'd to that seat's own
--                 auth uid. This single policy is what stops a player from
--                 reading another hand, AND what stops Realtime delivering
--                 another player's row to them.
--   kout_results— the tombstone kept after a game ends. Hands are dropped.
--
-- Clients NEVER write these tables. Every mutation goes through the `kout`
-- Edge Function, which holds the service-role key and is the only place
-- that knows what a legal play is. Hence: no insert/update/delete policies
-- for `authenticated` anywhere below. Read-only is the whole client story.
-- ════════════════════════════════════════════════════════════════════

-- ── kout_games ─────────────────────────────────────────────────────
create table if not exists public.kout_games (
  id            uuid primary key default gen_random_uuid(),
  join_code     text not null unique,
  host_id       uuid not null,
  seat_count    int  not null check (seat_count in (4, 6)),
  status        text not null default 'lobby'
                  check (status in ('lobby','bidding','hukm','playing','round_end','finished')),
  round_no      int  not null default 0,
  dealer_seat   int  not null default 0,
  turn_seat     int,
  bidder_seat   int,
  bid           int,
  mulzum        boolean not null default false,
  hukm          text check (hukm in ('S','H','D','C')),
  trick         jsonb not null default '[]'::jsonb,   -- [{seat, card}]
  played_cards  jsonb not null default '[]'::jsonb,   -- this round, all tricks
  tricks_won    int[] not null default '{0,0}',
  score         int[] not null default '{0,0}',
  team_names    text[] not null default '{"فريق ١","فريق ٢"}',
  winner_team   int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists kout_games_join_code_idx on public.kout_games (join_code);

-- ── kout_seats ─────────────────────────────────────────────────────
-- Everything here is safe for the mirrored TV to render.
create table if not exists public.kout_seats (
  game_id     uuid not null references public.kout_games(id) on delete cascade,
  seat        int  not null,
  user_id     uuid,
  name        text not null default '',
  bid         int,                       -- null = not yet bid, -1 = طاف
  card_count  int  not null default 0,
  connected   boolean not null default false,
  primary key (game_id, seat)
);

create index if not exists kout_seats_user_idx on public.kout_seats (user_id);

-- ── kout_hands ─────────────────────────────────────────────────────
-- The secret table. user_id is denormalised onto the row on purpose so the
-- policy is an index-backed equality check with no join.
create table if not exists public.kout_hands (
  game_id  uuid not null references public.kout_games(id) on delete cascade,
  seat     int  not null,
  user_id  uuid not null,
  cards    jsonb not null default '[]'::jsonb,
  primary key (game_id, seat)
);

create index if not exists kout_hands_user_idx on public.kout_hands (user_id);

-- ── kout_results ───────────────────────────────────────────────────
create table if not exists public.kout_results (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null,
  played_at   timestamptz not null default now(),
  seat_count  int not null,
  rounds      int not null,
  score       int[] not null,
  winner_team int not null,
  players     jsonb not null default '[]'::jsonb   -- [{seat, name, team}]
);

create index if not exists kout_results_host_played_idx
  on public.kout_results (host_id, played_at desc);

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.kout_games   enable row level security;
alter table public.kout_seats   enable row level security;
alter table public.kout_hands   enable row level security;
alter table public.kout_results enable row level security;

-- Membership must be answered by a security definer helper, NOT by a policy
-- subquery. A policy on kout_seats that reads kout_seats re-enters itself, and
-- a kout_games policy reading kout_seats while kout_seats reads kout_games back
-- is a mutual cycle. Postgres raises "infinite recursion detected in policy" at
-- QUERY time — the migration applies clean and every read then fails. Running
-- with the definer's rights breaks the cycle by skipping RLS inside the check.
-- search_path is pinned because security definer bypasses RLS by design: it
-- stops a caller shadowing kout_seats with an object of their own.
create or replace function public.is_kout_member(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.kout_seats s
    where s.game_id = p_game_id and s.user_id = auth.uid()
  ) or exists (
    select 1 from public.kout_games g
    where g.id = p_game_id and g.host_id = auth.uid()
  );
$fn$;

revoke all on function public.is_kout_member(uuid) from public;
grant execute on function public.is_kout_member(uuid) to authenticated;

-- A game is readable by its host and by anyone holding a seat in it.
drop policy if exists "Members read game" on public.kout_games;
create policy "Members read game" on public.kout_games
  for select to authenticated
  using (public.is_kout_member(id));

-- Seats are public to members — names, bids and card counts, nothing secret.
drop policy if exists "Members read seats" on public.kout_seats;
create policy "Members read seats" on public.kout_seats
  for select to authenticated
  using (public.is_kout_member(game_id));

-- ★ The policy the whole design rests on. One line, one job: your hand is
--   yours. It gates both the SELECT and what Realtime is allowed to deliver.
--   The host is deliberately NOT granted access — the host screen is mirrored
--   to a television.
drop policy if exists "Own hand only" on public.kout_hands;
create policy "Own hand only" on public.kout_hands
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Host reads own results" on public.kout_results;
create policy "Host reads own results" on public.kout_results
  for select to authenticated
  using (host_id = (select auth.uid()));

-- ── Grants ─────────────────────────────────────────────────────────
-- Read only. Every write is the Edge Function's service-role client.
grant select on public.kout_games, public.kout_seats,
                public.kout_hands, public.kout_results to authenticated;

-- ── Realtime ───────────────────────────────────────────────────────
alter publication supabase_realtime add table public.kout_games;
alter publication supabase_realtime add table public.kout_seats;
alter publication supabase_realtime add table public.kout_hands;
```

- [ ] **Step 2: Apply it**

```bash
npx supabase db push
```

Expected: applies clean. If `supabase_realtime` already contains a table the
`alter publication` errors — wrap the three lines in a `do $$ … $$` block that
checks `pg_publication_tables` first, and re-run.

- [ ] **Step 3: Verify the secrecy policy by hand**

In the SQL editor, insert two `kout_hands` rows with two different `user_id`s,
then from a signed-in browser console:

```js
const { data } = await supabase.from('kout_hands').select('*');
console.log(data); // MUST be exactly one row — this session's own
```

Expected: one row. **If two come back, stop — the policy is wrong and nothing
built on top of it is safe.**

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0010_kout.sql
git commit -m "feat(kout): add game tables with an own-hand-only RLS policy"
```

---

## Phase 3 — The Edge Function

### Task 8: Function skeleton, `create` and `claimSeat`

**Files:**
- Create: `supabase/functions/kout/index.ts`
- Create: `src/lib/koutClient.js`

**Interfaces:**
- Consumes: `koutRules.js` (Tasks 1–5), tables from Task 7.
- Produces: an HTTP endpoint taking `{ action, ...args }` and returning
  `{ ok: true, ... }` or `{ ok: false, error }`.
  Client wrappers: `createGame({ seatCount, teamNames }) → { gameId, joinCode }`,
  `claimSeat({ joinCode, seat, name }) → { gameId, seat }`.

- [ ] **Step 1: Write the function**

```ts
// supabase/functions/kout/index.ts
// The single authority on Kout state. Holds the service-role key; every
// mutation the players and host make arrives here as an action.
// All game logic lives in ../_shared/koutRules.js — nothing rule-shaped
// belongs in this file.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  dealHands, legalPlays, leadSuitFor, trickWinner, nextSeat, teamOf,
  resolveBidding, scoreRound, checkGameOver, MIN_BID, MAX_BID, PASS, HAND_SIZE,
} from '../_shared/koutRules.js';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
};

const fail = (error: string, status = 400) => json({ ok: false, error }, status);

// Crypto-backed rng — a shuffle must not be predictable from the game id.
const secureRng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

const newJoinCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

async function callerId(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const uid = await callerId(req);
  if (!uid) return fail('not signed in', 401);

  const { action, ...args } = await req.json();

  switch (action) {
    case 'create': return create(uid, args);
    case 'claimSeat': return claimSeat(uid, args);
    default: return fail(`unknown action: ${action}`);
  }
});

async function create(uid: string, { seatCount, teamNames }: any) {
  if (seatCount !== 4 && seatCount !== 6) return fail('seatCount must be 4 or 6');

  const joinCode = newJoinCode();
  const { data: game, error } = await admin
    .from('kout_games')
    .insert({
      join_code: joinCode,
      host_id: uid,
      seat_count: seatCount,
      team_names: teamNames ?? ['فريق ١', 'فريق ٢'],
    })
    .select()
    .single();
  if (error) return fail(error.message, 500);

  const seats = Array.from({ length: seatCount }, (_, seat) => ({
    game_id: game.id, seat,
  }));
  const { error: seatErr } = await admin.from('kout_seats').insert(seats);
  if (seatErr) return fail(seatErr.message, 500);

  return json({ ok: true, gameId: game.id, joinCode });
}

async function claimSeat(uid: string, { joinCode, seat, name }: any) {
  const { data: game } = await admin
    .from('kout_games').select('*').eq('join_code', joinCode).single();
  if (!game) return fail('no such game', 404);
  if (game.status !== 'lobby') return fail('game already started');
  if (seat < 0 || seat >= game.seat_count) return fail('no such seat');

  // Re-joining your own seat after a dead phone is allowed and is the whole
  // point of storing seats server-side. Taking someone else's is not.
  const { data: existing } = await admin
    .from('kout_seats').select('user_id')
    .eq('game_id', game.id).eq('seat', seat).single();
  if (existing?.user_id && existing.user_id !== uid) return fail('seat taken');

  const { error } = await admin
    .from('kout_seats')
    .update({ user_id: uid, name: (name ?? '').slice(0, 20), connected: true })
    .eq('game_id', game.id).eq('seat', seat);
  if (error) return fail(error.message, 500);

  return json({ ok: true, gameId: game.id, seat });
}
```

- [ ] **Step 2: Write the client wrapper**

```js
// src/lib/koutClient.js
import { supabase } from './supabase';

/* Every Kout mutation goes through the `kout` Edge Function — clients have
   read-only grants on the game tables by design (see 0010_kout.sql). */
async function call(action, args = {}) {
  const { data, error } = await supabase.functions.invoke('kout', {
    body: { action, ...args },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? 'kout: unknown error');
  return data;
}

/* Players arrive by QR with no account. An anonymous session is enough for
   RLS to identify a seat, and they never see a login screen. */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
  return anon.session;
}

export const createGame = (seatCount, teamNames) => call('create', { seatCount, teamNames });
export const claimSeat = (joinCode, seat, name) => call('claimSeat', { joinCode, seat, name });
export const startRound = (gameId) => call('startRound', { gameId });
export const placeBid = (gameId, bid) => call('bid', { gameId, bid });
export const setHukm = (gameId, hukm) => call('setHukm', { gameId, hukm });
export const playCard = (gameId, card) => call('play', { gameId, card });
```

- [ ] **Step 3: Deploy and smoke-test**

```bash
npx supabase functions deploy kout
```

Then from a signed-in browser console:

```js
import('/src/lib/koutClient.js').then(async (k) => {
  await k.ensureSession();
  console.log(await k.createGame(4));
});
```

Expected: `{ ok: true, gameId: '…', joinCode: 'A1B2C3' }`, and four rows in
`kout_seats`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/kout/index.ts src/lib/koutClient.js
git commit -m "feat(kout): add the edge function with create and claim-seat"
```

---

### Task 9: `startRound` — the deal

**Files:**
- Modify: `supabase/functions/kout/index.ts`

**Interfaces:**
- Consumes: `dealHands` from Task 2.
- Produces: action `startRound({ gameId })`. Host only. Deals, writes
  `kout_hands`, sets `status = 'bidding'`, sets `turn_seat` to the dealer's
  right.

- [ ] **Step 1: Add the action**

Add `case 'startRound': return startRound(uid, args);` to the switch, then:

```ts
async function startRound(uid: string, { gameId }: any) {
  const { data: game } = await admin.from('kout_games').select('*').eq('id', gameId).single();
  if (!game) return fail('no such game', 404);
  if (game.host_id !== uid) return fail('only the host starts a round', 403);

  const { data: seats } = await admin
    .from('kout_seats').select('*').eq('game_id', gameId).order('seat');
  if (!seats || seats.some((s) => !s.user_id)) return fail('every seat must be claimed');

  // dealHands throws rather than emit a corrupt deal — see koutRules.js.
  const hands = dealHands(game.seat_count, secureRng);

  const { error: handErr } = await admin.from('kout_hands').upsert(
    hands.map((cards, seat) => ({
      game_id: gameId, seat, user_id: seats[seat].user_id, cards,
    })),
    { onConflict: 'game_id,seat' },
  );
  if (handErr) return fail(handErr.message, 500);

  const dealer = game.round_no === 0 ? game.dealer_seat
                                     : nextSeat(game.dealer_seat, game.seat_count);

  await admin.from('kout_seats')
    .update({ bid: null, card_count: HAND_SIZE }).eq('game_id', gameId);

  const { error } = await admin.from('kout_games').update({
    status: 'bidding',
    round_no: game.round_no + 1,
    dealer_seat: dealer,
    // Bidding opens to the dealer's RIGHT and runs counterclockwise.
    turn_seat: nextSeat(dealer, game.seat_count),
    bid: null, bidder_seat: null, mulzum: false, hukm: null,
    trick: [], played_cards: [], tricks_won: [0, 0],
    updated_at: new Date().toISOString(),
  }).eq('id', gameId);
  if (error) return fail(error.message, 500);

  return json({ ok: true });
}
```

- [ ] **Step 2: Deploy and verify the deal is secret**

```bash
npx supabase functions deploy kout
```

Claim all four seats from four browser profiles, call `startRound`, then in
each console:

```js
const { data } = await supabase.from('kout_hands').select('*');
console.log(data.length, data[0]?.cards);
```

Expected: each reports `1` and nine cards, and **no two consoles show the same
card**. Collect all four hands from the SQL editor and confirm 36 distinct
cards.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/kout/index.ts
git commit -m "feat(kout): deal a round server-side, one private hand per seat"
```

---

### Task 10: `bid`, `setHukm`, and `play`

**Files:**
- Modify: `supabase/functions/kout/index.ts`

**Interfaces:**
- Consumes: `legalPlays`, `leadSuitFor`, `trickWinner`, `resolveBidding`,
  `scoreRound`, `checkGameOver`, `nextSeat`, `teamOf`.
- Produces: actions `bid({ gameId, bid })`, `setHukm({ gameId, hukm })`,
  `play({ gameId, card })`.

- [ ] **Step 1: Add the three actions**

Add the cases to the switch, then:

```ts
/* Shared preamble: load the game, find the caller's seat, refuse if it is not
   their turn. Every mutating action starts here — turn order is enforced on
   the server, never trusted from the client. */
async function atTurn(uid: string, gameId: string, wantStatus: string[]) {
  const { data: game } = await admin.from('kout_games').select('*').eq('id', gameId).single();
  if (!game) return { err: fail('no such game', 404) };
  if (!wantStatus.includes(game.status)) return { err: fail(`not in ${wantStatus}`) };
  const { data: seat } = await admin
    .from('kout_seats').select('*')
    .eq('game_id', gameId).eq('user_id', uid).maybeSingle();
  if (!seat) return { err: fail('you hold no seat here', 403) };
  if (game.turn_seat !== seat.seat) return { err: fail('not your turn') };
  return { game, seat };
}

async function bid(uid: string, { gameId, bid: value }: any) {
  const { game, seat, err } = await atTurn(uid, gameId, ['bidding']);
  if (err) return err;

  const isPass = value === PASS;
  if (!isPass && (value < MIN_BID || value > MAX_BID)) return fail('bid must be 5-9 or pass');

  await admin.from('kout_seats')
    .update({ bid: value }).eq('game_id', gameId).eq('seat', seat.seat);

  const dealer = game.dealer_seat;
  const lastSeat = dealer; // bidding opened to the dealer's right, so it closes ON the dealer
  if (seat.seat !== lastSeat) {
    await admin.from('kout_games')
      .update({ turn_seat: nextSeat(seat.seat, game.seat_count) }).eq('id', gameId);
    return json({ ok: true });
  }

  // Everyone has bid. Resolve.
  const { data: seats } = await admin
    .from('kout_seats').select('seat,bid').eq('game_id', gameId).order('seat');
  const bids = seats!.map((s) => s.bid);
  const result = resolveBidding(bids, { seatCount: game.seat_count, lastSeat });

  await admin.from('kout_games').update({
    status: 'hukm',
    bid: result.bid,
    bidder_seat: result.winnerSeat,
    mulzum: result.mulzum,
    turn_seat: result.winnerSeat,
  }).eq('id', gameId);

  return json({ ok: true, ...result });
}

async function setHukm(uid: string, { gameId, hukm }: any) {
  const { game, seat, err } = await atTurn(uid, gameId, ['hukm']);
  if (err) return err;
  if (!['S', 'H', 'D', 'C'].includes(hukm)) return fail('hukm must be S, H, D or C');
  if (game.bidder_seat !== seat.seat) return fail('only the high bidder names hukm');

  await admin.from('kout_games').update({
    status: 'playing', hukm, turn_seat: game.bidder_seat, // the bidder leads
  }).eq('id', gameId);
  return json({ ok: true });
}

async function play(uid: string, { gameId, card }: any) {
  const { game, seat, err } = await atTurn(uid, gameId, ['playing']);
  if (err) return err;

  const { data: hand } = await admin
    .from('kout_hands').select('cards').eq('game_id', gameId).eq('seat', seat.seat).single();
  if (!hand?.cards.includes(card)) return fail('that card is not in your hand');

  const legal = legalPlays(hand.cards, {
    trick: game.trick, seatCount: game.seat_count,
  });
  if (!legal.includes(card)) return fail('illegal play');

  const cards = hand.cards.filter((c: string) => c !== card);
  const trick = [...game.trick, { seat: seat.seat, card }];
  const playedCards = [...game.played_cards, card];

  await admin.from('kout_hands')
    .update({ cards }).eq('game_id', gameId).eq('seat', seat.seat);
  await admin.from('kout_seats')
    .update({ card_count: cards.length }).eq('game_id', gameId).eq('seat', seat.seat);

  // Trick still in progress.
  if (trick.length < game.seat_count) {
    await admin.from('kout_games').update({
      trick, played_cards: playedCards,
      turn_seat: nextSeat(seat.seat, game.seat_count),
      updated_at: new Date().toISOString(),
    }).eq('id', gameId);
    return json({ ok: true });
  }

  // Trick complete.
  const leadSuit = leadSuitFor(trick);
  const winner = trickWinner(trick, {
    hukm: game.hukm, leadSuit, seatCount: game.seat_count,
  });
  const tricksWon = [...game.tricks_won];
  tricksWon[teamOf(winner)] += 1;
  const tricksPlayed = tricksWon[0] + tricksWon[1];

  if (tricksPlayed < HAND_SIZE) {
    await admin.from('kout_games').update({
      trick: [], played_cards: playedCards, tricks_won: tricksWon,
      turn_seat: winner, updated_at: new Date().toISOString(),
    }).eq('id', gameId);
    return json({ ok: true, trickWinner: winner });
  }

  // Round complete.
  const delta = scoreRound({
    bid: game.bid, bidderSeat: game.bidder_seat, mulzum: game.mulzum, tricksWon,
  });
  const score = [game.score[0] + delta[0], game.score[1] + delta[1]];
  const winnerTeam = checkGameOver(score, {
    roundNo: game.round_no, bid: game.bid, tricksWon, bidderSeat: game.bidder_seat,
  });

  await admin.from('kout_games').update({
    status: winnerTeam === null ? 'round_end' : 'finished',
    trick: [], played_cards: playedCards, tricks_won: tricksWon,
    score, winner_team: winnerTeam, turn_seat: null,
    updated_at: new Date().toISOString(),
  }).eq('id', gameId);

  if (winnerTeam !== null) {
    const { data: seats } = await admin
      .from('kout_seats').select('seat,name').eq('game_id', gameId).order('seat');
    await admin.from('kout_results').insert({
      host_id: game.host_id, seat_count: game.seat_count, rounds: game.round_no,
      score, winner_team: winnerTeam,
      players: seats!.map((s) => ({ seat: s.seat, name: s.name, team: teamOf(s.seat) })),
    });
    // Hands are deliberately not kept.
    await admin.from('kout_hands').delete().eq('game_id', gameId);
  }

  return json({ ok: true, trickWinner: winner, roundScore: delta, score, winnerTeam });
}
```

- [ ] **Step 2: Deploy and play one full round by hand**

```bash
npx supabase functions deploy kout
```

With four browser profiles, bid, name hukm, and play out nine tricks. Watch
`kout_games.score` after the ninth.

- [ ] **Step 3: Verify the server refuses an illegal play**

From a player console, deliberately play an off-suit card while holding the
lead suit:

```js
await k.playCard(gameId, '<a card you hold that does not follow suit>');
```

Expected: throws `illegal play`. **The client will grey this card out, but the
server refusing it is what actually matters** — a greyed button is a suggestion.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/kout/index.ts
git commit -m "feat(kout): enforce bidding, hukm and every play on the server"
```

---

## Phase 4 — The client

### Task 11: The shared subscription hook

**Files:**
- Create: `src/lib/useKoutGame.js`

**Interfaces:**
- Produces: `useKoutGame(gameId) → { game, seats, hand, loading, error }`.
  `hand` is `string[]` for a player and `null` for the host — the host's uid
  owns no `kout_hands` row, so RLS returns nothing. That is the design, not a
  bug: the host screen is mirrored to a television.

- [ ] **Step 1: Write the hook**

```js
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/* One subscription set per game, shared by the host table and every player
   phone. All three tables are RLS-filtered, so a phone receives its own hand
   row and nobody else's — the filtering is the database's job, not this
   hook's. See supabase/migrations/0010_kout.sql. */
export function useKoutGame(gameId) {
  const [game, setGame] = useState(null);
  const [seats, setSeats] = useState([]);
  const [hand, setHand] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return undefined;
    let alive = true;

    async function refetch() {
      const [g, s, h] = await Promise.all([
        supabase.from('kout_games').select('*').eq('id', gameId).maybeSingle(),
        supabase.from('kout_seats').select('*').eq('game_id', gameId).order('seat'),
        supabase.from('kout_hands').select('cards,seat').eq('game_id', gameId).maybeSingle(),
      ]);
      if (!alive) return;
      if (g.error) setError(g.error.message);
      setGame(g.data ?? null);
      setSeats(s.data ?? []);
      setHand(h.data?.cards ?? null);
      setLoading(false);
    }

    refetch();

    // Refetch rather than patch from the payload: a round is a handful of
    // events per minute, so the extra query is free, and it removes a whole
    // class of "my local copy drifted" bug.
    const channel = supabase
      .channel(`kout-${gameId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'kout_games', filter: `id=eq.${gameId}` },
          refetch)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'kout_seats', filter: `game_id=eq.${gameId}` },
          refetch)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'kout_hands', filter: `game_id=eq.${gameId}` },
          refetch)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { game, seats, hand, loading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/useKoutGame.js
git commit -m "feat(kout): subscribe host and players to one game's state"
```

---

### Task 12: Card presentation

**Files:**
- Create: `src/lib/koutCards.js`
- Test: `src/lib/koutCards.test.js`

**Interfaces:**
- Produces: `cardFace(card) → { rank, suit, glyph, red, joker }`,
  `SUIT_GLYPH`, `suitLabelAr(suit) → string`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { cardFace, suitLabelAr } from './koutCards.js';

describe('cardFace', () => {
  it('renders ten as 10, not T', () => {
    expect(cardFace('TH')).toMatchObject({ rank: '10', glyph: '♥', red: true });
  });
  it('marks black suits', () => {
    expect(cardFace('AS')).toMatchObject({ rank: 'A', glyph: '♠', red: false });
  });
  it('handles both jokers', () => {
    expect(cardFace('JR')).toMatchObject({ joker: true, red: true });
    expect(cardFace('JB')).toMatchObject({ joker: true, red: false });
  });
});

describe('suitLabelAr', () => {
  it('names the suits in Arabic', () => {
    expect(suitLabelAr('S')).toBe('بستوني');
    expect(suitLabelAr('H')).toBe('كوبة');
    expect(suitLabelAr('D')).toBe('ديناري');
    expect(suitLabelAr('C')).toBe('سباتي');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/koutCards.test.js`
Expected: FAIL — cannot resolve `./koutCards.js`

- [ ] **Step 3: Implement**

```js
/* Presentation only. Kept out of supabase/functions/_shared/koutRules.js so
   the rules module stays free of anything browser-shaped. */
export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_AR = { S: 'بستوني', H: 'كوبة', D: 'ديناري', C: 'سباتي' };

export const suitLabelAr = (suit) => SUIT_AR[suit] ?? '';

export function cardFace(card) {
  if (card === 'JR') return { rank: '★', suit: null, glyph: '★', red: true, joker: true };
  if (card === 'JB') return { rank: '★', suit: null, glyph: '★', red: false, joker: true };
  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1];
  return { rank, suit, glyph: SUIT_GLYPH[suit], red: suit === 'H' || suit === 'D', joker: false };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/koutCards.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/koutCards.js src/lib/koutCards.test.js
git commit -m "feat(kout): map cards to Arabic-labelled faces"
```

---

### Task 13: Host setup and the QR

**Files:**
- Create: `src/screens/Kout/SetupScreen.jsx`, `src/screens/Kout/JoinQr.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `createGame`, `ensureSession` (Task 8), `useKoutGame` (Task 11).
- Produces: route `/kout`. On create, navigates to `/kout/table?g=<gameId>`.

**Requirements (no code given for layout — match the existing pixel-arcade
theme exactly; copy the chrome from `src/screens/SetupScreen`):**

- Step 1: choose **4** or **6** seats. Two large buttons.
- Step 2: two team names (default `فريق ١` / `فريق ٢`) and a colour each, using
  the mutually-exclusive colour picker already built in
  `src/screens/SetupScreen` (see `68bd46f feat(setup): make team colours
  mutually exclusive`). **Reuse it — do not write a second one.**
- Step 3: seat-1 orientation — a ring of `seatCount` positions; the host taps
  which on-screen position is the real seat 1, so the ring matches the room.
  Persist to `localStorage` under a new key added to `src/lib/storageKeys.js`.
- On confirm: `ensureSession()` → `createGame(seatCount, teamNames)` →
  navigate to `/kout/table?g=<gameId>`.
- `JoinQr.jsx` is a full-screen overlay: the join URL as a `<QRCode>` using the
  already-installed `react-qr-code` (see `src/screens/QuestionScreen/index.jsx:344`
  for the existing usage and colours), the join code in large text beneath it,
  and a close button. It is opened from the table's host menu, **never pinned** —
  390px of height cannot spare it.
- The join URL is `${window.location.origin}/kout/seat#${joinCode}`.

- [ ] **Step 1: Build `SetupScreen.jsx` and `JoinQr.jsx` to the requirements above**

- [ ] **Step 2: Add the routes**

In `src/App.jsx`, beside the existing lazy imports:

```js
const KoutSetup = lazy(() => import('./screens/Kout/SetupScreen'));
const KoutTable = lazy(() => import('./screens/Kout/TableScreen'));
const KoutSeat  = lazy(() => import('./screens/Kout/SeatScreen'));
```

and inside `<Routes>`, above the `/dashboard` route:

```jsx
<Route path="/kout" element={<KoutSetup />} />
<Route path="/kout/table" element={<KoutTable />} />
<Route path="/kout/seat" element={<KoutSeat />} />
```

- [ ] **Step 3: Verify at the real size**

```bash
npm run dev
```

Open `/kout` in Chrome devtools at **844 × 390**. Every control must be reachable
without scrolling.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Kout/SetupScreen.jsx src/screens/Kout/JoinQr.jsx src/App.jsx src/lib/storageKeys.js
git commit -m "feat(kout): host setup, seat orientation and the join QR"
```

---

### Task 14: The player's seat screen

**Files:**
- Create: `src/screens/Kout/SeatScreen.jsx`, `src/screens/Kout/HandStrip.jsx`

**Interfaces:**
- Consumes: `ensureSession`, `claimSeat`, `placeBid`, `setHukm`, `playCard`
  (Task 8); `useKoutGame` (Task 11); `cardFace`, `suitLabelAr` (Task 12);
  `legalPlays` — **import the same module the server uses**, from
  `../../../supabase/functions/_shared/koutRules.js`, so the greying-out and the
  server's ruling can never disagree.

**Requirements:**

- Reads the join code from `window.location.hash`.
- On mount: `ensureSession()`, then show the seat picker — a ring of
  `seatCount` positions with taken seats disabled and each seat's team colour
  shown, so a player can choose their partner. Name field, max 20 characters.
- After `claimSeat`, the screen switches on `game.status`:
  - `lobby` — "waiting for the host"
  - `bidding` — if it is your turn, buttons 5–9 (each disabled unless strictly
    higher than the standing bid) plus **طاف**; otherwise show whose turn it is
  - `hukm` — if you are the high bidder, four large suit buttons with Arabic
    labels; otherwise show what was bid
  - `playing` — `HandStrip`: your cards, sorted by suit then rank. Illegal cards
    are greyed and unclickable, computed with the shared `legalPlays`. Tapping a
    legal card calls `playCard`.
  - `round_end` — the round's points and the running score
  - `finished` — the winner
- A rejected call (`illegal play`, `not your turn`) surfaces as a brief inline
  message, never a thrown error into the console. A phone that slept and woke
  re-renders correctly because `useKoutGame` refetches on subscribe.
- Portrait phone layout. This is the one Kout screen that is **not** 844×390.

- [ ] **Step 1: Build both files to the requirements above**

- [ ] **Step 2: Verify greying matches the server**

With a game in `playing`, tap a greyed card (temporarily remove the `disabled`
attribute in devtools). The server must reject it with `illegal play`. Client
and server agreeing is the point of sharing one rules module.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Kout/SeatScreen.jsx src/screens/Kout/HandStrip.jsx
git commit -m "feat(kout): player seat screen with bidding, hukm and legal-only plays"
```

---

### Task 15: The table screen

**Files:**
- Create: `src/screens/Kout/TableScreen.jsx`, `src/screens/Kout/SeatRing.jsx`,
  `src/screens/Kout/TrickArea.jsx`

**Interfaces:**
- Consumes: `useKoutGame` (Task 11), `cardFace` (Task 12), `startRound`
  (Task 8), `JoinQr` (Task 13).

**Requirements — the whole screen must fit 844 × 390:**

- **Top strip:** both team names in their colours, their scores, and the target
  `101`. When a bid is live, a pinned badge showing the bid and hukm suit
  (e.g. `٧ ♠`) with the suit glyph in its own colour.
- **Centre — `TrickArea`:** the cards currently in the trick, positioned toward
  the seat that played each. Flanking it, **two capture piles**, one per team,
  each drawn in that team's colour with the trick count on it — this is how the
  room tells at a glance who is winning the round, mirroring one player per team
  collecting the لمات physically.
- **Ring — `SeatRing`:** `seatCount` seats laid out **counterclockwise**,
  rotated so the position the host chose at setup sits where seat 1 really is.
  Each seat shows: name, team colour, cards remaining, its bid during bidding,
  and a clear highlight on `turn_seat`. **Card backs only — never a face.**
- **Host menu** (a single corner button opening a sheet): show QR, start round,
  pause, end game. Nothing else takes permanent space.
- `status === 'lobby'` shows how many seats are claimed and a **start** button
  disabled until all are.
- `status === 'round_end'` shows the round's points and a **next round** button.
- `status === 'finished'` shows the winning team and a **new game** button.
- Hold a screen wake lock while the game is live so a mirrored phone does not
  sleep mid-hand:

```js
useEffect(() => {
  let lock = null;
  navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
  return () => lock?.release?.();
}, []);
```

- [ ] **Step 1: Build the three files to the requirements above**

- [ ] **Step 2: Grep for the leak**

```bash
grep -rn "hand" src/screens/Kout/TableScreen.jsx src/screens/Kout/SeatRing.jsx src/screens/Kout/TrickArea.jsx
```

Expected: **no hits that render card faces.** The host has no `kout_hands` row,
so `useKoutGame` returns `hand === null` for them — but grep anyway. This screen
is on a television.

- [ ] **Step 3: Verify at the real size**

Chrome devtools at **844 × 390**, six seats, mid-trick. Nothing clipped, nothing
scrolled.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Kout/TableScreen.jsx src/screens/Kout/SeatRing.jsx src/screens/Kout/TrickArea.jsx
git commit -m "feat(kout): the table screen — trick, capture piles and seat ring"
```

---

### Task 16: Three games on the home screen

**Files:**
- Modify: `src/screens/HomeScreen.jsx:88-118`

**Interfaces:**
- Consumes: the `/kout` route from Task 13.

- [ ] **Step 1: Replace the single CTA with three cards**

Replace the single `<Link to="/setup">` block with three cards in a row, each
keeping the existing gold-gradient button treatment, at `maxWidth: 420` each and
wrapping on a narrow viewport:

| Card | Arabic | English strip | Route |
|---|---|---|---|
| 1 | `أم الهيمان` | `TRIVIA` | `/setup` |
| 2 | `كوت` | `KOUT` | `/kout` |
| 3 | `هاند` | `HAND · SOON` | disabled |

Card 3 is rendered disabled (`aria-disabled`, no `to`, muted colours) until
Hand ships. It is on the screen so the shape of the lobby is right from day one.

- [ ] **Step 2: Verify nothing else moved**

```bash
npm run lint && npm test && npm run build
```

Expected: all pass. Then open `/home` at 844×390 and confirm all three cards fit.

- [ ] **Step 3: Commit**

```bash
git add src/screens/HomeScreen.jsx
git commit -m "feat(home): offer trivia, kout and a placeholder for hand"
```

---

## Phase 5 — The gate

### Task 17: The real play-test

No code. This is the acceptance test agreed in design round 5, and it is the
only evidence that counts. A green suite proves the rules module; it proves
nothing about six phones in a room.

- [ ] **Step 1: Play one complete game to 101**

Six real phones, one host phone mirrored to a real TV, real people, in a real
diwaniya. Play until a team reaches 101 without resetting anything.

- [ ] **Step 2: Record what broke**

Write findings into this file under a new `## Play-test 1` heading. Specifically
confirm or correct:

- whether a made bid should score tricks taken or the bid itself
- whether مُلزم failure really floors at 5
- whether the seat ring's direction matched the room
- whether anyone's phone slept and what happened when it woke

- [ ] **Step 3: Fix, then repeat**

Only after a game finishes clean does Hand's plan get written.

---

## Self-review

**Spec coverage.** Every rule in §1 has a task: deck (1), deal (2), trick power
(3), follow-suit and the suitless joker (4), bidding, مُلزم and scoring (5), the 101 /
51-to-0 / first-round-بوان endings (5), server enforcement of all of it (9, 10),
secrecy (7), reconnect (8 `claimSeat` re-join + 11 refetch-on-subscribe), the
844×390 constraint (13, 15), host-not-a-player (7 policy + 15 grep), the three
home cards (16), results persistence (7, 10).

**Known gaps, deliberately deferred.** A mid-game walkout pauses because
`turn_seat` simply stops advancing — there is no explicit pause state or
kick-and-reseat flow; design round 6 agreed "pause and hold the seat", and the
host menu's pause button covers it manually. No bots (agreed, round 4). No
per-trick history (agreed, round 6). Hand is a separate plan.

**One thing to watch.** Task 0 is not optional. Every RLS claim in Phases 2–4
depends on Postgres Changes filtering per subscriber. If the spike fails, stop
and re-plan rather than working around it.
