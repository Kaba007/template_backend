// src/components/DataTable/FilterBanner.jsx
import { Button, Card } from 'flowbite-react';
import { HiX } from 'react-icons/hi';

export const FilterBanner = ({ filters, onClearFilter, onClearAll }) => {
  if (!filters || filters.length === 0) {
    return null;
  }

  return (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Aktivní zafixování:
          </span>
          {filters.map((filter, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-blue-100 dark:bg-blue-800 px-3 py-1 rounded-full"
            >
              <span className="text-sm text-blue-900 dark:text-blue-100">
                <strong>{filter.label}:</strong> {filter.displayValue}
              </span>
              <button
                onClick={() => onClearFilter(filter.key)}
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
              >
                <HiX className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          size="xs"
          color="light"
          onClick={onClearAll}
        >
          Vymazat vše
        </Button>
      </div>
    </Card>
  );
};
