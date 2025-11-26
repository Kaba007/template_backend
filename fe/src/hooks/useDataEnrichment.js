import { useEffect, useRef, useState } from 'react';
import api from '../api/client';

export const useDataEnrichment = (data, columns) => {
  const [enrichedData, setEnrichedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef({});

  const prevDataRef = useRef(null);
  const prevColumnsRef = useRef(null);

  useEffect(() => {
    const enrichColumns = columns.filter(col => col.enrich);

    // DEBUG
    console.log('🔄 useDataEnrichment triggered:', {
      dataLength: data.length,
      enrichColumnsCount: enrichColumns.length,
      enrichColumns: enrichColumns.map(c => c.key),
    });

    const dataKey = JSON.stringify(data.map(d => d.id));
    const columnsKey = JSON.stringify(columns.map(c => ({ key: c.key, enrich: c.enrich })));

    if (prevDataRef.current === dataKey && prevColumnsRef.current === columnsKey) {
      console.log('⏭️ Skipping - no changes');
      return;
    }

    prevDataRef.current = dataKey;
    prevColumnsRef.current = columnsKey;

    if (!data.length || !enrichColumns.length) {
      console.log('⚠️ No data or no enrich columns, returning original data');
      setEnrichedData(data);
      return;
    }

    const allEndpointsCached = enrichColumns.every(
      col => cacheRef.current[col.enrich.endpoint]
    );

    if (allEndpointsCached) {
      console.log('✅ Using cached data');
      const enriched = enrichData(data, enrichColumns, cacheRef.current);
      console.log('📦 Enriched data (from cache):', enriched[0]);
      setEnrichedData(enriched);
      return;
    }

    const fetchEnrichmentData = async () => {
      setLoading(true);

      try {
        for (const column of enrichColumns) {
          const { endpoint, foreignKey = 'id' } = column.enrich;
          const cacheKey = endpoint;

          if (!cacheRef.current[cacheKey]) {
            console.log(`📡 Fetching enrichment data from: ${endpoint}`);
            const response = await api.get(endpoint);
            console.log(`📥 Received ${response.data.length} items from ${endpoint}`);
            console.log('📥 Sample item:', response.data[0]);

            const lookupMap = {};
            response.data.forEach(item => {
              lookupMap[item[foreignKey]] = item;
            });

            console.log('🗺️ Lookup map keys:', Object.keys(lookupMap).slice(0, 5));
            cacheRef.current[cacheKey] = lookupMap;
          }
        }

        const enriched = enrichData(data, enrichColumns, cacheRef.current);
        console.log('📦 Enriched data (first item):', enriched[0]);
        setEnrichedData(enriched);
      } catch (error) {
        console.error('❌ Enrichment error:', error);
        setEnrichedData(data);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrichmentData();
  }, [data, columns]);

  const clearCache = () => {
    cacheRef.current = {};
    prevDataRef.current = null;
    prevColumnsRef.current = null;
  };

  return {
    enrichedData,
    enrichmentLoading: loading,
    clearEnrichmentCache: clearCache,
  };
};

const enrichData = (data, enrichColumns, cache) => {
  console.log('🔧 enrichData called with:', {
    dataLength: data.length,
    enrichColumnsKeys: enrichColumns.map(c => c.key),
    cacheKeys: Object.keys(cache),
  });

  return data.map((row, index) => {
    const enrichedRow = { ...row };

    enrichColumns.forEach(column => {
      const { endpoint, displayField, displayFields } = column.enrich;
      const lookupMap = cache[endpoint];
      const foreignValue = row[column.key];

      // DEBUG pro první řádek
      if (index === 0) {
        console.log(`🔍 Enriching ${column.key}:`, {
          foreignValue,
          hasLookupMap: !!lookupMap,
          foundItem: lookupMap ? lookupMap[foreignValue] : null,
          displayField,
        });
      }

      if (lookupMap && foreignValue !== null && foreignValue !== undefined) {
        const relatedItem = lookupMap[foreignValue];

        if (relatedItem) {
          enrichedRow[`_enriched_${column.key}`] = relatedItem;

          if (displayFields && Array.isArray(displayFields)) {
            enrichedRow[`_display_${column.key}`] = displayFields
              .map(field => relatedItem[field])
              .filter(Boolean)
              .join(' - ');
          } else if (displayField) {
            enrichedRow[`_display_${column.key}`] = relatedItem[displayField];
          }
        }
      }
    });

    return enrichedRow;
  });
};
