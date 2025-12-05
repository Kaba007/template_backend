// src/components/DataTable/DataTableBody.jsx
import { DataTableRow } from './DataTableRow';

export const DataTableBody = ({
  columns,
  data,
  selectedRows,
  selectedItem,
  onSelectRow,
  onRowClick,
  onEdit,
  onDelete,
  hasSelection,
  onDocumentsClick,
  documentsConfig,
}) => {
  // Filtrujeme pouze sloupce, které mají být zobrazeny
  const visibleColumns = columns.filter(column => column.showInTable !== false);

  if (!data || data.length === 0) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={visibleColumns.length + (hasSelection ? 2 : 1)}
            className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
          >
            Žádná data k zobrazení
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {data.map((row, index) => (
        <DataTableRow
          key={row.id || index}
          row={row}
          columns={visibleColumns}
          isSelected={selectedRows.includes(row.id || index)}
          isHighlighted={selectedItem?.id === row.id}
          onSelect={() => onSelectRow(row.id || index)}
          onClick={() => onRowClick?.(row)}
          onEdit={() => onEdit?.(row)}
          onDelete={() => onDelete?.(row)}
          hasSelection={hasSelection}
          onDocumentsClick={onDocumentsClick}
          documentsConfig={documentsConfig}
        />
      ))}
    </tbody>
  );
};
