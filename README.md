# مدينة أم الهيمان · Umm Al Hayman City

A free, bilingual (Arabic + English) Jeopardy-style trivia web game for family majlis nights and diwaniya gatherings. Inspired by the Kuwaiti app *Seen Jeem* — built to fix the things its users complain about (pay-per-game pricing, repeated questions, no customization).

> **Status:** v0.1 MVP — full game loop wired end-to-end with mock auth + mock question pool. Real Supabase backend pending key rotation.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle in dist/
npm run preview      # preview the production bundle
npm run lint
```

For a real auth + question backend, copy `.env.example` to `.env.local` and fill in your Supabase project credentials. Without them, the app runs in **mock mode** — auth is bypassed via a "Skip · Mock sign-in" button (visible only in `import.meta.env.DEV`), and questions come from a hardcoded pool in `src/data/questions.js`.

## Game flow

```
Landing → SignIn / SignUp / Continue as Guest
        ↓
Setup ─ pick 6 categories (or Quick / Surprise Me)
      ─ pick difficulty, name teams (color + emoji + roster), set timer
        ↓
Reveal ─ slot-machine animation showing the 6 chosen categories
        ↓
Board ─ 6×6 grid (200/200/400/400/600/600 point tiers)
        ↓
Question ─ Stage 1: active team answers (full timer)
         ─ Stage 1: opposing team answers (half timer)
         ─ Stage 2: host reveals correct answer + awards points to ONE team
        ↓ (×36 cells)
Results ─ winner card with fireworks + falling confetti + stats
```

**Game rules:**
- 2 teams, strict turn alternation (active team flips every cell regardless of who scored)
- Both teams answer every question (active team gets full timer, opposing team gets half)
- Host awards points to one team (or "No Award") after the answer is revealed
- Each team has 3 lifelines: Extra Time (+30s), Hint, Steal (currently disabled — under review for the new dual-answer flow)
- Game ends when all 36 cells are played; highest score wins

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind 3 + RTL plugin + Framer Motion 11 |
| Routing | React Router 6 |
| State | useReducer + Context (`GameContext`, `AuthContext`) + TanStack Query (server state) |
| Backend | Supabase (Auth + Postgres + RLS) — pending wiring |
| Validation | Zod (form schemas) |
| Hosting | Vercel (planned) |

## Project structure

```
src/
├── App.jsx                    # Router + AuthProvider + GameProvider
├── main.jsx
├── index.css                  # Tailwind directives + brand base
├── lib/
│   ├── supabase.js            # client + isSupabaseConfigured flag
│   └── deviceId.js            # stable per-browser ID for guest mode
├── contexts/
│   ├── AuthContext.jsx        # session + guest profile + signOut
│   └── GameContext.jsx        # game-state reducer + provider + selectors
├── hooks/                     # (reserved — useGameState selectors live in GameContext)
├── components/
│   ├── BrandHeader.jsx
│   └── PlaceholderScreen.jsx  # used for unbuilt routes
├── data/
│   ├── categories.js          # 30 bilingual categories + ICON_MAP + pickRandomSix
│   └── questions.js           # mock pool (5 hand-written, others stubbed)
└── screens/
    ├── LandingScreen.jsx
    ├── auth/SignInScreen.jsx
    ├── auth/SignUpScreen.jsx
    ├── SetupScreen.jsx        # the most complex screen (pre-game flow)
    ├── RevealScreen.jsx       # slot-machine animation
    ├── BoardScreen.jsx        # 6×6 grid
    ├── QuestionScreen.jsx     # dual-stage flow
    └── ResultsScreen.jsx      # winner + fireworks
```

## Design system — "Majlis-Luxe"

| Token | Value |
|---|---|
| Ink (background) | `#0A0F1A` (navy-tinted black) |
| Sapphire | deep `#0E2949`, mid `#173D6E`, light `#3A7BC8` |
| Gold | dark `#A87C2E`, mid `#D4A24C`, light `#E8B968` |
| Crimson | dark `#9B2D3A`, mid `#C44150` |
| Cream | `#F4ECD8` |
| Fonts | Amiri (AR body), Tajawal (AR UI), Cormorant Garamond (EN display), Manrope (EN body) |

All custom CSS lives in `src/index.css`; all tokens in `tailwind.config.js`. Subtle Islamic geometric SVG pattern repeats over the page background at 5% opacity.

## RTL conventions

- `<html dir="rtl" lang="ar">` is the default. English text within is wrapped in `<span lang="en">` which `index.css` flips to LTR via `direction: ltr; unicode-bidi: isolate;`
- Use **logical properties** in Tailwind: `ms-` / `me-` / `ps-` / `pe-` / `start-` / `end-`. Never use directional classes (`ml-`, `pr-`, `left-`, `right-`).
- Email/password inputs are `dir="ltr"` so placeholders and entered text read correctly.

## Mock mode (no Supabase)

When `VITE_SUPABASE_URL` is missing AND `import.meta.env.DEV` is true:
- A "Skip · Mock sign-in" / "Skip · Mock sign-up" button appears below the regular submit on the auth screens
- Clicking it stores a guest profile in localStorage and routes to `/setup`
- The Save Score button on Results is disabled (with tooltip)
- A console warning fires once on app load

The mock-mode bypass is gated on `import.meta.env.DEV` — it cannot ship to a production build by accident.

## What's left

The full build spec lives at [`../SEEN_JEEM_BUILD_SPEC.md`](../SEEN_JEEM_BUILD_SPEC.md).

See the plan file at `~/.claude/plans/ok-check-the-md-linked-dawn.md` for the full roadmap. Highlights:

**Pending — Phase 3 (blocked on rotated Supabase keys):**
- Wire real Supabase Auth (signIn / signUp / password reset)
- Apply schema migration `0001_initial.sql` to the project
- Seed `categories` table from `src/data/categories.js`
- Replace `src/data/questions.js` with a Supabase-backed query

**Deferred to v1.1+:**
- Daily Double cells, Final Round, Category Preview (5s static)
- Pick-3-of-7 lifeline menu (50/50, Skip, Double or Nothing, Audience)
- User-created custom packs + share links
- AI-generated custom games (Anthropic API via Edge Function)
- Spectator Mode + QR code
- Achievements + badges
- TTS via Web Speech API
- "Super Round" pop-up mini-game (rapid-fire enumeration head-to-head between one player from each team)

## Known issues / open items

1. **Supabase keys exposed in chat earlier — must be rotated** before any real auth wiring (Dashboard → Settings → API).
2. The `--emerald-*` CSS variable names in `tailwind.config.js` are misleading legacy labels — they actually hold sapphire-blue values. Rename in a future cleanup.
3. Bundle is 736 kB / 214 kB gzipped. Code-splitting (lazy routes) would knock 40–50 kB off the initial chunk.
4. Trademark check on the working name "Umm Al Hayman City" is pending.

## License

TBD.
