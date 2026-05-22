// Generic admin table: optional client-side search, per-row edit/delete.
import { useMemo, useState } from 'react';
import { Search, Pencil, Trash2 } from 'lucide-react';

export default function DataTable({
  columns,
  rows,
  getRowId = (row) => row.id,
  onEdit,
  onDelete,
  searchKeys = [],
  loading = false,
  error = null,
  emptyText = 'Nothing here yet.',
}) {
  const [query, setQuery] = useState('');
  const hasActions = Boolean(onEdit || onDelete);
  const colSpan = columns.length + (hasActions ? 1 : 0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || searchKeys.length === 0) return rows;
    return rows.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? '').toLowerCase().includes(needle)
      )
    );
  }, [rows, query, searchKeys]);

  return (
    <div>
      {searchKeys.length > 0 && (
        <div className="relative mb-3 max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {columns.map((col) => (
                <th key={col.key} className={`px-3 py-2.5 font-semibold ${col.thClassName ?? ''}`}>
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-rose-600">
                  Failed to load: {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filtered.map((row) => (
                <tr
                  key={getRowId(row)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-2.5 align-top ${col.tdClassName ?? ''}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="mr-1 inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && !error && (
        <p className="mt-2 text-xs text-slate-400">
          {filtered.length === rows.length
            ? `${rows.length} row${rows.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${rows.length} rows`}
        </p>
      )}
    </div>
  );
}
