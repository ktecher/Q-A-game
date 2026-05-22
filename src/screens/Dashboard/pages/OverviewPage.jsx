import { useAdminCounts } from '../../../lib/admin/hooks';

const CARDS = [
  { key: 'categories', label: 'Categories' },
  { key: 'questions', label: 'Questions' },
  { key: 'wala_kalma_titles', label: 'Wala Kalma Titles' },
  { key: 'challenge_prompts', label: 'Challenge Prompts' },
  { key: 'drawing_words', label: 'Drawing Words' },
  { key: 'profiles', label: 'Profiles' },
  { key: 'game_sessions', label: 'Game Sessions' },
  { key: 'seen_questions', label: 'Seen Questions' },
];

export default function OverviewPage() {
  const { data, isLoading, error } = useAdminCounts();

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800">Overview</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Everything in the game database at a glance.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Failed to load counts: {error.message}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="text-2xl font-bold text-slate-800">
              {isLoading ? '…' : data?.[card.key] ?? 0}
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Use the sidebar to manage content. Every change saves straight to the
        live database, and the game picks it up on its next load.
      </div>
    </div>
  );
}
