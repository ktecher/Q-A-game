// Feature-flag toggles. Each row of app_settings is a boolean flag the game
// reads at game start (see useAppSettings in src/lib/queries.js).
import { useAdminRows, useAdminSave, GAME_KEYS, dbErrorMessage } from '../../../lib/admin/hooks';

function Toggle({ on, disabled, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? 'bg-indigo-600' : 'bg-slate-300'
      } ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { data: rows = [], isLoading, error } = useAdminRows('app_settings', {
    order: { column: 'display_order' },
  });
  const save = useAdminSave('app_settings', { invalidate: [GAME_KEYS.appSettings] });

  const toggle = (row) => {
    save.mutate({
      id: row.id,
      values: { value: !row.value, updated_at: new Date().toISOString() },
    });
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800">Settings</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Feature toggles. A change takes effect on the next game that starts.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Failed to load settings: {error.message}
        </p>
      )}
      {save.error && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {dbErrorMessage(save.error)}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-slate-500">No settings found.</p>
        )}
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div>
              <div className="font-semibold text-slate-800">{row.label}</div>
              {row.description && (
                <div className="mt-0.5 text-sm text-slate-500">{row.description}</div>
              )}
            </div>
            <Toggle
              on={row.value}
              disabled={save.isPending && save.variables?.id === row.id}
              onClick={() => toggle(row)}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Disabling a challenge type removes it from the random pool of challenge
        cells. With both off, games run with no challenge rounds at all.
      </div>
    </div>
  );
}
