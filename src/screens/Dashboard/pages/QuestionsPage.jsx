import { useState } from 'react';
import { useAdminRows, GAME_KEYS } from '../../../lib/admin/hooks';
import { questionSchema } from '../../../lib/admin/schemas';
import { DIFFICULTIES } from '../../../lib/admin/constants';
import CrudPage from '../CrudPage';

const truncate = (text, max = 70) => {
  const value = text ?? '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

export default function QuestionsPage() {
  const {
    data: cats = [],
    isLoading: catsLoading,
  } = useAdminRows('categories', { order: { column: 'display_order' } });

  // Questions only render in the game for NORMAL categories — the wala-kalma
  // categories read from a different table, so a question attached to one
  // would be dead data. Exclude them from the picker and the form.
  const normalCats = cats.filter((c) => c.kind !== 'wala-kalma');

  const [categoryId, setCategoryId] = useState('');
  const effectiveCat = categoryId || normalCats[0]?.id || '';

  const { data: rows = [], isLoading, error } = useAdminRows('questions', {
    order: { column: 'difficulty' },
    filter: { column: 'category_id', value: effectiveCat },
    enabled: Boolean(effectiveCat),
  });

  const fields = [
    {
      name: 'category_id',
      label: 'Category',
      type: 'select',
      options: normalCats.map((c) => ({ value: c.id, label: c.name_en })),
    },
    {
      name: 'difficulty',
      label: 'Difficulty (points)',
      type: 'select',
      options: DIFFICULTIES.map((d) => ({ value: d, label: String(d) })),
    },
    { name: 'question_en', label: 'Question (English)', type: 'textarea' },
    { name: 'question_ar', label: 'Question (Arabic)', type: 'textarea', dir: 'rtl' },
    { name: 'answer_en', label: 'Answer (English)', type: 'text' },
    { name: 'answer_ar', label: 'Answer (Arabic)', type: 'text', dir: 'rtl' },
    { name: 'hint_en', label: 'Hint (English, optional)', type: 'text' },
    { name: 'hint_ar', label: 'Hint (Arabic, optional)', type: 'text', dir: 'rtl' },
    { name: 'image_url', label: 'Image URL (optional)', type: 'image' },
  ];

  const columns = [
    {
      key: 'image_url',
      label: '',
      thClassName: 'w-12',
      render: (row) =>
        row.image_url ? (
          <img
            src={row.image_url}
            alt=""
            className="h-9 w-9 rounded object-cover"
          />
        ) : (
          <div className="h-9 w-9 rounded bg-slate-100" />
        ),
    },
    { key: 'difficulty', label: 'Pts', thClassName: 'w-14' },
    {
      key: 'question_en',
      label: 'Question',
      render: (row) => (
        <div>
          <div className="text-slate-800">{truncate(row.question_en)}</div>
          <div className="text-xs text-slate-500" dir="rtl">
            {truncate(row.question_ar)}
          </div>
        </div>
      ),
    },
    {
      key: 'answer_en',
      label: 'Answer',
      render: (row) => (
        <div>
          <div className="text-slate-700">{row.answer_en}</div>
          <div className="text-xs text-slate-500" dir="rtl">
            {row.answer_ar}
          </div>
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Category:</label>
      <select
        value={effectiveCat}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {normalCats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_en}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <CrudPage
      title="Questions"
      description="Bilingual questions, grouped by category."
      singular="question"
      table="questions"
      rows={rows}
      loading={catsLoading || (isLoading && Boolean(effectiveCat))}
      error={error}
      columns={columns}
      fields={fields}
      schema={questionSchema}
      searchKeys={['question_en', 'question_ar', 'answer_en', 'answer_ar']}
      gameInvalidate={[GAME_KEYS.questions]}
      canAdd={Boolean(effectiveCat)}
      addLabel="Add question"
      newDefaults={{
        category_id: effectiveCat,
        difficulty: 200,
        question_en: '',
        question_ar: '',
        answer_en: '',
        answer_ar: '',
      }}
      deleteTitle="Delete question"
      renderDeleteMessage={(row) => (
        <p>
          Delete this question — <strong>{truncate(row.question_en, 80)}</strong>?
          This cannot be undone.
        </p>
      )}
      toolbar={toolbar}
    />
  );
}
