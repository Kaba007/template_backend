import { Card } from 'flowbite-react';
import { useState } from 'react';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { ActionBar } from '../layout/ActionBar';
import { BulkActionModal } from '../Modals/BulkActionModal';
import { DeleteModal } from '../Modals/DeleteModal';
import { FormModal } from '../Modals/FormModal';
import { DataTableBody } from './DataTableBody';
import { DataTableFilters } from './DataTableFilters';
import { DataTableHeader } from './DataTableHeader';
import { DataTablePagination } from './DataTablePagination';
import { DataTableToolbar } from './DataTableToolbar';
import { useDataTable } from './useDataTable';
import { useTableSelection } from './useTableSelection';

export const DataTable = ({ config }) => {
  const {
    columns = [],
    data = [],
    endpoints = {},
    filters = [],
    actions = {},
    contextActions = [], // NOVÉ: Akce pro action bar
    onDataChange,
    title = 'Data',
  } = config;

  // Custom hooks pro logiku
  const {
    filteredData,
    paginatedData,
    currentPage,
    totalPages,
    handlePageChange,
    handleSort,
    sortConfig,
    applyFilters,
    refreshData,
  } = useDataTable(data);

  const {
    selectedRows,
    allSelected,
    handleSelectAll,
    handleSelectRow,
    clearSelection,
  } = useTableSelection(paginatedData);

  // Modal states
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [formModal, setFormModal] = useState({ open: false, item: null, mode: 'create' });
  const [bulkModal, setBulkModal] = useState({ open: false, action: null });

  // NOVÉ: Vybraný řádek pro action bar
  const [selectedItem, setSelectedItem] = useState(null);

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

  const handleBulkAction = (action) => {
    setBulkModal({ open: true, action });
  };

  const handleExport = (format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;

    if (format === 'csv') {
      exportToCSV(filteredData, columns, `${filename}.csv`);
    } else if (format === 'excel') {
      exportToExcel(filteredData, columns, `${filename}.xlsx`);
    }
  };

  // NOVÉ: Handler pro kliknutí na řádek
  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  return (
    <div className="flex h-full">
      {/* Hlavní obsah tabulky */}
      <div className="flex-1 space-y-4 overflow-auto">
        <DataTableToolbar
          title={title}
          selectedCount={selectedRows.length}
          onBulkAction={handleBulkAction}
          onExport={handleExport}
          onRefresh={refreshData}
          onCreate={actions.create !== false ? handleCreate : null}
          actions={actions}
        />

        {filters.length > 0 && (
          <DataTableFilters
            filters={filters}
            onApplyFilters={applyFilters}
          />
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <DataTableHeader
                columns={columns}
                sortConfig={sortConfig}
                onSort={handleSort}
                allSelected={allSelected}
                onSelectAll={handleSelectAll}
                hasSelection={actions.bulkDelete !== false}
              />
              <DataTableBody
                columns={columns}
                data={paginatedData}
                selectedRows={selectedRows}
                selectedItem={selectedItem}
                onSelectRow={handleSelectRow}
                onRowClick={handleRowClick}
                onEdit={actions.edit !== false ? handleEdit : null}
                onDelete={actions.delete !== false ? handleDelete : null}
                hasSelection={actions.bulkDelete !== false}
              />
            </table>
          </div>

          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            onPageChange={handlePageChange}
          />
        </Card>

        {/* Modals */}
        <DeleteModal
          open={deleteModal.open}
          item={deleteModal.item}
          onClose={() => setDeleteModal({ open: false, item: null })}
          onConfirm={async () => {
            await refreshData();
            clearSelection();
          }}
          endpoint={endpoints.delete}
        />

        <FormModal
          open={formModal.open}
          item={formModal.item}
          mode={formModal.mode}
          columns={columns}
          onClose={() => setFormModal({ open: false, item: null, mode: 'create' })}
          onSubmit={async (data) => {
            await refreshData();
          }}
          endpoints={endpoints}
        />

        <BulkActionModal
          open={bulkModal.open}
          action={bulkModal.action}
          selectedItems={selectedRows}
          onClose={() => setBulkModal({ open: false, action: null })}
          onConfirm={async () => {
            await refreshData();
            clearSelection();
          }}
          endpoint={endpoints.bulkDelete}
        />
      </div>

      {/* Action Bar (pravý panel) */}
      {contextActions.length > 0 && (
        <ActionBar
          selectedItem={selectedItem}
          actions={contextActions}
        />
      )}
    </div>
  );
};
