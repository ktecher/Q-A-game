import { useState } from 'react';
import {
  useAdminRows,
  useAdminDelete,
  dbErrorMessage,
} from '../../../lib/admin/hooks';
import { profileSchema, gameSessionSchema } from '../../../lib/admin/schemas';
import CrudPage from '../CrudPage';
import DataTable from '../ui/DataTable';
import ConfirmDialog from '../ui/ConfirmDialog';

const TABS = [
  { id: 'profiles', label: 'Profiles' },
  { id: 'sessions', label: 'Game Sessions' },
  { id: 'seen', label: 'Seen Questions' },
];

const shortId = (id) => (id ? `${String(id).slice(0, 8)}…` : '—');
const fmtDate = (value) => (value ? new Date(value).toLocaleString() : '—');

// ── Profiles ────────────────────────────────────────────────────────
const profileFields = [
  { name: 'display_name', label: 'Display name', type: 'text' },
  {
    name: 'preferred_language',
    label: 'Preferred language',
    type: 'select',
    options: [
      { value: 'ar', label: 'Arabic' },
      { value: 'en', label: 'English' },
    ],
  },
];

const profileColumns = [
  { key: 'display_name', label: 'Name' },
  { key: 'preferred_language', label: 'Language' },
  {
    key: 'id',
    label: 'User ID',
    render: (row) => <code className="text-xs text-slate-500">{shortId(row.id)}</code>,
  },
  { key: 'created_at', label: 'Created', render: (row) => fmtDate(row.created_at) },
];

function ProfilesTab() {
  const { data: rows = [], isLoading, error } = useAdminRows('profiles', {
    order: { column: 'created_at', ascending: false },
  });
  return (
    <CrudPage
      title="Profiles"
      description="Player accounts that have signed up."
      singular="profile"
      table="profiles"
      rows={rows}
      loading={isLoading}
      error={error}
      columns={profileColumns}
      fields={profileFields}
      schema={profileSchema}
      searchKeys={['display_name']}
      canAdd={false}
      deleteTitle="Delete profile"
      renderDeleteMessage={(row) => (
        <div>
          <p>
            Delete the profile <strong>{row.display_name}</strong>?
          </p>
          <p className="mt-2 text-xs text-amber-600">
            This removes the profile row only — the underlying Supabase login
            account is not deleted.
          </p>
        </div>
      )}
    />
  );
}

// ── Game sessions ───────────────────────────────────────────────────
const sessionFields = [
  { name: 'team1_name', label: 'Team 1 name', type: 'text' },
  { name: 'team1_score', label: 'Team 1 score', type: 'number' },
  { name: 'team2_name', label: 'Team 2 name', type: 'text' },
  { name: 'team2_score', label: 'Team 2 score', type: 'number' },
  {
    name: 'winning_team',
    label: 'Winning team',
    type: 'select',
    options: [
      { value: '', label: '— (tie / none)' },
      { value: 1, label: 'Team 1' },
      { value: 2, label: 'Team 2' },
    ],
  },
];

const sessionColumns = [
  {
    key: 'match',
    label: 'Match',
    render: (row) => `${row.team1_name} vs ${row.team2_name}`,
  },
  {
    key: 'score',
    label: 'Score',
    render: (row) => `${row.team1_score} – ${row.team2_score}`,
  },
  {
    key: 'winning_team',
    label: 'Winner',
    render: (row) => (row.winning_team ? `Team ${row.winning_team}` : 'Tie / —'),
  },
  { key: 'played_at', label: 'Played', render: (row) => fmtDate(row.played_at) },
];

function SessionsTab() {
  const { data: rows = [], isLoading, error } = useAdminRows('game_sessions', {
    order: { column: 'played_at', ascending: false },
  });
  return (
    <CrudPage
      title="Game Sessions"
      description="Completed games and their final scores."
      singular="session"
      table="game_sessions"
      rows={rows}
      loading={isLoading}
      error={error}
      columns={sessionColumns}
      fields={sessionFields}
      schema={gameSessionSchema}
      searchKeys={['team1_name', 'team2_name']}
      canAdd={false}
      deleteTitle="Delete game session"
    />
  );
}

// ── Seen questions (composite key, view + delete only) ──────────────
function SeenQuestionsTab() {
  const { data: rows = [], isLoading, error } = useAdminRows('seen_questions', {
    order: { column: 'seen_at', ascending: false },
  });
  const del = useAdminDelete('seen_questions');
  const [deleting, setDeleting] = useState(null);

  const columns = [
    {
      key: 'user_id',
      label: 'User',
      render: (row) => <code className="text-xs text-slate-500">{shortId(row.user_id)}</code>,
    },
    {
      key: 'question_id',
      label: 'Question',
      render: (row) => (
        <code className="text-xs text-slate-500">{shortId(row.question_id)}</code>
      ),
    },
    { key: 'seen_at', label: 'Seen at', render: (row) => fmtDate(row.seen_at) },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800">Seen Questions</h1>
      <p className="mb-4 mt-0.5 text-sm text-slate-500">
        Per-player question rotation log.
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => `${row.user_id}:${row.question_id}`}
        loading={isLoading}
        error={error ? error.message || String(error) : null}
        onDelete={(row) => {
          del.reset();
          setDeleting(row);
        }}
      />
      {deleting && (
        <ConfirmDialog
          title="Delete seen-question record"
          message={<p>Remove this rotation record? This cannot be undone.</p>}
          busy={del.isPending}
          error={dbErrorMessage(del.error)}
          onConfirm={() =>
            del.mutate(
              {
                match: {
                  user_id: deleting.user_id,
                  question_id: deleting.question_id,
                },
              },
              { onSuccess: () => setDeleting(null) }
            )
          }
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  const [tab, setTab] = useState('profiles');
  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'profiles' && <ProfilesTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'seen' && <SeenQuestionsTab />}
    </div>
  );
}
