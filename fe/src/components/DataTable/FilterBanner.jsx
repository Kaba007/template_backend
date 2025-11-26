// src/components/DataTable/FilterBanner.jsx
import { Button, Card, Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';
import api from '../../api/client';

export const FilterBanner = ({ filters, filterDefinitions = [], onClearFilter, onClearAll }) => {
  const [asyncLabels, setAsyncLabels] = useState({});
  const [loadingLabels, setLoadingLabels] = useState({});

  // Načíst labely pro async-select filtry
  useEffect(() => {
    const loadAsyncLabels = async () => {
      for (const filter of filters) {
        // Najdi definici filtru
        const definition = filterDefinitions.find(d => d.key === filter.key);

        // Pokud je to async-select a ještě nemáme label
        if (definition?.type === 'async-select' && !asyncLabels[filter.key]) {
          setLoadingLabels(prev => ({ ...prev, [filter.key]: true }));

          try {
            const response = await api.get(`${definition.endpoint}/${filter.value}`);
            const data = response.data;
            const label = data[definition.labelKey || 'name'];

            setAsyncLabels(prev => ({
              ...prev,
              [filter.key]: label
            }));
          } catch (err) {
            console.error(`Error loading label for ${filter.key}:`, err);
            // Fallback na hodnotu
            setAsyncLabels(prev => ({
              ...prev,
              [filter.key]: filter.value
            }));
          } finally {
            setLoadingLabels(prev => ({ ...prev, [filter.key]: false }));
          }
        }
      }
    };

    loadAsyncLabels();
  }, [filters, filterDefinitions, asyncLabels]);

  // Reset async labels když se změní filtry
  useEffect(() => {
    const currentFilterKeys = filters.map(f => f.key);
    setAsyncLabels(prev => {
      const newLabels = { ...prev };
      Object.keys(newLabels).forEach(key => {
        if (!currentFilterKeys.includes(key)) {
          delete newLabels[key];
        }
      });
      return newLabels;
    });
  }, [filters]);

  if (!filters || filters.length === 0) {
    return null;
  }

  const getDisplayValue = (filter) => {
    const definition = filterDefinitions.find(d => d.key === filter.key);

    // Pro async-select použij načtený label
    if (definition?.type === 'async-select') {
      if (loadingLabels[filter.key]) {
        return <Spinner size="xs" className="inline" />;
      }
      return asyncLabels[filter.key] || filter.value;
    }

    // Pro ostatní typy použij displayValue
    return filter.displayValue;
  };

  return (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Aktivní filtry:
          </span>
          {filters.map((filter, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-blue-100 dark:bg-blue-800 px-3 py-1 rounded-full"
            >
              <span className="text-sm text-blue-900 dark:text-blue-100">
                <strong>{filter.label}:</strong> {getDisplayValue(filter)}
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
