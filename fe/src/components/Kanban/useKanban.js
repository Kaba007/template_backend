import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';

export const useKanban = (
  initialData,
  columns,
  statusField,
  endpoints,
  onDataChange,
  fields = [] // ✅ Přidáno pro enrichment
) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Enrichment funkce - načte related data pro async-select pole
  const enrichData = useCallback(async (rawData) => {
    if (!fields || fields.length === 0 || !rawData || rawData.length === 0) {
      return rawData;
    }

    // Najdi všechna pole s enrich konfigurací
    const enrichFields = fields.filter(f => f.enrich);

    if (enrichFields.length === 0) {
      return rawData;
    }

    // Pro každé enrich pole načti data
    const enrichedData = [...rawData];

    for (const field of enrichFields) {
      const { endpoint, foreignKey, displayField } = field.enrich;

      // Získej unikátní ID pro tento field
      const ids = [...new Set(
        rawData
          .map(item => item[field.key])
          .filter(id => id !== null && id !== undefined)
      )];

      if (ids.length === 0) continue;

      try {
        // Načti všechna related data najednou
        const response = await api.get(endpoint);
        const relatedData = response.data;

        // Vytvoř lookup mapu
        const lookupMap = {};
        relatedData.forEach(item => {
          lookupMap[item[foreignKey]] = item;
        });

        // Obohatit data
        enrichedData.forEach(item => {
          const relatedId = item[field.key];
          if (relatedId && lookupMap[relatedId]) {
            // Přidej enriched data pod klíč {field.key}_data
            item[`${field.key}_data`] = lookupMap[relatedId];
          }
        });
      } catch (err) {
        console.warn(`Failed to enrich field ${field.key}:`, err);
      }
    }

    return enrichedData;
  }, [fields]);

  // Aktualizovat data když se změní initialData + enrichment
  useEffect(() => {
    const processData = async () => {
      if (initialData && initialData.length > 0) {
        const enriched = await enrichData(initialData);
        setData(enriched);
      } else {
        setData(initialData || []);
      }
    };
    processData();
  }, [initialData, enrichData]);

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

    // Optimistic update
    const updatedData = data.map(item =>
      item.id === itemId
        ? { ...item, [statusField]: newStatus }
        : item
    );
    setData(updatedData);

    setLoading(true);
    setError(null);

    try {
      await api.patch(`${endpoints.updateStatus}/${itemId}`, {
        [statusField]: newStatus,
      });

      // Refresh data - onDataChange se postará o načtení s aktuálními filtry z URL
      onDataChange?.();

      return true;
    } catch (err) {
      console.error('Status change error:', err);
      setError(err.response?.data?.message || 'Chyba při změně stavu');

      // Rollback
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

  // Refresh dat - jednoduše zavolá onDataChange
  const refreshData = () => {
    onDataChange?.();
  };

  return {
    data,
    groupedData,
    loading,
    error,
    handleStatusChange,
    refreshData,
    findItem,
  };
};