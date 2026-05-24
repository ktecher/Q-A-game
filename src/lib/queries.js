// TanStack Query hooks for Supabase-backed data.
// Categories + questions both have offline fallbacks (the local data files)
// so the app stays usable if Supabase is unreachable.

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORIES as LOCAL_CATEGORIES } from '../data/categories';
import { DRAWING_WORDS } from '../data/drawingWords';
import { seededPickN, seedFrom } from './random';
import { buildCharadeUrl } from './charadesEncoding';

// Default returned by useSeenIds for guests / not-yet-loaded states.
// Frozen so accidental mutation in a consumer can't poison the shared default.
const EMPTY_SEEN_IDS = Object.freeze({ questions: {}, titles: {} });

/**
 * Filter a tier pool by the user's seen-set for that category. Each tier
 * needs TWO distinct picks (the two cells per difficulty row), so a filtered
 * pool of fewer than 2 rows triggers the reset — otherwise both slots would
 * collapse to the same question via `picked[1] ?? picked[0]` and the user
 * would see the same question twice in one row of the board.
 */
function applyTierFilter(allRows, seenSet) {
  if (!seenSet || seenSet.size === 0) return { pool: allRows, exhausted: false };
  const filtered = allRows.filter((r) => !seenSet.has(r.id));
  if (filtered.length < 2 && allRows.length > 0) {
    return { pool: allRows, exhausted: true };
  }
  return { pool: filtered, exhausted: false };
}

/**
 * Fire a per-category reset RPC, but only once per (kind, slug) per call site
 * for the lifetime of `firedRef`. The DB delete is idempotent, but skipping
 * duplicate calls keeps the network quiet when an effect re-runs.
 */
function fireExhaustionReset(kind, slug, firedRef) {
  const key = `${kind}|${slug}`;
  if (firedRef.current.has(key)) return;
  firedRef.current.add(key);
  const fn = kind === 'wala-kalma'
    ? 'reset_seen_wala_kalma_for_category'
    : 'reset_seen_for_category';
  // Fire-and-forget — the player is mid-game, we don't block on this.
  // Errors are silently swallowed; if the reset fails the next game will
  // detect exhaustion again and retry.
  supabase.rpc(fn, { p_slug: slug }).then(() => {}, () => {});
}

/**
 * Fetch the logged-in user's full "seen" history once per game and return it
 * grouped by category slug. The query key includes `gameSeed`, so a new game
 * always re-fetches fresh from the database — within one game the cached
 * snapshot stays stable, which is what keeps the seeded picks at
 * usePrefetchQuestions and useQuestion (the direct-link path) identical.
 *
 * For guests / unauthenticated callers, returns EMPTY_SEEN_IDS so the filter
 * is a no-op and the current behavior is preserved exactly.
 */
export function useSeenIds(userId, gameSeed) {
  const query = useQuery({
    queryKey: ['seen_ids', userId, gameSeed],
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [questionsRes, titlesRes] = await Promise.all([
        supabase
          .from('seen_questions')
          .select('question_id, questions!inner(categories!inner(slug))')
          .eq('user_id', userId),
        supabase
          .from('seen_wala_kalma_titles')
          .select('title_id, wala_kalma_titles!inner(category_slug)')
          .eq('user_id', userId),
      ]);
      const questions = {};
      for (const r of questionsRes.data ?? []) {
        const slug = r.questions?.categories?.slug;
        if (!slug) continue;
        (questions[slug] ??= new Set()).add(r.question_id);
      }
      const titles = {};
      for (const r of titlesRes.data ?? []) {
        const slug = r.wala_kalma_titles?.category_slug;
        if (!slug) continue;
        (titles[slug] ??= new Set()).add(r.title_id);
      }
      return { questions, titles };
    },
  });
  return {
    data: query.data ?? EMPTY_SEEN_IDS,
    // Guests skip the fetch entirely → always ready.
    // Authenticated users are ready once the query has settled at least once.
    isReady: !userId ? true : query.isFetched,
  };
}

// Bilingual "Scan the QR code" prompt shown inside the question card for
// Wala Kalma (charades) cells. Localized once here so both the runtime
// fetch and the prefetch path produce identical question shapes.
const WALA_KALMA_PROMPT_AR = 'امسح رمز QR لرؤية الاسم';
const WALA_KALMA_PROMPT_EN = 'Scan the QR code to see the name';

// Per-tier fetch cap for the direct-link path. Comfortably above the content's
// ~18 questions per tier, so the direct path shuffles the same full pool the
// prefetch does — keeping the two seeded picks identical.
const MAX_TIER_QUESTIONS = 200;

// Transform a wala_kalma_titles row into the same "question" shape that
// QuestionScreen already renders. The actor sees a QR (built from the title
// via charadesEncoding); the host sees the same QR plus a Reveal-Answer
// button that flips to the title text. Same flow as a normal question.
function mapWalaKalmaRow(row, categorySlug) {
  const lang = categorySlug === 'wala-kalma-english' ? 'en' : 'ar';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = buildCharadeUrl({
    origin,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    lang,
  });
  return {
    // `id` + `kind` are carried on the cached question so the AWARD side
    // effect in GameProvider knows which table to upsert the seen row into.
    id: row.id,
    kind: 'wala-kalma',
    ar: WALA_KALMA_PROMPT_AR,
    en: WALA_KALMA_PROMPT_EN,
    answerAr: row.title_ar,
    answerEn: row.title_en,
    hintAr: null,
    hintEn: null,
    imageUrl: null,
    qrUrl,
  };
}

// Minimal placeholder returned only when Supabase errors AND the question cache
// has no entry to fall back on (a rare double-failure path). The wording is
// neutral and honest so users never see fake-but-plausible trivia.
function getStubQuestion() {
  return {
    ar: 'تعذّر تحميل السؤال — حاول مرة أخرى',
    en: 'Could not load this question — please try again',
    answerAr: '—',
    answerEn: '—',
    hintAr: null,
    hintEn: null,
    imageUrl: null,
  };
}

// The database is the single source of truth for category presentation —
// name, image, icon, accent, and kind all come straight from the row. The
// /dashboard admin area edits these columns; data/categories.js is only an
// offline fallback (placeholderData + the on-error path below).
function mapCategoryRow(row) {
  return {
    slug: row.slug,
    ar: row.name_ar,
    en: row.name_en,
    icon: row.icon_name ?? 'BookOpen',
    accent: row.accent_color ?? '#173D6E',
    imageUrl: row.image_url ?? null,
    kind: row.kind ?? null,
    isFeaturedForGuests: row.is_featured_for_guests,
  };
}

function mapQuestionRow(row) {
  return {
    // See mapWalaKalmaRow — same purpose. `kind: null` distinguishes regular
    // questions from charade titles at the AWARD-side upsert site.
    id: row.id,
    kind: null,
    ar: row.question_ar,
    en: row.question_en,
    answerAr: row.answer_ar,
    answerEn: row.answer_en,
    hintAr: row.hint_ar,
    hintEn: row.hint_en,
    imageUrl: row.image_url ?? null,
  };
}

/**
 * Fetch all categories from Supabase, ordered by display_order.
 * Falls back to LOCAL_CATEGORIES while loading and on error.
 */
export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('slug, name_ar, name_en, kind, icon_name, accent_color, image_url, is_featured_for_guests, display_order')
        .order('display_order');
      if (error) throw error;
      return data.map(mapCategoryRow);
    },
    staleTime: 60 * 60 * 1000, // 1 hour — categories rarely change
    placeholderData: LOCAL_CATEGORIES,
  });
  return {
    ...query,
    // Always-defined data — falls back to local if everything fails
    data: query.data ?? LOCAL_CATEGORIES,
  };
}

/**
 * Bulk-prefetch ALL questions for the chosen categories on game start.
 * One Supabase round-trip seeds the per-cell TanStack cache keys, so when
 * the user picks a cell, useQuestion finds the data instantly — no
 * stub-then-real flash on /play/question.
 *
 * The per-cell pick is seeded by `gameSeed` (a per-game constant), so this
 * runs identically on every RevealScreen / BoardScreen remount — the cell a
 * question lands in never shifts mid-game, which is what caused duplicates.
 *
 * Call this from BoardScreen / RevealScreen with the chosen categories.
 */
export function usePrefetchQuestions(categories, gameSeed) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: seenIds, isReady: seenReady } = useSeenIds(userId, gameSeed);
  const cats = categories ?? [];
  const normalSlugs = cats.filter((c) => c.kind !== 'wala-kalma').map((c) => c.slug).filter(Boolean);
  const walaKalmaSlugs = cats.filter((c) => c.kind === 'wala-kalma').map((c) => c.slug).filter(Boolean);
  const slugsKey = [...normalSlugs, ...walaKalmaSlugs].slice().sort().join(',');
  const cacheKey = `${gameSeed}|${slugsKey}|${userId ?? 'guest'}`;
  // Dedupes exhaustion-reset RPCs per (kind, slug) across re-runs of this
  // effect within one BoardScreen lifetime — keyed on userId+gameSeed so a
  // brand-new game (new gameSeed) starts the dedupe set fresh.
  const firedResetRef = useRef(new Set());

  useEffect(() => {
    // Wait until the seen-ids snapshot is available so the seeded pick uses
    // the same filtered pool that useQuestion's direct-link path will use.
    // Without this, an authenticated user racing through to /play/question
    // could land on a question that doesn't match what BoardScreen prefetched.
    if (!seenReady) return;
    if (normalSlugs.length === 0 && walaKalmaSlugs.length === 0) return;
    let cancelled = false;
    (async () => {
      // Normal Q&A categories — fetch from `questions` table.
      if (normalSlugs.length > 0) {
        const { data, error } = await supabase
          .from('questions')
          .select(
            'id, difficulty, question_ar, question_en, answer_ar, answer_en, hint_ar, hint_en, image_url, categories!inner(slug)'
          )
          .in('categories.slug', normalSlugs)
          .order('id');
        if (cancelled) return;
        if (!error && data) {
          const grouped = new Map();
          for (const row of data) {
            const slug = row.categories.slug;
            const key = `${slug}|${row.difficulty}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(row);
          }
          for (const [key, allRows] of grouped.entries()) {
            const [slug, diffStr] = key.split('|');
            const difficulty = parseInt(diffStr, 10);
            const { pool, exhausted } = applyTierFilter(allRows, seenIds.questions[slug]);
            if (exhausted) fireExhaustionReset('normal', slug, firedResetRef);
            const picked = seededPickN(pool, 2, seedFrom(gameSeed, slug, difficulty));
            for (let slot = 0; slot < 2; slot++) {
              const row = picked[slot] ?? picked[0];
              if (!row) continue;
              queryClient.setQueryData(
                // userId in the key keeps two users on the same device from
                // sharing a cached question pick that was filtered against the
                // wrong seen-set.
                ['question', slug, difficulty, slot, gameSeed, userId ?? 'guest'],
                mapQuestionRow(row)
              );
            }
          }
        }
      }

      // Wala Kalma (charades) categories — fetch from `wala_kalma_titles` and
      // seed the SAME cache keys with a question-shaped row that carries a
      // qrUrl instead of imageUrl. QuestionScreen renders the QR when present.
      if (walaKalmaSlugs.length > 0) {
        const { data, error } = await supabase
          .from('wala_kalma_titles')
          // `id` is needed downstream so the AWARD side-effect can write the
          // upsert into seen_wala_kalma_titles. Was previously not selected.
          .select('id, category_slug, difficulty, title_ar, title_en')
          .in('category_slug', walaKalmaSlugs)
          .eq('is_active', true)
          // `id` is a stable tiebreaker — display_order ties (the admin
          // dashboard defaults new titles to 0) would otherwise be ordered
          // arbitrarily by Postgres and could collide the two slot picks.
          .order('display_order')
          .order('id');
        if (cancelled) return;
        if (!error && data) {
          const grouped = new Map();
          for (const row of data) {
            const key = `${row.category_slug}|${row.difficulty}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(row);
          }
          for (const [key, allRows] of grouped.entries()) {
            const [slug, diffStr] = key.split('|');
            const difficulty = parseInt(diffStr, 10);
            const { pool, exhausted } = applyTierFilter(allRows, seenIds.titles[slug]);
            if (exhausted) fireExhaustionReset('wala-kalma', slug, firedResetRef);
            const picked = seededPickN(pool, 2, seedFrom(gameSeed, slug, difficulty));
            for (let slot = 0; slot < 2; slot++) {
              const row = picked[slot] ?? picked[0];
              if (!row) continue;
              queryClient.setQueryData(
                ['question', slug, difficulty, slot, gameSeed, userId ?? 'guest'],
                mapWalaKalmaRow(row, slug)
              );
            }
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // `seenIds` is referentially stable for a (userId, gameSeed) pair because
    // useSeenIds uses staleTime: Infinity, so including it adds at most one
    // extra run when the first fetch resolves — and guarantees the prefetch
    // never reads a stale snapshot if the seen-set cache is ever mutated.
    // `normalSlugs` / `walaKalmaSlugs` / `userId` are intentionally not listed
    // — they're fresh arrays/literals on every render but their content is
    // already encoded into `cacheKey`, so including them would force the
    // effect to run on every parent re-render with no semantic change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, seenReady, seenIds, gameSeed, queryClient]);
}

/**
 * Fetch all active challenge prompts from Supabase, ordered by display_order.
 * Returns [] on error so callers can detect and fall back gracefully.
 */
export function useChallengePrompts() {
  const query = useQuery({
    queryKey: ['challenge_prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_prompts')
        .select('prompt_ar, prompt_en')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data.map((row) => ({ ar: row.prompt_ar, en: row.prompt_en }));
    },
    staleTime: 60 * 60 * 1000, // 1 hour — prompts rarely change
  });
  return {
    ...query,
    data: query.data ?? [],
  };
}

// Transform a drawing_words row into the {ar,en,catAr,catEn} shape the game
// already uses (matches the local src/data/drawingWords.js entries).
function mapDrawingWordRow(row) {
  return {
    ar: row.word_ar,
    en: row.word_en,
    catAr: row.category_ar,
    catEn: row.category_en,
  };
}

/**
 * Fetch the active drawing words (Pictionary challenge word pool), ordered by
 * display_order. The /dashboard "Drawing Words" page edits these; the local
 * DRAWING_WORDS file is the offline fallback.
 */
export function useDrawingWords() {
  const query = useQuery({
    queryKey: ['drawing_words'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drawing_words')
        .select('word_ar, word_en, category_ar, category_en')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data.map(mapDrawingWordRow);
    },
    staleTime: 60 * 60 * 1000, // 1 hour — words rarely change
    placeholderData: DRAWING_WORDS,
  });
  return { ...query, data: query.data ?? DRAWING_WORDS };
}

// Defaults when app_settings is unreachable — fail OPEN (both challenge types
// on) so a Supabase hiccup never silently strips the game's challenge rounds.
// Frozen so the shared fallback object can never be mutated by a consumer.
const SETTINGS_DEFAULTS = Object.freeze({
  naming_challenge_enabled: true,
  sketch_challenge_enabled: true,
});

/**
 * Fetch the admin feature flags from app_settings as a { key: boolean } map.
 * The /dashboard "Settings" page toggles these. Always-defined data.
 */
export function useAppSettings() {
  const query = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value');
      if (error) throw error;
      const map = { ...SETTINGS_DEFAULTS };
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
    // Feature flags gate challenge rounds, so a player's Setup screen must
    // re-read them on every mount — that way an admin's dashboard toggle
    // reaches every device by the next game instead of sitting behind a long
    // cache. `placeholderData` keeps the prior value showing during the
    // refetch, so there is no flash.
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: SETTINGS_DEFAULTS,
  });
  return { ...query, data: query.data ?? SETTINGS_DEFAULTS };
}

/**
 * Fetch a question for (category.slug, difficulty, rowIdx).
 * Each board has TWO rows per difficulty (row 0/1 = 200, row 2/3 = 400, row 4/5 = 600).
 * Within a tier, the slot is rowIdx % 2 (0 = first question, 1 = second question).
 *
 * The two questions for a tier are a seeded random pick from its pool — the
 * same selection usePrefetchQuestions makes (identical pool order + identical
 * `seedFrom(gameSeed, slug, value)` seed), so the prefetched cache hits and a
 * direct-link cache miss both resolve to the exact same question. That keeps
 * every cell distinct and prevents a question from reappearing in another cell.
 */
export function useQuestion(category, value, rowIdx = 0, gameSeed) {
  const slot = (rowIdx ?? 0) % 2;
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: seenIds, isReady: seenReady } = useSeenIds(userId, gameSeed);
  // Same dedupe contract as usePrefetchQuestions — one reset per (kind, slug)
  // for this QuestionScreen's lifetime.
  const firedResetRef = useRef(new Set());
  const query = useQuery({
    // userId is in the key so two users on the same device can't share a
    // cached question pick that was filtered against the wrong seen-set;
    // matches the key written by usePrefetchQuestions above.
    queryKey: ['question', category?.slug, value, slot, gameSeed, userId ?? 'guest'],
    // Gate on seenReady so the queryFn (only fires on cache miss / direct-link)
    // sees the same seenIds the prefetch used. Without this, a quick direct
    // load could cache an unfiltered pick and de-sync from the board.
    enabled: !!category?.slug && !!value && seenReady,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Wala Kalma (charades) categories use a different table; the returned
      // shape carries a `qrUrl` instead of `imageUrl` so QuestionScreen can
      // render a scannable QR. The actor scans → phone shows the title; team
      // guesses; host reveals the title (the "answer") and awards points.
      if (category.kind === 'wala-kalma') {
        const { data, error } = await supabase
          .from('wala_kalma_titles')
          // `id` is required so the seen-set filter can match by row id and
          // so the AWARD side-effect knows which title to upsert as seen.
          .select('id, title_ar, title_en')
          .eq('category_slug', category.slug)
          .eq('difficulty', value)
          .eq('is_active', true)
          // Stable order so the seeded pick matches usePrefetchQuestions.
          .order('display_order')
          .order('id')
          .limit(MAX_TIER_QUESTIONS);
        if (error || !data || data.length === 0) return getStubQuestion();
        const { pool, exhausted } = applyTierFilter(data, seenIds.titles[category.slug]);
        if (exhausted) fireExhaustionReset('wala-kalma', category.slug, firedResetRef);
        const picked = seededPickN(pool, 2, seedFrom(gameSeed, category.slug, value));
        const row = picked[slot] ?? picked[0];
        return mapWalaKalmaRow(row, category.slug);
      }
      // Direct-link path (used when prefetch hasn't run, e.g. user lands
      // straight on /play/question). Fetches the whole tier in a stable `id`
      // order, then applies the SAME seeded pick usePrefetchQuestions uses, so
      // the cell gets the identical question either way.
      const { data, error } = await supabase
        .from('questions')
        .select(
          'id, question_ar, question_en, answer_ar, answer_en, hint_ar, hint_en, image_url, categories!inner(slug)'
        )
        .eq('categories.slug', category.slug)
        .eq('difficulty', value)
        .order('id')
        .limit(MAX_TIER_QUESTIONS);
      if (error || !data || data.length === 0) return getStubQuestion();
      const { pool, exhausted } = applyTierFilter(data, seenIds.questions[category.slug]);
      if (exhausted) fireExhaustionReset('normal', category.slug, firedResetRef);
      const picked = seededPickN(pool, 2, seedFrom(gameSeed, category.slug, value));
      const row = picked[slot] ?? picked[0];
      return mapQuestionRow(row);
    },
  });
  // Returns the raw query: `query.data` is `undefined` while the fetch is in
  // flight (callers render a loading state) and the stub object on a genuine
  // error, so network / RLS failures still degrade gracefully.
  return query;
}
