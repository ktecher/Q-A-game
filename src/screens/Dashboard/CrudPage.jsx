// Generic list + add + edit + delete page. Each entity page supplies its
// columns, form fields and Zod schema; this component wires them to the
// admin CRUD hooks, the table, the form modal and the confirm dialog.
import { useState } from 'react';
import { Plus } from 'lucide-react';
import DataTable from './ui/DataTable';
import FormModal from './ui/FormModal';
import ConfirmDialog from './ui/ConfirmDialog';
import { useAdminSave, useAdminDelete, dbErrorMessage } from '../../lib/admin/hooks';

export default function CrudPage({
  title,
  description,
  singular = 'row',
  table,
  rows,
  loading,
  error,
  columns,
  fields,
  schema,
  searchKeys = [],
  getRowId = (row) => row.id,
  gameInvalidate = [],
  canAdd = true,
  canEdit = true,
  canDelete = true,
  addLabel = 'Add',
  newDefaults = {},
  rowMatch = (row) => ({ id: row.id }),
  deleteTitle = 'Delete row',
  renderDeleteMessage,
  toolbar = null,
}) {
  const save = useAdminSave(table, { invalidate: gameInvalidate });
  const del = useAdminDelete(table, { invalidate: gameInvalidate });
  const [editing, setEditing] = useState(null); // a row, a {__new} object, or null
  const [deleting, setDeleting] = useState(null);

  const isNew = Boolean(editing && editing.__new);

  const openAdd = () => {
    save.reset();
    setEditing({ __new: true, ...newDefaults });
  };
  const openEdit = (row) => {
    save.reset();
    setEditing(row);
  };
  const submit = (values) => {
    save.mutate(
      { id: isNew ? null : getRowId(editing), values },
      { onSuccess: () => setEditing(null) }
    );
  };

  const openDelete = (row) => {
    del.reset();
    setDeleting(row);
  };
  const confirmDelete = () => {
    del.mutate(
      { match: rowMatch(deleting) },
      { onSuccess: () => setDeleting(null) }
    );
  };

  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </header>

      {toolbar && <div className="mb-3">{toolbar}</div>}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={getRowId}
        searchKeys={searchKeys}
        loading={loading}
        error={error ? error.message || String(error) : null}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canDelete ? openDelete : undefined}
      />

      {editing && schema && (
        <FormModal
          key={isNew ? '__new' : getRowId(editing)}
          title={isNew ? addLabel : `Edit ${singular}`}
          fields={fields}
          schema={schema}
          initialValues={editing}
          submitting={save.isPending}
          error={dbErrorMessage(save.error)}
          onSubmit={submit}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={deleteTitle}
          message={
            renderDeleteMessage ? (
              renderDeleteMessage(deleting)
            ) : (
              <p>This {singular} will be permanently deleted. This cannot be undone.</p>
            )
          }
          busy={del.isPending}
          error={dbErrorMessage(del.error)}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
