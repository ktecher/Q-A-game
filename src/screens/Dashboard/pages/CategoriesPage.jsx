import {
  useAdminRows,
  useCategoryDependencies,
  GAME_KEYS,
} from '../../../lib/admin/hooks';
import { categorySchema } from '../../../lib/admin/schemas';
import { ICON_NAMES } from '../../../lib/admin/constants';
import CrudPage from '../CrudPage';

const fields = [
  { name: 'slug', label: 'Slug', type: 'text', help: 'lowercase-with-hyphens, must be unique' },
  { name: 'name_en', label: 'English name', type: 'text' },
  { name: 'name_ar', label: 'Arabic name', type: 'text', dir: 'rtl' },
  {
    name: 'icon_name',
    label: 'Icon',
    type: 'select',
    options: ICON_NAMES.map((n) => ({ value: n, label: n })),
  },
  { name: 'accent_color', label: 'Accent colour', type: 'color' },
  {
    name: 'image_url',
    label: 'Image URL',
    type: 'image',
    help: 'Shown on the board, reveal strip and setup tiles',
  },
  {
    name: 'kind',
    label: 'Type',
    type: 'select',
    options: [
      { value: '', label: 'Normal category' },
      { value: 'wala-kalma', label: 'Wala Kalma (charades)' },
    ],
  },
  {
    name: 'is_featured_for_guests',
    label: 'Featured for guests',
    type: 'checkbox',
    help: 'Highlight to guest players',
  },
  { name: 'display_order', label: 'Display order', type: 'number' },
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
        <div
          className="h-9 w-9 rounded"
          style={{ background: row.accent_color }}
        />
      ),
  },
  {
    key: 'name_en',
    label: 'Name',
    render: (row) => (
      <div>
        <div className="font-medium text-slate-800">{row.name_en}</div>
        <div className="text-xs text-slate-500" dir="rtl">
          {row.name_ar}
        </div>
      </div>
    ),
  },
  {
    key: 'slug',
    label: 'Slug',
    render: (row) => <code className="text-xs text-slate-500">{row.slug}</code>,
  },
  {
    key: 'kind',
    label: 'Type',
    render: (row) => (row.kind === 'wala-kalma' ? 'Wala Kalma' : 'Normal'),
  },
  { key: 'display_order', label: 'Order' },
  {
    key: 'is_featured_for_guests',
    label: 'Featured',
    render: (row) => (row.is_featured_for_guests ? 'Yes' : '—'),
  },
];

function CategoryDeleteMessage({ category }) {
  const { data, isLoading } = useCategoryDependencies(category);
  return (
    <div>
      <p>
        Delete the category <strong>{category.name_en}</strong>?
      </p>
      {isLoading ? (
        <p className="mt-2 text-xs text-slate-400">Checking what depends on it…</p>
      ) : (
        <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
          <li>
            <strong>{data?.questions ?? 0}</strong> question(s) will be
            permanently deleted along with it (database cascade).
          </li>
          <li>
            <strong>{data?.walaTitles ?? 0}</strong> Wala Kalma title(s)
            reference this category by slug and would be orphaned.
          </li>
        </ul>
      )}
      <p className="mt-2 text-xs font-medium text-rose-600">
        This cannot be undone.
      </p>
    </div>
  );
}

export default function CategoriesPage() {
  const { data: rows = [], isLoading, error } = useAdminRows('categories', {
    order: { column: 'display_order' },
  });

  return (
    <CrudPage
      title="Categories"
      description="Game categories — names, images, icons, colours and order."
      singular="category"
      table="categories"
      rows={rows}
      loading={isLoading}
      error={error}
      columns={columns}
      fields={fields}
      schema={categorySchema}
      searchKeys={['name_en', 'name_ar', 'slug']}
      gameInvalidate={[GAME_KEYS.categories, GAME_KEYS.questions]}
      addLabel="Add category"
      newDefaults={{
        icon_name: 'BookOpen',
        accent_color: '#173D6E',
        kind: '',
        is_featured_for_guests: false,
        display_order: 0,
      }}
      deleteTitle="Delete category"
      renderDeleteMessage={(row) => <CategoryDeleteMessage category={row} />}
    />
  );
}
