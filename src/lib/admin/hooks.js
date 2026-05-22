// TanStack Query hooks for the dashboard's CRUD. All requests go through the
// isolated `supabaseAdmin` client (admin JWT) — RLS lets only a registered
// admin mutate. Mutations invalidate both the admin query cache AND the
// game-side query keys, so edits show up in the live game.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '../supabaseAdmin';

// Game-side query keys (see src/lib/queries.js) to refresh after an edit.
export const GAME_KEYS = {
  categories: ['categories'],
  questions: ['question'],
  challengePrompts: ['challenge_prompts'],
  drawingWords: ['drawing_words'],
  appSettings: ['app_settings'],
};

const COUNT_TABLES = [
  'categories',
  'questions',
  'wala_kalma_titles',
  'challenge_prompts',
  'drawing_words',
  'profiles',
  'game_sessions',
  'seen_questions',
];

// Translate a raw Postgres error into a sentence an admin can act on.
export function dbErrorMessage(error) {
  if (!error) return null;
  switch (error.code) {
    case '23505':
      return 'That value must be unique — a row with it already exists (e.g. a duplicate slug).';
    case '23503':
      return 'This row is still referenced by other rows, or points at one that does not exist.';
    case '23514':
      return 'A value is out of the allowed range (check difficulty and other limited fields).';
    case '23502':
      return 'A required field is missing.';
    case '42501':
      return 'Permission denied — your admin session may have expired. Sign in again.';
    default:
      return error.message || 'Something went wrong while saving.';
  }
}

// ── list rows ───────────────────────────────────────────────────────
export function useAdminRows(table, { select = '*', order, filter, enabled = true } = {}) {
  return useQuery({
    queryKey: ['admin', table, { select, order, filter }],
    enabled,
    queryFn: async () => {
      let query = supabaseAdmin.from(table).select(select);
      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? true });
      }
      if (filter && filter.value != null && filter.value !== '') {
        query = query.eq(filter.column, filter.value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── overview counts ─────────────────────────────────────────────────
export function useAdminCounts() {
  return useQuery({
    queryKey: ['admin', 'counts'],
    queryFn: async () => {
      const entries = await Promise.all(
        COUNT_TABLES.map(async (table) => {
          const { count, error } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true });
          if (error) throw error;
          return [table, count ?? 0];
        })
      );
      return Object.fromEntries(entries);
    },
  });
}

// ── category delete blast-radius ────────────────────────────────────
// Deleting a category CASCADE-deletes its questions and orphans its Wala
// Kalma titles — the delete dialog shows these counts before confirming.
export function useCategoryDependencies(category) {
  return useQuery({
    queryKey: ['admin', 'category-deps', category?.id ?? null],
    enabled: !!category,
    queryFn: async () => {
      const [questions, walaTitles] = await Promise.all([
        supabaseAdmin
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id),
        supabaseAdmin
          .from('wala_kalma_titles')
          .select('*', { count: 'exact', head: true })
          .eq('category_slug', category.slug),
      ]);
      if (questions.error) throw questions.error;
      if (walaTitles.error) throw walaTitles.error;
      return {
        questions: questions.count ?? 0,
        walaTitles: walaTitles.count ?? 0,
      };
    },
  });
}

function invalidateAll(queryClient, table, gameKeys) {
  queryClient.invalidateQueries({ queryKey: ['admin', table] });
  queryClient.invalidateQueries({ queryKey: ['admin', 'counts'] });
  queryClient.invalidateQueries({ queryKey: ['admin', 'category-deps'] });
  gameKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
}

// ── save: insert when `id` is null/undefined, otherwise update ──────
export function useAdminSave(table, { invalidate = [] } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }) => {
      const query = id
        ? supabaseAdmin.from(table).update(values).eq('id', id)
        : supabaseAdmin.from(table).insert(values);
      const { data, error } = await query.select();
      if (error) throw error;
      return data?.[0] ?? null;
    },
    onSuccess: () => invalidateAll(queryClient, table, invalidate),
  });
}

// ── delete: `match` is { id } or a composite-key object ─────────────
export function useAdminDelete(table, { invalidate = [] } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ match }) => {
      let query = supabaseAdmin.from(table).delete();
      for (const [column, value] of Object.entries(match)) {
        query = query.eq(column, value);
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient, table, invalidate),
  });
}
