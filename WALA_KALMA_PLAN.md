# Wala Kalma (ولا كلمة) — Charades Mode Implementation Plan

**Status:** ✅ All 5 phases shipped. See "Status by phase" below for details.
**Authors:** Synthesized from 3 parallel agents (architect, designer, document-specialist) — points of agreement and disagreement noted where they exist.
**Brand:** Wala Kalma · ولا كلمة (literally "Not a Word") — fitting for a charades game where the actor can only mime.

---

## 1. Product summary

Add a new "Wala Kalma" gameplay mode to the existing trivia app. When the active player picks a Wala Kalma cell, the main screen displays a QR code; the player scans it with their phone, the title to act out appears on the phone, and they perform it for their team.

**Three new categories**, each appearing as a regular cell on the 6×6 board (in this order on the Setup screen):
- `wala-kalma-english` — Hollywood films & English-language TV series
- `wala-kalma-arabic` — Pan-Arab movies/TV (Egyptian, Lebanese, Syrian, etc.)
- `wala-kalma-gulf` — Gulf-specific content (Kuwaiti / Saudi / Emirati)

---

## 2. End-to-end user experience

### Main screen (the TV / laptop everyone sees)

Five-phase modal, mirroring the existing `ChallengeRound/` rhythm:

| Phase | What's shown | Who acts |
|---|---|---|
| `intro` | Category, team name, point value, brief rule. "Start" / "Decline" CTAs. | Host clicks |
| `qr-display` | Large QR (220×220 px min) + "Scan to Reveal" chip + "Only the actor sees the title on their phone". Host has an optional `Eye/EyeOff` toggle to peek at a *blurred* title for verification. **Timer does NOT auto-start.** | Actor scans, then says "ready", host hits "Start Timer" |
| `acting-own-team` | 60-second timer. Gold → crimson at ≤ 10 s. Title NOT shown on main screen. Host buttons: "✓ Team Guessed" / "✗ Time's Up". | Actor acts for their own team |
| `steal-attempt` (only if Time's Up on own team) | New 30-second timer. Other team gets a one-shot guess. Host buttons: "✓ Other Team Guessed" / "✗ No Guess". | Actor keeps acting; other team yells guesses |
| `award` | Existing `<AwardButtons variant="full">`. Host picks who earns the points (could be own team if they guessed, other team if they stole, or no award). | Host clicks |

**Re-roll mechanic** (host-controlled, no penalty): a `…` menu in QR phase offers "Reroll" — fetches a new title. No point cost. Used for "I don't know this one" cases.

**Visual signature:** A new teal-sapphire accent (`#1A7A6E`) distinguishes Charades from the gold-dominant Challenge Round, while staying in the existing palette family.

### Phone screen (the actor's phone)

The phone loads a tiny static HTML page (NOT the React SPA — see §4.4) that:

1. **Anti-spoiler gate** — full-screen dark overlay reading "Tap to Reveal" in large Arabic + English. The title is in the DOM but `opacity: 0` + `user-select: none` behind it. One tap removes the overlay with a 150 ms fade. Protects against teammate-glance-over-shoulder.
2. **Title displayed** — large bold Arabic (48–56 px, RTL), English subtitle smaller (22 px) if bilingual. Origin badge (e.g. "مصري · Egyptian") in teal.
3. **Single "Done" button** at the bottom. No "Skip" / "Next" — host is source of truth for re-rolls.
4. After 90 s of inactivity, screen dims to 20% (battery / burn-in).
5. Page must work after first load — uses **system fonts** for Arabic (Apple's Arabic UI Display / Android's Noto Sans Arabic) so nothing extra needs downloading.

### Wireframes (ASCII, agent-supplied)

**Main at QR-display peak:**

```
┌─────────────────────────────────────────────┐
│  ✦              شاراد · Charades        [👁] │
│  ── عربي · Arabic Movies & TV ──            │
│                                             │
│        ┌──────────────────────┐             │
│        │  امسح للكشف           │             │
│        │  [QR CODE 220×220]   │             │
│        └──────────────────────┘             │
│   يرى اللاعب الاسم على هاتفه فقط           │
│                                             │
│        [ ابدأ العد · Start Timer ]          │
│                                             │
│   🔴 فريق١  ·  vs  ·  🔵 فريق٢              │
│         stakes: 400 pts                     │
└─────────────────────────────────────────────┘
```

**Phone at reveal moment:**

```
┌──────────────┐
│  ● عربي      │   teal badge, small
│              │
│  باب الحارة  │   52px, font-ar-body bold, cream
│  Bab al-Hara │   20px, italic, cream-60
│              │
│   سوري       │   origin sub-badge
│              │
│  [ تم · Done ]│   full-width, min-h-56px
└──────────────┘
```

---

## 3. Architecture decisions

### 3.1 Board placement
**3 charades categories sit on the board with a `kind='charades'` discriminator on the `categories` table.** When a cell from one of those categories is picked, `BoardScreen.handlePick` routes to the Charades modal instead of `/play/question`. This mirrors the existing `challengeCells` divert in `BoardScreen/index.jsx:48`.

*Rejected alternative:* a separate "Charades Night" game mode — doubles the setup/reveal/board codepaths for no benefit.

### 3.2 Data model
**New `charades_titles` table** in Supabase:

```sql
create table public.charades_titles (
  id            uuid primary key default gen_random_uuid(),
  category_slug text not null,
  title_ar      text not null,
  title_en      text not null,
  origin        text,         -- 'egyptian' | 'lebanese' | 'syrian' | 'gulf' | 'english' | null
  kind          text,         -- 'movie' | 'tv'
  year          int,
  difficulty    int check (difficulty in (200, 400, 600)),
  is_active     boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index charades_titles_active_idx
  on public.charades_titles (category_slug, difficulty, is_active);

alter table public.charades_titles enable row level security;
create policy "Charades titles public read"
  on public.charades_titles for select
  to anon, authenticated using (true);
grant select on public.charades_titles to anon, authenticated;
```

*Rejected alternatives:*
- Extending `questions` with a `type` column — pollutes the question schema (charades has no `answer_*`, `hint_*`, etc.).
- Three separate tables per category — violates the `challenge_prompts` SSOT pattern.

### 3.3 QR encoding — **stateless URL fragment**

Encode the title client-side as a base64url-encoded JSON payload inside the URL **fragment** (`#`, not `?`):

```
https://app.example.com/c#d=eyJ0X2FyIjoi2KjYp9ioINin2YTYrdin2LHYqSIsInRfZW4iOiJCYWIgYWwtSGFyYSIsImxhbmciOiJhciIsIm9yaWdpbiI6InN5cmlhbiJ9
```

**Why fragment, not query string:**
- Fragments are never sent to the server in HTTP requests — title never appears in Vercel logs / analytics.
- No DB roundtrip from the phone.
- Works offline (after first page load).
- No tokens to expire, no `round_tokens` table to maintain.

**Payload shape:** `{ t_ar, t_en, lang, origin }` — ~80–150 bytes JSON, encodes to ~110–200 base64url chars. Stays under the ~300-char "all-scanner-friendly" QR ceiling.

*Rejected alternatives:*
- Slug + DB lookup (document-specialist's recommendation) — adds a `round_tokens` table and breaks offline play; the "prettier short URL" argument doesn't matter for QR scanning.
- Single-use enforcement — all 3 agents agree it's overkill for a casual living-room game.

### 3.4 Phone page — **static HTML, not the SPA**

A standalone file at `public/c.html`. Vite serves `public/` at the root, so the URL is `app.example.com/c.html` (or, with a `vercel.json` rewrite, just `app.example.com/c`).

**Why not reuse the SPA route:**
- The SPA bundle is 775 KB. Downloading that over cellular just to render a single title is wasteful (~3 seconds on 3G).
- The phone page has zero React requirements — title display, RTL handling, one button.

**Contents (~5 KB minified):**
- Inline `<style>` with system Arabic font stack + dark palette
- Inline `<script>` that reads `location.hash`, decodes base64url, injects title
- Anti-spoiler overlay HTML
- One "Done" button

*Rejected alternative:* Vercel edge function (document-specialist) — only gains a slug-based URL; loses offline-after-first-load.

### 3.5 Game-reducer fit

**New `currentWalaKalma` slot, parallel to `currentChallenge`.** Don't piggyback. Reasons:
- `currentChallenge`'s actions are coupled to the doubled-value semantic and the random `challengeCells` Set.
- Wala Kalma cells are deterministic and use single `cellValue` scoring.
- Phase machine: `intro` → `qr-display` → `acting-own-team` → (optional) `steal-attempt` → `award`.

New reducer actions:
- `START_WALA_KALMA` — opens the modal with a randomly chosen title
- `WALA_KALMA_REROLL` — swaps in a fresh title (no penalty)
- `WALA_KALMA_END_OWN_TURN` — own team failed; opens steal phase
- `AWARD_WALA_KALMA` — host awards points (matches existing AWARD action shape with `teamId | null`)
- `CANCEL_WALA_KALMA` — host backs out

### 3.6 Scoring
**Single cellValue, no multiplier.** Mirrors the regular question flow:
1. Chooser's team acts for 60 s. If teammates guess → host awards them `cellValue`.
2. If 60 s elapses without a guess, **other team gets a 30 s steal attempt**. Actor keeps performing; other team yells guesses. If they guess → host awards them `cellValue`.
3. If neither team guesses → "No Award" — cell is played, no points.

Re-roll is free and resets the timer for the chooser's team.

---

## 4. File-by-file implementation map

### New files

| Path | Purpose |
|---|---|
| `supabase/migrations/0003_charades_titles.sql` | Table + RLS + index + grant |
| `content/charades-titles.csv` | Canonical seed source (180–240 rows total) |
| `scripts/seed-charades-titles.js` | Idempotent CSV → DB seeder (mirrors `seed-challenge-prompts.js`) |
| `public/c.html` | Standalone phone page (~5 KB, inline CSS+JS) |
| `src/lib/charadesEncoding.js` | `encodeCharade({t_ar, t_en, ...})` / `decodeCharade(hashFragment)` |
| `src/components/CharadesRound/index.jsx` | Orchestrator (5-phase state machine, mirrors `ChallengeRound/index.jsx`) |
| `src/components/CharadesRound/IntroDialog.jsx` | Category + value + rules |
| `src/components/CharadesRound/QrPhase.jsx` | QR display + Eye-toggle + Start-Timer button |
| `src/components/CharadesRound/ActingPhase.jsx` | Countdown + ✓ / ✗ buttons |
| `src/components/CharadesRound/AwardPhase.jsx` | Uses existing `<AwardButtons>` |

### Modified files

| Path | Change |
|---|---|
| `src/data/categories.js` | Add 3 entries with `kind: 'charades'` + `accent: '#1A7A6E'` |
| `src/lib/gameReducer.js` | Add `currentCharade` slot + 4 actions |
| `src/contexts/GameContext.jsx` | Expose `startCharade`, `awardCharade`, `cancelCharade`, `rerollCharade` |
| `src/screens/BoardScreen/index.jsx` | In `handlePick`, divert to `startCharade()` when `cat.kind === 'charades'`. Mount `<CharadesRound />` if `currentCharade`. |
| `src/lib/queries.js` | Add `useCharadesTitles({categorySlug, difficulty})` hook returning a `pickRandom()` function |
| `scripts/seed.js` | Add 3 new category rows to the upsert |
| `content/README.md` | Document `charades-titles.csv` |
| `vercel.json` | Add rewrite: `/c → /c.html` (optional for prettier URLs) |
| `package.json` | Add `react-qr-code` dependency (~4 KB gz) |

---

## 5. Content authoring guide

### How many titles?

**60–80 titles per category, 180–240 total to start.** With 3 charades categories on the board and 6 cells each = 18 cells per game maximum; 60 titles gives ~10 games of repetition-free play.

### What makes a good charade title

- **Iconic** — 80% of the room should recognize it instantly. Difficulty is in the acting, not the recall.
- **Has physical / visual hooks** — action scenes, distinctive characters, memorable setting.
- **Avoid** — abstract concept titles, one-word titles that can't be mimed (e.g. "الوجود"), 6+ word titles.
- **Sweet spot** — 2–4 words, at least one concrete noun or action verb.

### Difficulty tiers map to title depth

| Tier | Arabic example | English example |
|---|---|---|
| 200 (easy) | باب الحارة | Titanic |
| 400 (medium) | نسر الصعيد | Game of Thrones |
| 600 (hard) | درب الزلق | Twin Peaks |

### Mix policy

- **Movies + TV mixed within each category** — splitting reduces depth without benefit. The "TV box" hand gesture covers it.
- **Arabic category is pan-Arab** — Egyptian / Lebanese / Syrian mixed. Acting cue makes regional origin irrelevant for gameplay.
- **Gulf category is Gulf-exclusive** — Kuwaiti, Saudi, Emirati. Carries content the Arabic category leaves out.

### CSV shape

```
category_slug,difficulty,title_ar,title_en,origin,kind,year,display_order
wala-kalma-arabic,200,باب الحارة,Bab al-Hara,syrian,tv,2006,1
wala-kalma-gulf,400,درب الزلق,Darb al-Zalaq,kuwaiti,tv,1977,1
wala-kalma-english,200,Titanic,Titanic,english,movie,1997,1
…
```

---

## Status by phase

| Phase | Status | Highlights |
|---|---|---|
| 1. Data spine | ✅ DONE | `wala_kalma_titles` table + 90 seeded rows + 3 categories upserted + CSV + idempotent seed script |
| 2. Phone page | ✅ DONE | `public/c.html` standalone (~7KB), `src/lib/charadesEncoding.js`, longest URL = 189 chars |
| 3. Game wiring | ✅ DONE | `currentWalaKalma` slot, 4 actions, `useWalaKalmaTitles()` hook, BoardScreen divert when `cat.kind === 'wala-kalma'` |
| 4. Modal UI | ✅ DONE | `WalaKalmaRound/` orchestrator + IntroDialog + QrPhase (Eye toggle, Reroll) + ActingPhase (60s own → 30s steal) |
| 5. Polish + verify | ✅ DONE | Lint 0, build 0, verifier agent green, plan doc updated |

## 6. Implementation phases (original sequencing for reference)

### Phase 1 — Data spine (~45 min)
1. Write `0003_charades_titles.sql` migration
2. Apply via Supabase MCP `apply_migration`
3. Author initial CSV (start with ~30 titles per category, scale later)
4. Write `scripts/seed-charades-titles.js` (template from `seed-challenge-prompts.js`)
5. Run seed; verify rows via REST
6. Add 3 new entries to `data/categories.js` + run `seed.js` to push category metadata

**Verifies:** DB ↔ CSV ↔ seed script pipeline works end-to-end. Independently of any UI.

### Phase 2 — Phone page (~30 min)
1. Build `public/c.html` standalone
2. Build `src/lib/charadesEncoding.js` (encode/decode round-trip)
3. Manually hand-craft a test URL (no host UI yet); load on phone; verify Arabic renders + anti-spoiler gate works
4. Add `vercel.json` rewrite if prettier URL desired

**Verifies:** the lowest-risk leaf of the whole feature. If this works, the rest is just plumbing.

### Phase 3 — Reducer + game wiring (~45 min)
1. Add `currentCharade` slot + 4 actions to `gameReducer.js`
2. Expose helpers in `GameContext.jsx`
3. Add `useCharadesTitles(categorySlug, difficulty)` hook in `queries.js`
4. Wire `BoardScreen.handlePick` divert branch + mount `<CharadesRound />` when slot is set

### Phase 4 — Modal UI (~90 min)
1. Build `CharadesRound/index.jsx` orchestrator
2. Build each phase component (IntroDialog, QrPhase, ActingPhase, AwardPhase)
3. Install `react-qr-code` and lazy-load it in `QrPhase`
4. Hook up Eye-toggle, Start-Timer manual control, re-roll menu

### Phase 5 — Polish + verify (~30 min)
1. Test full flow with real phone in browser
2. Slow-3G throttle test for anti-spoiler gate (designer's flagged risk)
3. Lint + build
4. Spawn verifier agent for integrity check
5. Update `content/README.md`

**Total estimated effort: ~4 hours of focused work, broken into 5 verifiable phases.**

---

## 7. Tooling

| Concern | Choice | Reason |
|---|---|---|
| QR generation | `react-qr-code` (~4 KB gz) | Tiny, SVG-only, no deps, actively maintained. Industry default `qrcode.react` (~35 KB) only worth it if logo-overlay branding is later wanted. |
| URL encoding | Base64URL in URL fragment | URL-safe without percent-encoding; fragment never hits server logs; stateless; works offline |
| Phone page | Static HTML in `public/c.html` | Avoids 775 KB SPA bundle download over cellular |
| Arabic font | System font stack (Arabic UI Display on iOS, Noto Sans Arabic on Android) | Zero font download; covers all 2018+ devices |
| QR scanning on player phones | **Native camera apps** (iOS 11+, Android 9+) | No app install needed; tappable banner appears on URL detection |
| Reducer + state | Existing `useReducer` pattern | Mirrors `ChallengeRound` — no new abstractions |
| Routing for phone page | `vercel.json` rewrite `/c → /c.html` | One line of config |

---

## 7.5 Phone-scan caveat (development)

The QR encodes `window.location.origin + '/c.html#d=...'`. On `npm run dev`, that origin is `http://localhost:5173` — which your phone can't reach. To actually scan-test from a phone:

| Option | How |
|---|---|
| Vercel preview deploy (simplest) | `git push`; QR encodes the real domain |
| Bind Vite to LAN | Edit `vite.config.js`: change `host: 'localhost'` → `host: true`, then access via your laptop's LAN IP from the phone |
| Tunnel | `cloudflared tunnel --url http://localhost:5173` |

Production deployments work out of the box because the origin is the live domain.

## 8. Edge cases & open questions

### Handled in design

| Edge case | Solution |
|---|---|
| Player can't scan QR (bad lighting, scratched lens) | "Can't scan?" link below QR shows the title on the host screen, fullscreen-blurred, for private hand-off |
| Player accidentally closes phone tab | URL is idempotent — re-scan or re-enter URL re-shows same title with anti-spoiler gate restored |
| Player wants a re-roll | Host-controlled, -50 point penalty shown on shared screen |
| Two players scan same QR | Both see same title — non-event |
| Old Android phone, no native QR | Google Lens (pre-installed) handles it. No app install needed. |
| No cellular data | Stateless URL works after first page load; system fonts ship in OS |
| RTL on iOS Safari vs Android Chrome | `dir="rtl"` is well-supported. Use `text-align: start` not `right`. Line-height 1.8 minimum for Arabic diacritics. |
| Family-room trust model | Single-use enforcement skipped intentionally. Host controls the QR display window. |
| Cellular vs same-wifi | Stateless encoding means it doesn't matter |

### Open questions for you

1. **Re-roll penalty:** -50 points feels right for our 200/400/600 scoring; should it be -100 for 600-tier cells?
2. **Default acting timer:** Designer suggests 60 seconds; do you want it shorter (45 s) or longer (90 s)?
3. **Origin sub-badge on phone:** Designer suggests showing "Egyptian" / "Syrian" etc. — could be a spoiler hint for the team if shouted out. Worth keeping?
4. **Initial CSV authoring:** Do you want me to seed an initial 30-per-category list from popular titles, or will you author the CSV yourself for cultural curation?
5. **Cover images for the 3 new categories:** Need 3 imageUrls (like Cinema's projector image). I can pick from Wikipedia or you can upload to Cloudinary.

---

## 9. Test plan

### Phase 1 (data spine)
- `list_tables` shows `charades_titles` with expected row count
- REST query returns real bilingual content

### Phase 2 (phone page)
- Hand-craft URL with known payload → load on phone → title appears
- Test anti-spoiler gate under slow-3G throttle (Chrome DevTools)
- Test RTL on iPhone Safari AND Android Chrome
- Test offline (Airplane mode after first load)

### Phase 3-4 (full flow)
- Pick a Charades cell → modal opens → click Start → QR appears
- Scan QR with phone → title visible after tap
- Click "Start Timer" → countdown runs → click ✓ → award → score updates
- Click re-roll → -50 penalty applied → new QR shown
- Verify console has zero red errors throughout

### Phase 5 (regression)
- `npm run lint` exits 0
- `npm run build` exits 0
- Existing categories still play normally (Q&A flow unchanged)
- Existing Challenge Round still triggers from surprise cells
- Bundle size delta < 10 KB (react-qr-code is lazy-loaded)

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Anti-spoiler gate fails on slow connections** (designer flagged this as the riskiest UX decision) | Test under slow-3G throttle before shipping. The gate's CSS should pre-render so even pre-JS, the title is invisible. |
| **QR doesn't scan from across a room** | 220×220 px minimum size + high-contrast (white-on-dark inverted to dark-on-white for the QR itself). Test from 2 meters in normal living-room lighting. |
| **Arabic font fallback ugly on older Android** | System fallback to Droid Arabic Naskh works but is less polished. Acceptable degradation. |
| **Cellular bundle weight** | Phone page is static `c.html` (~5 KB) — sidesteps the SPA bundle entirely. |
| **Content curation takes longer than expected** | Phase 1 ships with ~30 titles per category; scale to 60–80 as content matures. |

---

## 11. Decision log (where the 3 agents disagreed)

| Topic | Architect | Designer | Document-specialist | Synthesis choice |
|---|---|---|---|---|
| Phone routing | Static `c.html` | (deferred) | Vercel edge function | Static `c.html` — preserves offline play |
| QR encoding | Fragment | (agrees with stateless) | Slug + DB lookup | URL fragment — offline + private |
| Single-use enforcement | Skip (overkill) | Skip (family trust) | Skip (not needed at scale) | Skip — all 3 agreed |
| QR library | `qrcode` or `qr-creator` | (no opinion) | `react-qr-code` | `react-qr-code` (lightest + React-native) |
| Re-roll | (didn't address) | -50 penalty, host-only | (didn't address) | Designer's call |
| Host answer-key | (didn't address) | Eye toggle, blurred-by-default | (didn't address) | Designer's call |

---

## 11.5 Proposed initial title list — drafted, AWAITING USER REVIEW

90 titles total (30 per category × 3 categories), distributed 10/10/10 across difficulty tiers. ⚠️ Arabic + Gulf lists have moderate-to-low cultural confidence — please curate before seeding. The English list is high confidence. Full table shown to user in chat for this revision; once approved will be saved to `content/wala-kalma-titles.csv`.

### Open content questions
1. **Origin sub-badge on phone** — should the player's phone show a small "Egyptian / Syrian / Lebanese" badge under the Arabic title? Pro: tells actor which dialect/setting to mime. Con: minor spoiler if a teammate glimpses past the anti-spoiler gate. *Recommendation: skip — keep the phone minimal.*
2. **Mix of decades** — should Arabic / Gulf titles skew modern (post-2000) for younger players, or include classics for the older crowd? Drafted list is balanced.

---

## 12. What this plan does NOT cover

- **Cross-game prompt deduplication** (don't show the same title twice in one evening) — could add a `seen_charades` table later, mirrors existing `seen_questions`
- **Multi-actor mode** (whole team acts vs one actor) — out of scope for v1
- **Difficulty tuning data** (track which titles get guessed quickly) — analytics work, post-launch
- **Reverse charades** (one player guesses while team acts) — future variant
- **Drawing mode** (Pictionary-style with the same QR mechanism) — future game type, but the infra here would support it

---

**Ready for review.** Once you sign off (or change anything in §8 "open questions"), I can start Phase 1.
