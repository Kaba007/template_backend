import { Checkbox } from 'flowbite-react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';

export const DataTableHeader = ({
  columns,
  sortConfig,
  onSort,
  allSelected,
  onSelectAll,
  hasSelection,
}) => {
  const renderSortIcon = (columnKey) => {
    if (sortConfig?.key !== columnKey) {
      return null;
    }

    return sortConfig.direction === 'asc' ? (
      <HiChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <HiChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Filtrujeme pouze sloupce, které mají být zobrazeny
  const visibleColumns = columns.filter(column => column.showInTable !== false);

  return (
    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
      <tr>
        {/* Checkbox sloupec */}
        {hasSelection && (
          <th scope="col" className="p-4">
            <Checkbox
              checked={allSelected}
              onChange={onSelectAll}
            />
          </th>
        )}

        {/* Datové sloupce - pouze viditelné */}
        {visibleColumns.map((column) => (
          <th
            key={column.key}
            scope="col"
            className="px-6 py-3"
          >
            {column.sortable !== false ? (
              <button
                onClick={() => onSort(column.key)}
                className="flex items-center hover:text-gray-900 dark:hover:text-white"
              >
                {column.label}
                {renderSortIcon(column.key)}
              </button>
            ) : (
              <span>{column.label}</span>
            )}
          </th>
        ))}

        {/* Akce sloupec */}
        <th scope="col" className="px-6 py-3">
          <span>Akce</span>
        </th>
      </tr>
    </thead>
  );
};
