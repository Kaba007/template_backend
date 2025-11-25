import { Card } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { FilterBanner } from './FilterBanner';
import { useDataTable } from './useDataTable';
import { useTableSelection } from './useTableSelection';

export const DataTable = ({ config }) => {
  const {
    columns = [],
    data = [],
    endpoints = {},
    filters = [],
    actions = {},
    contextActions = [],
    onDataChange, // TOTO je callback pro refresh
    title = 'Data',
  } = config;

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Custom hooks pro logiku - PŘEDEJ onDataChange do useDataTable
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
  } = useDataTable(data, 10, onDataChange); // ZMĚNA: Přidán třetí parametr

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
  const [selectedItem, setSelectedItem] = useState(null);

  // URL filtry
  const [urlFilters, setUrlFilters] = useState([]);

  useEffect(() => {
    const filters = [];
    searchParams.forEach((value, key) => {
      const column = columns.find(col => col.key === key);
      if (column) {
        filters.push({
          key,
          label: column.label,
          value,
          displayValue: formatFilterValue(value, column),
        });
      }
    });
    setUrlFilters(filters);
  }, [searchParams, columns]);

  const formatFilterValue = (value, column) => {
    if (column.type === 'ajax' && column.optionLabel) {
      return value;
    }
    if (column.type === 'select' && column.options) {
      const option = column.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    return value;
  };

  const handleClearFilter = (filterKey) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filterKey);
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    const currentPath = window.location.pathname;
    navigate(currentPath);
  };

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

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  // OPRAVA: Po úspěšném create/edit/delete zavolej refresh
  const handleFormSubmit = async () => {
    await refreshData();
    onDataChange?.(); // Volitelně: zavolej i původní callback
  };

  const handleDeleteConfirm = async () => {
    await refreshData();
    clearSelection();
    onDataChange?.();
  };

  const handleBulkConfirm = async () => {
    await refreshData();
    clearSelection();
    onDataChange?.();
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 space-y-4 overflow-auto">
        <DataTableToolbar
          title={title}
          selectedCount={selectedRows.length}
          onBulkAction={handleBulkAction}
          onExport={handleExport}
          onRefresh={refreshData}
          onCreate={actions.create !== false ? handleCreate : null}
          actions={actions}
          hasActiveFilters={urlFilters.length > 0}
          onClearFilters={handleClearAllFilters}
        />

        {urlFilters.length > 0 && (
          <FilterBanner
            filters={urlFilters}
            onClearFilter={handleClearFilter}
            onClearAll={handleClearAllFilters}
          />
        )}

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
          onConfirm={handleDeleteConfirm}
          endpoint={endpoints.delete}
        />

        <FormModal
          open={formModal.open}
          item={formModal.item}
          mode={formModal.mode}
          columns={columns}
          onClose={() => setFormModal({ open: false, item: null, mode: 'create' })}
          onSubmit={handleFormSubmit}
          endpoints={endpoints}
        />

        <BulkActionModal
          open={bulkModal.open}
          action={bulkModal.action}
          selectedItems={selectedRows}
          onClose={() => setBulkModal({ open: false, action: null })}
          onConfirm={handleBulkConfirm}
          endpoint={endpoints.bulkDelete}
        />
      </div>

      {contextActions.length > 0 && (
        <ActionBar
          selectedItem={selectedItem}
          actions={contextActions}
        />
      )}
    </div>
  );
};
