import { Card, Spinner } from 'flowbite-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDataEnrichment } from '../../hooks/useDataEnrichment';
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
import { useTableSelection } from './useTableSelection';

export const DataTable = ({ config }) => {
  const {
    columns = [],
    data = [],
    endpoints = {},
    filters = [],
    actions = {},
    contextActions = [],
    onDataChange,
    title = 'Data',
    // Nový flag - pokud true, filtrování probíhá na backendu (přes API)
    // pokud false, filtrování probíhá na frontendu
    serverSideFiltering = true,
  } = config;

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Enrichment dat
  const { enrichedData, enrichmentLoading } = useDataEnrichment(data, columns);

  // Local state pro stránkování a řazení
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const itemsPerPage = 10;

  // Formátování hodnoty filtru pro zobrazení
  const formatFilterDisplayValue = (value, definition) => {
    if (definition.options) {
      const option = definition.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    return value;
  };

  // Získat aktivní filtry z URL pro zobrazení v banneru
  const urlFilters = useMemo(() => {
    const activeFilters = [];
    searchParams.forEach((value, key) => {
      // Hledáme v columns i filters definicích
      const column = columns.find(col => col.key === key);
      const filterDef = filters.find(f => f.key === key);

      if (column || filterDef) {
        const def = column || filterDef;
        activeFilters.push({
          key,
          label: def.label,
          value,
          displayValue: formatFilterDisplayValue(value, def),
        });
      }
    });
    return activeFilters;
  }, [searchParams, columns, filters]);

  // Client-side filtrování (pokud serverSideFiltering = false)
  const filteredData = useMemo(() => {
    if (serverSideFiltering) {
      // Data už jsou filtrovaná z backendu
      return enrichedData;
    }

    // Client-side filtrování
    let filtered = [...enrichedData];

    searchParams.forEach((filterValue, key) => {
      if (!filterValue) return;

      const column = columns.find(col => col.key === key);
      if (!column) return;

      filtered = filtered.filter(item => {
        const itemValue = item[key];

        if (itemValue === null || itemValue === undefined) {
          return false;
        }

        // Boolean filtr
        if (filterValue === 'true' || filterValue === 'false') {
          const boolValue = filterValue === 'true';
          return itemValue === boolValue;
        }

        // String filtr - LIKE vyhledávání
        if (typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(filterValue.toLowerCase());
        }

        // Number filtr
        if (typeof itemValue === 'number') {
          const numFilter = Number(filterValue);
          if (!isNaN(numFilter)) {
            return itemValue === numFilter;
          }
        }

        // Fallback
        return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    });

    return filtered;
  }, [enrichedData, searchParams, columns, serverSideFiltering]);

  // Řazení
  const sortedData = useMemo(() => {
    if (!sortConfig) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue > bValue ? 1 : -1)
        : (aValue < bValue ? 1 : -1);
    });
  }, [filteredData, sortConfig]);

  // Stránkování
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Reset stránky při změně filtrů (URL)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams]);

  // Selection hook
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

  // Handlers pro filtry
  const handleClearFilter = (filterKey) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filterKey);
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    const newParams = new URLSearchParams();
    // Zachovat non-filter parametry (např. page, sort)
    searchParams.forEach((value, key) => {
      const isFilterKey = filters.some(f => f.key === key) ||
                          columns.some(c => c.key === key);
      if (!isFilterKey) {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  // Handlers pro akce
  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

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

  const refreshData = async () => {
    await onDataChange?.();
  };

  const handleFormSubmit = async () => {
    await refreshData();
  };

  const handleDeleteConfirm = async () => {
    await refreshData();
    clearSelection();
  };

  const handleBulkConfirm = async () => {
    await refreshData();
    clearSelection();
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
            filterDefinitions={filters}
            onClearFilter={handleClearFilter}
            onClearAll={handleClearAllFilters}
          />
        )}

        {filters.length > 0 && (
          <DataTableFilters
            filters={filters}
            onFiltersChange={() => {
              // Callback po změně filtrů - data se načtou automaticky
              // přes useEffect v parent komponentě (LeadsPage)
            }}
          />
        )}

        <Card>
          {enrichmentLoading && (
            <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 border-b">
              <Spinner size="sm" />
              <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                Načítám související data...
              </span>
            </div>
          )}

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
