import { useAdminRows, GAME_KEYS } from '../../../lib/admin/hooks';
import { drawingWordSchema } from '../../../lib/admin/schemas';
import CrudPage from '../CrudPage';

const fields = [
  { name: 'word_en', label: 'Word (English)', type: 'text' },
  { name: 'word_ar', label: 'Word (Arabic)', type: 'text', dir: 'rtl' },
  { name: 'category_en', label: 'Category (English)', type: 'text' },
  { name: 'category_ar', label: 'Category (Arabic)', type: 'text', dir: 'rtl' },
  {
    name: 'is_active',
    label: 'Active',
    type: 'checkbox',
    help: 'Included in the drawing challenge',
  },
  { name: 'display_order', label: 'Display order', type: 'number' },
];

const columns = [
  {
    key: 'word_en',
    label: 'Word',
    render: (row) => (
      <div>
        <div className="text-slate-800">{row.word_en}</div>
        <div className="text-xs text-slate-500" dir="rtl">
          {row.word_ar}
        </div>
      </div>
    ),
  },
  {
    key: 'category_en',
    label: 'Category',
    render: (row) => (
      <div>
        <div className="text-slate-700">{row.category_en}</div>
        <div className="text-xs text-slate-500" dir="rtl">
          {row.category_ar}
        </div>
      </div>
    ),
  },
  {
    key: 'is_active',
    label: 'Active',
    render: (row) => (row.is_active ? 'Yes' : '—'),
  },
  { key: 'display_order', label: 'Order' },
];

export default function DrawingWordsPage() {
  const { data: rows = [], isLoading, error } = useAdminRows('drawing_words', {
    order: { column: 'display_order' },
  });

  return (
    <CrudPage
      title="Drawing Words"
      description="The word pool for the Pictionary drawing challenge."
      singular="word"
      table="drawing_words"
      rows={rows}
      loading={isLoading}
      error={error}
      columns={columns}
      fields={fields}
      schema={drawingWordSchema}
      searchKeys={['word_en', 'word_ar', 'category_en', 'category_ar']}
      gameInvalidate={[GAME_KEYS.drawingWords]}
      addLabel="Add word"
      newDefaults={{ is_active: true, display_order: 0 }}
      deleteTitle="Delete word"
      renderDeleteMessage={() => (
        <p>Delete this drawing word? This cannot be undone.</p>
      )}
    />
  );
}
