import { useEffect, useState } from 'react';

export const useTableSelection = (data) => {
  const [selectedRows, setSelectedRows] = useState([]);

  // Reset selection když se změní data
  useEffect(() => {
    setSelectedRows([]);
  }, [data]);

  const allSelected = data.length > 0 && selectedRows.length === data.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedRows([]);
    } else {
      const allIds = data.map((row, index) => row.id || index);
      setSelectedRows(allIds);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const clearSelection = () => {
    setSelectedRows([]);
  };

  return {
    selectedRows,
    allSelected,
    handleSelectAll,
    handleSelectRow,
    clearSelection,
  };
};
