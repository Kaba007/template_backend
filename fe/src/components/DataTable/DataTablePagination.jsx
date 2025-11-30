import { Button } from 'flowbite-react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

export const DataTablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-700 dark:text-gray-400">
        Celkem <span className="font-semibold">{totalItems}</span> záznamů
      </div>

      <div className="flex items-center gap-2">
        <Button
          color="light"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <HiChevronLeft className="h-5 w-5" />
        </Button>

        {generatePageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
              ...
            </span>
          ) : (
            <Button
              key={page}
              color={currentPage === page ? 'blue' : 'light'}
              size="sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          )
        ))}

        <Button
          color="light"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <HiChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
