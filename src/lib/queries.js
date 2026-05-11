// TanStack Query hooks for Supabase-backed data.
// Categories + questions both have offline fallbacks (the local data files)
// so the app stays usable if Supabase is unreachable.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { CATEGORIES as LOCAL_CATEGORIES } from '../data/categories';
import { getQuestion as getStubQuestion } from '../data/questions';

function mapCategoryRow(row) {
  return {
    slug: row.slug,
    ar: row.name_ar,
    en: row.name_en,
    icon: row.icon_name,
    accent: row.accent_color,
    imageUrl: row.image_url ?? null,
    isFeaturedForGuests: row.is_featured_for_guests,
  };
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
        .select('slug, name_ar, name_en, icon_name, accent_color, image_url, is_featured_for_guests, display_order')
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
      // Group by (slug, difficulty) — first row → slot 0, second row → slot 1
      const grouped = new Map();
      for (const row of data) {
        const slug = row.categories.slug;
        const key = `${slug}|${row.difficulty}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
      }
      // Seed each per-cell cache key so useQuestion finds them synchronously
      for (const [key, rows] of grouped.entries()) {
        const [slug, diffStr] = key.split('|');
        const difficulty = parseInt(diffStr, 10);
        for (let slot = 0; slot < 2; slot++) {
          const row = rows[slot] ?? rows[0];
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
      // Fetch up to 2 questions for this (category, difficulty), then index by slot.
      // Order by id (stable) so slot 0 and slot 1 always map to the same questions.
      const { data, error } = await supabase
        .from('questions')
        .select(
          'id, question_ar, question_en, answer_ar, answer_en, hint_ar, hint_en, image_url, categories!inner(slug)'
        )
        .eq('categories.slug', category.slug)
        .eq('difficulty', value)
        .order('id')
        .limit(2);
      if (error || !data || data.length === 0) return getStubQuestion(category, value, slot);
      // Use slot if a question exists at that index; otherwise wrap to the available one
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
