import { useState } from 'react';
import { HiChevronDown, HiChevronRight } from 'react-icons/hi';

/**
 * FormSection - Accordion sekce pro seskupení polí ve formuláři
 *
 * @param {object} section - Konfigurace sekce { key, label, icon, columnsLayout, defaultOpen }
 * @param {React.ReactNode} children - Pole formuláře
 * @param {boolean} hasError - Zda sekce obsahuje pole s chybou
 */
export const FormSection = ({
  section,
  children,
  hasError = false,
  defaultOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(section.defaultOpen ?? defaultOpen);

  // Podpora obou variant: columnsLayout (nový) i columns (starý/z konfigurace)
  const { label, icon, columnsLayout, columns } = section;
  const columnCount = columnsLayout ?? columns ?? 2;

  // Grid classes podle počtu sloupců
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };

  const gridClass = gridClasses[columnCount] || gridClasses[2];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* ... zbytek kódu FormSection je stejný ... */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-3
          bg-gray-50 dark:bg-gray-800
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors duration-150
          ${hasError ? 'border-l-4 border-l-red-500' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium text-gray-900 dark:text-white">
            {label}
          </span>
          {hasError && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full">
              Chyba
            </span>
          )}
        </div>
        <span className="text-gray-500 dark:text-gray-400">
          {isOpen ? <HiChevronDown className="w-5 h-5" /> : <HiChevronRight className="w-5 h-5" />}
        </span>
      </button>

      {/* Content - animovaný collapse */}
      <div
        className={`
          transition-all duration-200 ease-in-out
          ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
        `}
      >
        <div className={`grid ${gridClass} gap-4 p-4 bg-white dark:bg-gray-900`}>
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * FormSectionDivider - Jednoduchý oddělovač sekcí (alternativa k accordion)
 * Pro případy kdy nechcete accordion ale jen vizuální oddělení
 */
export const FormSectionDivider = ({ section, children }) => {
  // Podpora obou variant: columnsLayout (nový) i columns (starý/z konfigurace)
  const { label, icon, columnsLayout, columns } = section;
  const columnCount = columnsLayout ?? columns ?? 2;

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gridClass = gridClasses[columnCount] || gridClasses[2];

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        {icon && <span className="text-lg">{icon}</span>}
        <h3 className="font-medium text-gray-900 dark:text-white">{label}</h3>
      </div>

      {/* Section content */}
      <div className={`grid ${gridClass} gap-4`}>
        {children}
      </div>
    </div>
  );
};
