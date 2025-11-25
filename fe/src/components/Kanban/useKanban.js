import { useEffect, useState } from 'react';
import api from '../../api/client';

export const useKanban = (initialData, columns, statusField, endpoints, onDataChange) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Aktualizovat data když se změní initialData
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Seskupit položky podle stavů (columnKey)
  const groupedData = columns.reduce((acc, column) => {
    acc[column.key] = data.filter(item => item[statusField] === column.key);
    return acc;
  }, {});

  // Najít položku podle ID
  const findItem = (itemId) => {
    return data.find(item => item.id === itemId);
  };

  // Změnit stav položky (drag & drop)
  const handleStatusChange = async (itemId, newStatus, oldStatus) => {
    if (!endpoints.updateStatus) {
      console.error('Missing updateStatus endpoint');
      return false;
    }

    // Optimistic update - okamžitě aktualizujeme UI
    const updatedData = data.map(item =>
      item.id === itemId
        ? { ...item, [statusField]: newStatus }
        : item
    );
    setData(updatedData);

    setLoading(true);
    setError(null);

    try {
      // Zavoláme API pro update stavu
      await api.patch(`${endpoints.updateStatus}/${itemId}`, {
        [statusField]: newStatus,
      });

      // Zavoláme callback pro refresh (volitelné)
      onDataChange?.();

      return true;
    } catch (err) {
      console.error('Status change error:', err);
      setError(err.response?.data?.message || 'Chyba při změně stavu');

      // Rollback - vrátíme zpět původní stav
      const rolledBackData = data.map(item =>
        item.id === itemId
          ? { ...item, [statusField]: oldStatus }
          : item
      );
      setData(rolledBackData);

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Refresh dat z API
  const refreshData = async () => {
    if (onDataChange) {
      await onDataChange();
    }
  };

  // Filtrace dat (pro budoucí rozšíření)
  const applyFilters = (filters) => {
    // TODO: Implementovat filtry podobně jako v useDataTable
    console.log('Filters:', filters);
  };

  return {
    data,
    groupedData,
    loading,
    error,
    handleStatusChange,
    refreshData,
    applyFilters,
    findItem,
  };
};
