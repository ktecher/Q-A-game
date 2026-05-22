// Generic add/edit modal. Driven by a `fields` config and a Zod `schema`:
// every value is validated client-side before `onSubmit` receives the parsed
// data, so the admin sees field-level errors instead of raw Postgres errors.
import { useState } from 'react';
import { X } from 'lucide-react';
import { fieldErrors } from '../../../lib/admin/schemas';

function Field({ field, value, error, onChange }) {
  const { label, type = 'text', options = [], dir, help, placeholder } = field;
  const base =
    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ' +
    (error
      ? 'border-rose-400 focus:ring-rose-400'
      : 'border-slate-300 focus:ring-indigo-500');

  let control;
  if (type === 'checkbox') {
    control = (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        {help ?? 'Enabled'}
      </label>
    );
  } else if (type === 'textarea') {
    control = (
      <textarea
        value={value ?? ''}
        dir={dir}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    );
  } else if (type === 'select') {
    control = (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  } else if (type === 'color') {
    control = (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value : '#173D6E'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-300"
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1A2B3C"
          className={base}
        />
      </div>
    );
  } else if (type === 'image') {
    const showPreview = /^https?:\/\/.+/i.test(value ?? '');
    control = (
      <div>
        <input
          type="text"
          value={value ?? ''}
          dir="ltr"
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
        {showPreview && (
          <img
            src={value}
            alt=""
            className="mt-2 h-28 w-auto rounded-md border border-slate-200 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
    );
  } else {
    control = (
      <input
        type={type === 'number' ? 'number' : 'text'}
        value={value ?? ''}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    );
  }

  return (
    <div>
      {type !== 'checkbox' && (
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
      )}
      {control}
      {help && type !== 'checkbox' && (
        <p className="mt-1 text-xs text-slate-400">{help}</p>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export default function FormModal({
  title,
  fields,
  schema,
  initialValues,
  submitting = false,
  error = null,
  onSubmit,
  onClose,
}) {
  const [values, setValues] = useState(() => {
    const seed = {};
    for (const field of fields) {
      const initial = initialValues?.[field.name];
      seed[field.name] =
        initial ?? field.default ?? (field.type === 'checkbox' ? false : '');
    }
    return seed;
  });
  const [errors, setErrors] = useState({});

  const setValue = (name, next) =>
    setValues((prev) => ({ ...prev, [name]: next }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="space-y-3.5 overflow-y-auto px-5 py-4">
            {fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                value={values[field.name]}
                error={errors[field.name]}
                onChange={(next) => setValue(field.name, next)}
              />
            ))}
            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
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
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
