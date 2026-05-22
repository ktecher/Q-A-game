// Confirmation modal for destructive actions. `message` may be any node, so
// callers can show a dependency-aware blast-radius warning.
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  error = null,
  onConfirm,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={22} />
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800">{title}</h3>
              <div className="mt-1 text-sm text-slate-600">{message}</div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
