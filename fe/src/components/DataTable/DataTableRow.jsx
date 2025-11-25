import { Button, Checkbox } from 'flowbite-react';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { DataTableCell } from './DataTableCell';

export const DataTableRow = ({
  row,
  columns,
  isSelected,
  isHighlighted,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  hasSelection,
}) => {
  return (
    <tr
      onClick={onClick}
      className={`
        border-b dark:border-gray-700
        cursor-pointer
        transition-colors duration-150
        hover:bg-gray-50 dark:hover:bg-gray-700
        ${isHighlighted
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
          : 'bg-white dark:bg-gray-800'
        }
      `}
    >
      {/* Checkbox */}
      {hasSelection && (
        <td
          className="w-4 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onChange={onSelect}
          />
        </td>
      )}

      {/* Data buňky */}
      {columns.map((column) => (
        <DataTableCell
          key={column.key}
          column={column}
          value={row[column.key]}
          row={row}
        />
      ))}

      {/* Akce */}
      <td
        className="px-6 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              size="xs"
              color="blue"
              onClick={onEdit}
            >
              <HiPencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="xs"
              color="failure"
              onClick={onDelete}
            >
              <HiTrash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};
