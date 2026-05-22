// TanStack Query hooks for Supabase-backed data.
// Categories + questions both have offline fallbacks (the local data files)
// so the app stays usable if Supabase is unreachable.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { CATEGORIES as LOCAL_CATEGORIES } from '../data/categories';
import { DRAWING_WORDS } from '../data/drawingWords';
import { pickN } from './random';
import { buildCharadeUrl } from './charadesEncoding';

// Bilingual "Scan the QR code" prompt shown inside the question card for
// Wala Kalma (charades) cells. Localized once here so both the runtime
// fetch and the prefetch path produce identical question shapes.
const WALA_KALMA_PROMPT_AR = 'امسح رمز QR لرؤية الاسم';
const WALA_KALMA_PROMPT_EN = 'Scan the QR code to see the name';

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

// For pools of size ≤ 2 returns the input as-is (no behavior change for
// legacy categories). For larger pools each call returns a fresh random pair.
const pickTwoRandom = (rows) => pickN(rows, 2);

function mapQuestionRow(row) {
  return {
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
 * Call this from BoardScreen with the 6 chosen categories.
 */
export function usePrefetchQuestions(categories) {
  const queryClient = useQueryClient();
  const cats = categories ?? [];
  const normalSlugs = cats.filter((c) => c.kind !== 'wala-kalma').map((c) => c.slug).filter(Boolean);
  const walaKalmaSlugs = cats.filter((c) => c.kind === 'wala-kalma').map((c) => c.slug).filter(Boolean);
  const cacheKey = [...normalSlugs, ...walaKalmaSlugs].slice().sort().join(',');

  useEffect(() => {
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
            const picked = pickTwoRandom(allRows);
            for (let slot = 0; slot < 2; slot++) {
              const row = picked[slot] ?? picked[0];
              if (!row) continue;
              queryClient.setQueryData(
                ['question', slug, difficulty, slot],
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
          .select('category_slug, difficulty, title_ar, title_en')
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
            const picked = pickTwoRandom(allRows);
            for (let slot = 0; slot < 2; slot++) {
              const row = picked[slot] ?? picked[0];
              if (!row) continue;
              queryClient.setQueryData(
                ['question', slug, difficulty, slot],
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
    // Only re-run when the set of slugs changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
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
    staleTime: 60 * 60 * 1000,
    placeholderData: SETTINGS_DEFAULTS,
  });
  return { ...query, data: query.data ?? SETTINGS_DEFAULTS };
}

/**
 * Fetch a question for (category.slug, difficulty, rowIdx).
 * Each board has TWO rows per difficulty (row 0/1 = 200, row 2/3 = 400, row 4/5 = 600).
 * Within a tier, the slot is rowIdx % 2 (0 = first question, 1 = second question).
 * Falls back to a stub variant (numbered by slot) if the cell has no real question seeded.
 */
export function useQuestion(category, value, rowIdx = 0) {
  const slot = (rowIdx ?? 0) % 2;
  const query = useQuery({
    queryKey: ['question', category?.slug, value, slot],
    enabled: !!category?.slug && !!value,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Wala Kalma (charades) categories use a different table; the returned
      // shape carries a `qrUrl` instead of `imageUrl` so QuestionScreen can
      // render a scannable QR. The actor scans → phone shows the title; team
      // guesses; host reveals the title (the "answer") and awards points.
      if (category.kind === 'wala-kalma') {
        const { data, error } = await supabase
          .from('wala_kalma_titles')
          .select('title_ar, title_en')
          .eq('category_slug', category.slug)
          .eq('difficulty', value)
          .eq('is_active', true)
          // `id` tiebreaker keeps the two slot picks distinct + deterministic
          // even when display_order values tie.
          .order('display_order')
          .order('id')
          .limit(2);
        if (error || !data || data.length === 0) return getStubQuestion();
        const row = data[slot] ?? data[0];
        return mapWalaKalmaRow(row, category.slug);
      }
      // Direct-link path (used when prefetch hasn't run, e.g. user lands
      // straight on /play/question). Pulls just the first two by id so slot
      // 0 and slot 1 stay distinct without fetching the whole pool. Random
      // per-game rotation happens in usePrefetchQuestions during /reveal.
      const { data, error } = await supabase
        .from('questions')
        .select(
          'id, question_ar, question_en, answer_ar, answer_en, hint_ar, hint_en, image_url, categories!inner(slug)'
        )
        .eq('categories.slug', category.slug)
        .eq('difficulty', value)
        .order('id')
        .limit(2);
      if (error || !data || data.length === 0) return getStubQuestion();
      const row = data[slot] ?? data[0];
      return mapQuestionRow(row);
    },
  });
  // While the fetch is in flight with no cached data, return null so callers
  // can render a loading state instead of the misleading stub. The stub is
  // still returned from the queryFn on actual error, so genuine failures
  // (network down, RLS denial, …) still degrade gracefully.
  return query;
}
