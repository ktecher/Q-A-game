import { useAdminRows, GAME_KEYS } from '../../../lib/admin/hooks';
import { challengePromptSchema } from '../../../lib/admin/schemas';
import CrudPage from '../CrudPage';

const fields = [
  { name: 'prompt_en', label: 'Prompt (English)', type: 'textarea' },
  { name: 'prompt_ar', label: 'Prompt (Arabic)', type: 'textarea', dir: 'rtl' },
  {
    name: 'is_active',
    label: 'Active',
    type: 'checkbox',
    help: 'Included in the game',
  },
  { name: 'display_order', label: 'Display order', type: 'number' },
];

const columns = [
  {
    key: 'prompt_en',
    label: 'Prompt',
    render: (row) => (
      <div>
        <div className="text-slate-800">{row.prompt_en}</div>
        <div className="text-xs text-slate-500" dir="rtl">
          {row.prompt_ar}
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

export default function ChallengePromptsPage() {
  const { data: rows = [], isLoading, error } = useAdminRows(
    'challenge_prompts',
    { order: { column: 'display_order' } }
  );

  return (
    <CrudPage
      title="Challenge Prompts"
      description="Double-or-nothing challenge round prompts."
      singular="prompt"
      table="challenge_prompts"
      rows={rows}
      loading={isLoading}
      error={error}
      columns={columns}
      fields={fields}
      schema={challengePromptSchema}
      searchKeys={['prompt_en', 'prompt_ar']}
      gameInvalidate={[GAME_KEYS.challengePrompts]}
      addLabel="Add prompt"
      newDefaults={{ is_active: true, display_order: 0 }}
      deleteTitle="Delete prompt"
      renderDeleteMessage={() => (
        <p>Delete this challenge prompt? This cannot be undone.</p>
      )}
    />
  );
}
