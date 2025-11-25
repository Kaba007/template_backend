import { useState } from 'react';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { DeleteModal } from '../Modals/DeleteModal';
import { FormModal } from '../Modals/FormModal';
import { ActionBarKanban } from './ActionBarKanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanToolbar } from './KanbanToolbar';
import { useKanban } from './useKanban';
import { useKanbanSelection } from './useKanbanSelection';

export const KanbanBoard = ({ config }) => {
  const {
    columns = [],
    fields = [],
    data = [],
    endpoints = {},
    actions = {},
    contextActions = [],
    onDataChange,
    title = 'Kanban Board',
    statusField = 'status',
    cardConfig = {},
  } = config;

  // Custom hooks pro kanban logiku
  const {
    groupedData,
    handleStatusChange,
    refreshData,
    loading,
    error,
  } = useKanban(data, columns, statusField, endpoints, onDataChange);

  // Selection hook - jen highlight
  const {
    selectedCard,
    handleCardClick,
    clearSelection,
  } = useKanbanSelection();

  // Modal states
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [formModal, setFormModal] = useState({ open: false, item: null, mode: 'create' });

  // Handlers
  const handleCreate = () => {
    setFormModal({ open: true, item: null, mode: 'create' });
  };

  const handleEdit = (item) => {
    setFormModal({ open: true, item, mode: 'edit' });
  };

  const handleDelete = (item) => {
    setDeleteModal({ open: true, item });
  };

  const handleDrop = async (itemId, newStatus, oldStatus) => {
    const success = await handleStatusChange(itemId, newStatus, oldStatus);

    if (!success && error) {
      console.error('Drop failed:', error);
    }
  };

  const handleExport = (format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;

    if (format === 'csv') {
      exportToCSV(data, fields, `${filename}.csv`);
    } else if (format === 'excel') {
      exportToExcel(data, fields, `${filename}.xlsx`);
    }
  };

  // Po úspěšném create/edit/delete zavolej refresh
  const handleFormSubmit = async () => {
    await refreshData();
    onDataChange?.();
  };

  const handleDeleteConfirm = async () => {
    await refreshData();
    onDataChange?.();
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <KanbanToolbar
          title={title}
          onRefresh={refreshData}
          onCreate={actions.create !== false ? handleCreate : null}
          onExport={handleExport}
          actions={actions}
          itemCount={data.length}
        />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Kanban columns - FULLSCREEN s scrollem */}
        <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.key}
              column={column}
              items={groupedData[column.key] || []}
              fields={fields}
              cardConfig={cardConfig}
              onEdit={actions.edit !== false ? handleEdit : null}
              onDelete={actions.delete !== false ? handleDelete : null}
              onDrop={handleDrop}
              selectedCard={selectedCard}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        {/* Modals */}
        <DeleteModal
          open={deleteModal.open}
          item={deleteModal.item}
          onClose={() => setDeleteModal({ open: false, item: null })}
          onConfirm={handleDeleteConfirm}
          endpoint={endpoints.delete}
        />

        <FormModal
          open={formModal.open}
          item={formModal.item}
          mode={formModal.mode}
          columns={fields}
          onClose={() => setFormModal({ open: false, item: null, mode: 'create' })}
          onSubmit={handleFormSubmit}
          endpoints={endpoints}
        />
      </div>

      {/* ActionBar - rychlé akce */}
      {contextActions.length > 0 && (
        <ActionBarKanban
          selectedItem={selectedCard}
          actions={contextActions}
        />
      )}
    </div>
  );
};
