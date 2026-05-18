// TanStack Query hooks for Supabase-backed data.
// Categories + questions both have offline fallbacks (the local data files)
// so the app stays usable if Supabase is unreachable.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { CATEGORIES as LOCAL_CATEGORIES, getCategoryBySlug } from '../data/categories';
import { getQuestion as getStubQuestion } from '../data/questions';

// Presentation fields (imageUrl, accent, icon) ALWAYS come from data/categories.js — the
// single source of truth for category visuals. Supabase owns names + catalog metadata only.
// Edit src/data/categories.js to change a category image; Setup, Reveal, and Board all update.
function mapCategoryRow(row) {
  const presentation = getCategoryBySlug(row.slug) ?? {};
  return {
    slug: row.slug,
    ar: row.name_ar ?? presentation.ar,
    en: row.name_en ?? presentation.en,
    icon: presentation.icon,
    accent: presentation.accent,
    imageUrl: presentation.imageUrl ?? null,
    isFeaturedForGuests: row.is_featured_for_guests,
  };
}

// Fisher–Yates shuffle, then return the first two elements. For pools of
// size ≤ 2 this returns the input as-is (no behavior change for legacy
// categories). For larger pools each call returns a fresh random pair.
function pickTwoRandom(rows) {
  if (!rows || rows.length <= 2) return rows ?? [];
  const arr = [...rows];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 2);
}

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
        .select('slug, name_ar, name_en, is_featured_for_guests, display_order')
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
  const slugs = (categories ?? []).map((c) => c.slug).filter(Boolean);
  const cacheKey = slugs.slice().sort().join(',');

  useEffect(() => {
    if (slugs.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(
          'id, difficulty, question_ar, question_en, answer_ar, answer_en, hint_ar, hint_en, image_url, categories!inner(slug)'
        )
        .in('categories.slug', slugs)
        .order('id');
      if (cancelled || error || !data) return;
      // Group by (slug, difficulty), then randomly pick 2 per cell. For
      // categories with exactly 2 questions per tier, both are kept and the
      // shuffle is a no-op (same behavior as before). For pools larger than 2
      // (e.g. guess-the-movie has ~10 per tier), each game gets a fresh pair.
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
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the set of slugs changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
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
      // Fetch ALL questions for (category, difficulty). For pools >2 this
      // fallback path (used when prefetch hasn't run, e.g. direct-link to
      // /play) picks the first two by id deterministically so slot 0 and
      // slot 1 stay distinct on this code path. The real per-game random
      // pick happens in usePrefetchQuestions when the game starts normally.
      const { data, error } = await supabase
        .from('questions')
        .select(
          'id, question_ar, question_en, answer_ar, answer_en, hint_ar, hint_en, image_url, categories!inner(slug)'
        )
        .eq('categories.slug', category.slug)
        .eq('difficulty', value)
        .order('id');
      if (error || !data || data.length === 0) return getStubQuestion(category, value, slot);
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
