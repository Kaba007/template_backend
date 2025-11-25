import { Button, Dropdown, DropdownItem } from 'flowbite-react';
import { HiDocumentDownload, HiPlus, HiRefresh, HiViewBoards } from 'react-icons/hi';

export const KanbanToolbar = ({
  title,
  onRefresh,
  onCreate,
  onExport,
  actions,
  itemCount,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <HiViewBoards className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>

        {itemCount !== undefined && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Celkem: {itemCount} položek
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Export dropdown */}
        {actions?.export !== false && onExport && (
          <Dropdown
            label=""
            dismissOnClick={true}
            renderTrigger={() => (
              <Button color="light" size="sm">
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
        <Button color="light" size="sm" onClick={onRefresh}>
          <HiRefresh className="h-5 w-5" />
        </Button>

        {/* Create button */}
        {onCreate && actions?.create !== false && (
          <Button color="blue" size="sm" onClick={onCreate}>
            <HiPlus className="mr-2 h-5 w-5" />
            Přidat nový
          </Button>
        )}
      </div>
    </div>
  );
};
