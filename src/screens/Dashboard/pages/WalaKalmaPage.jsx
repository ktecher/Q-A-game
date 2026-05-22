import { useState } from 'react';
import { useAdminRows, GAME_KEYS } from '../../../lib/admin/hooks';
import { walaKalmaSchema } from '../../../lib/admin/schemas';
import { DIFFICULTIES, WALA_KALMA_SLUGS } from '../../../lib/admin/constants';
import CrudPage from '../CrudPage';

const SLUG_LABELS = {
  'wala-kalma-english': 'Wala Kalma · English',
  'wala-kalma-arabic': 'Wala Kalma · Arabic',
  'wala-kalma-gulf': 'Wala Kalma · Gulf',
};

export default function WalaKalmaPage() {
  const [slug, setSlug] = useState(WALA_KALMA_SLUGS[0]);

  const { data: rows = [], isLoading, error } = useAdminRows(
    'wala_kalma_titles',
    {
      order: { column: 'display_order' },
      filter: { column: 'category_slug', value: slug },
    }
  );

  const fields = [
    {
      name: 'category_slug',
      label: 'Category',
      type: 'select',
      options: WALA_KALMA_SLUGS.map((s) => ({ value: s, label: SLUG_LABELS[s] })),
    },
    {
      name: 'difficulty',
      label: 'Difficulty (points)',
      type: 'select',
      options: DIFFICULTIES.map((d) => ({ value: d, label: String(d) })),
    },
    { name: 'title_en', label: 'Title (English)', type: 'text' },
    { name: 'title_ar', label: 'Title (Arabic)', type: 'text', dir: 'rtl' },
    { name: 'origin', label: 'Origin (optional)', type: 'text' },
    { name: 'kind', label: 'Kind (optional)', type: 'text', help: 'e.g. movie, tv' },
    { name: 'year', label: 'Year (optional)', type: 'number' },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      help: 'Included in the game',
    },
    { name: 'display_order', label: 'Display order', type: 'number' },
  ];

  const columns = [
    { key: 'difficulty', label: 'Pts', thClassName: 'w-14' },
    {
      key: 'title_en',
      label: 'Title',
      render: (row) => (
        <div>
          <div className="text-slate-800">{row.title_en}</div>
          <div className="text-xs text-slate-500" dir="rtl">
            {row.title_ar}
          </div>
        </div>
      ),
    },
    { key: 'kind', label: 'Kind' },
    { key: 'year', label: 'Year' },
    {
      key: 'is_active',
      label: 'Active',
      render: (row) => (row.is_active ? 'Yes' : '—'),
    },
    { key: 'display_order', label: 'Order' },
  ];

  const toolbar = (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Category:</label>
      <select
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {WALA_KALMA_SLUGS.map((s) => (
          <option key={s} value={s}>
            {SLUG_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <CrudPage
      title="Wala Kalma Titles"
      description="Charades titles for the ولا كلمة categories."
      singular="title"
      table="wala_kalma_titles"
      rows={rows}
      loading={isLoading}
      error={error}
      columns={columns}
      fields={fields}
      schema={walaKalmaSchema}
      searchKeys={['title_en', 'title_ar']}
      gameInvalidate={[GAME_KEYS.questions]}
      addLabel="Add title"
      newDefaults={{
        category_slug: slug,
        difficulty: 200,
        is_active: true,
        display_order: 0,
      }}
      deleteTitle="Delete title"
      renderDeleteMessage={(row) => (
        <p>
          Delete <strong>{row.title_en}</strong>? This cannot be undone.
        </p>
      )}
      toolbar={toolbar}
    />
  );
}
