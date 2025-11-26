import { useEffect, useMemo, useState } from 'react';

export const useDataTable = (initialData, itemsPerPage = 10, onRefresh) => {
  const [data, setData] = useState(initialData);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Aplikovat filtry
  const filteredData = useMemo(() => {
    let filtered = [...data];

    Object.entries(filters).forEach(([key, filterValue]) => {
      // Přeskočit prázdné hodnoty
      if (filterValue === undefined || filterValue === null || filterValue === '') {
        return;
      }

      filtered = filtered.filter(item => {
        const itemValue = item[key];

        // Null/undefined v datech
        if (itemValue === null || itemValue === undefined) {
          return false;
        }

        // Boolean filtr
        if (typeof filterValue === 'boolean') {
          return itemValue === filterValue;
        }

        // Boolean jako string ("true"/"false")
        if (filterValue === 'true' || filterValue === 'false') {
          const boolValue = filterValue === 'true';
          return itemValue === boolValue;
        }

        // String filtr - LIKE vyhledávání
        if (typeof itemValue === 'string' && typeof filterValue === 'string') {
          return itemValue.toLowerCase().includes(filterValue.toLowerCase());
        }

        // Number filtr
        if (typeof itemValue === 'number') {
          const numFilter = Number(filterValue);
          if (!isNaN(numFilter)) {
            return itemValue === numFilter;
          }
          // Pokud filterValue není číslo, zkus string match
          return String(itemValue).includes(String(filterValue));
        }

        // Fallback - přesná shoda
        return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
    });

    return filtered;
  }, [data, filters]);

  // Aplikovat řazení
  const sortedData = useMemo(() => {
    if (!sortConfig) {
      return filteredData;
    }

    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [filteredData, sortConfig]);

  // Stránkování
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage]);

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

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const refreshData = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    setCurrentPage(1);
  };

  return {
    filteredData,
    paginatedData,
    currentPage,
    totalPages,
    handlePageChange,
    handleSort,
    sortConfig,
    applyFilters,
    refreshData,
  };
};
