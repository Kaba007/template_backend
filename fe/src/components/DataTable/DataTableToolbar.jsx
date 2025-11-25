import { Button, Dropdown, DropdownItem } from 'flowbite-react';
import { HiDocumentDownload, HiPlus, HiRefresh, HiTrash, HiX } from 'react-icons/hi';

export const DataTableToolbar = ({
  title,
  selectedCount,
  onBulkAction,
  onExport,
  onRefresh,
  onCreate,
  actions,
  hasActiveFilters,
  onClearFilters,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Vybráno: {selectedCount}
            </span>
            {actions.bulkDelete !== false && (
              <Button
                size="sm"
                color="failure"
                onClick={() => onBulkAction('delete')}
              >
                <HiTrash className="mr-2 h-4 w-4" />
                Smazat vybrané
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* NOVÉ: Tlačítko pro vymazání filtrů */}
        {hasActiveFilters && (
          <Button
            size="sm"
            color="light"
            onClick={onClearFilters}
          >
            <HiX className="mr-2 h-4 w-4" />
            Zrušit filtry
          </Button>
        )}

        {/* Export dropdown */}
        {actions.export !== false && (
          <Dropdown
            label=""
            dismissOnClick={true}
            renderTrigger={() => (
              <Button color="light">
                <HiDocumentDownload className="mr-2 h-5 w-5" />
                Export
              </Button>
            )}
          >
            <DropdownItem onClick={() => onExport('csv')}>
              CSV
            </DropdownItem>
            <DropdownItem onClick={() => onExport('excel')}>
              Excel
            </DropdownItem>
          </Dropdown>
        )}

        {/* Refresh button */}
        <Button color="light" onClick={onRefresh}>
          <HiRefresh className="h-5 w-5" />
        </Button>

        {/* Create button */}
        {onCreate && (
          <Button color="blue" onClick={onCreate}>
            <HiPlus className="mr-2 h-5 w-5" />
            Přidat nový
          </Button>
        )}
      </div>
    </div>
  );
};
