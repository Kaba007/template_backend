import { Button, Label, TextInput } from 'flowbite-react';
import { useCallback, useMemo } from 'react';
import { HiPlus, HiTrash } from 'react-icons/hi';
import { AsyncSelectFilter } from '../filters/AjaxSelect';

/**
 * ArrayField - Komponenta pro pole s více položkami (např. položky faktury)
 *
 * Podporuje:
 * - Přidávání/mazání řádků
 * - Computed fields na úrovni položky
 * - Validaci jednotlivých položek
 * - Async-select pro výběr položek z katalogu (např. produktů)
 */
export const ArrayField = ({
  column,
  items = [],
  onChange,
  error,
  formData,
}) => {
  const {
    key,
    label,
    itemFields = [],
    minItems = 0,
    maxItems = Infinity,
    defaultItem = {},
    addButtonLabel = 'Přidat položku',
  } = column;

  // =====================================================
  // COMPUTED VALUES pro každou položku
  // =====================================================
  const itemsWithComputed = useMemo(() => {
    return items.map((item, index) => {
      const computed = {};

      itemFields.forEach(field => {
        if (field.computed && typeof field.computed === 'function') {
          try {
            // Computed funkce dostane: (item, allItems, formData, index)
            computed[field.key] = field.computed(item, items, formData, index);
          } catch (err) {
            console.error(`Error computing ${field.key} for item ${index}:`, err);
            computed[field.key] = null;
          }
        }
      });

      return { ...item, ...computed, _index: index };
    });
  }, [items, itemFields, formData]);

  // =====================================================
  // HANDLERS
  // =====================================================
  const handleAddItem = useCallback(() => {
    if (items.length >= maxItems) return;

    // Vytvoř novou položku s default hodnotami
    const newItem = { ...defaultItem };
    itemFields.forEach(field => {
      if (field.defaultValue !== undefined && newItem[field.key] === undefined) {
        newItem[field.key] = field.defaultValue;
      }
    });

    onChange([...items, newItem]);
  }, [items, maxItems, defaultItem, itemFields, onChange]);

  const handleRemoveItem = useCallback((index) => {
    if (items.length <= minItems) return;

    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  }, [items, minItems, onChange]);

  const handleItemChange = useCallback((index, fieldKey, value) => {
    const newItems = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [fieldKey]: value };
    });
    onChange(newItems);
  }, [items, onChange]);

  // =====================================================
  // RENDER FIELD
  // =====================================================
  const renderItemField = (item, itemIndex, field) => {
    const isComputed = !!field.computed;
    const value = isComputed
      ? itemsWithComputed[itemIndex]?.[field.key]
      : item[field.key];

    // Formátování hodnoty
    const displayValue = formatFieldValue(value, field);

    // ✅ Async-select field (pro výběr produktu)
    // V renderItemField funkci, sekce pro async-select:
    if (field.type === 'async-select' && !isComputed) {
      return (
        <div key={field.key} className="flex flex-col">
          {itemIndex === 0 && (
            <Label className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
          )}
          <div className="async-select-compact">
            <AsyncSelectFilter
              filter={{
                key: field.key,
                label: '',
                endpoint: field.endpoint,
                valueKey: field.optionValue || 'id',
                labelKey: field.optionLabel || 'name',
                queryParamKey: field.queryParamKey || field.optionLabel || 'name',
                placeholder: field.placeholder || 'Vyberte...',
                minChars: field.minChars ?? 0,
              }}
              value={value}
              onChange={(newValue, selectedItemData) => {
                console.log('Async select change:', { newValue, selectedItemData });
                
                // ✅ OPRAVA: Vytvořit nový objekt s všemi změnami najednou
                const updates = { [field.key]: newValue };
                
                // Aplikovat fillFields pokud jsou definována
                if (field.fillFields && selectedItemData) {
                  console.log('Applying fillFields:', field.fillFields);
                  Object.entries(field.fillFields).forEach(([targetField, sourceField]) => {
                    const fillValue = typeof sourceField === 'function'
                      ? sourceField(selectedItemData)
                      : selectedItemData[sourceField];
                    console.log(`Filling ${targetField} with`, fillValue);
                    updates[targetField] = fillValue;
                  });
                }
                
                // Aplikovat všechny změny najednou
                const newItems = items.map((item, i) => {
                  if (i !== itemIndex) return item;
                  return { ...item, ...updates };
                });
                onChange(newItems);
              }}
              returnFullItem={true}
            />
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex flex-col">
        {/* Header jen pro první řádek */}
        {itemIndex === 0 && (
          <Label className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
        )}

        {isComputed ? (
          // Computed field - readonly
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium">
            {displayValue}
          </div>
        ) : (
          // Editovatelné pole
          <TextInput
            type={getInputType(field.type)}
            value={value ?? ''}
            onChange={(e) => handleItemChange(itemIndex, field.key, parseValue(e.target.value, field.type))}
            placeholder={field.placeholder}
            disabled={field.disabled}
            sizing="sm"
          />
        )}
      </div>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-gray-900 dark:text-gray-100 font-medium">
          {label}
          {column.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        <Button
          type="button"
          size="xs"
          color="blue"
          onClick={handleAddItem}
          disabled={items.length >= maxItems}
        >
          <HiPlus className="mr-1 h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      {/* Tabulka položek */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            Zatím žádné položky. Klikněte na "{addButtonLabel}" pro přidání.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={`
                    grid gap-3 p-3 items-end
                    ${index > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}
                    ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}
                  `}
                  style={{
                    gridTemplateColumns: `repeat(${itemFields.length}, minmax(0, 1fr)) auto`,
                  }}
                >
                  {itemFields.map(field => renderItemField(item, index, field))}

                  {/* Delete button */}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="xs"
                      color="failure"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= minItems}
                      className="mb-0.5"
                    >
                      <HiTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Souhrn položek */}
      {column.showSummary && items.length > 0 && (
        <ArrayFieldSummary
          items={itemsWithComputed}
          summaryFields={column.summaryFields || []}
          itemFields={itemFields}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
    </div>
  );
};

// =====================================================
// SUMMARY KOMPONENTA
// =====================================================
const ArrayFieldSummary = ({ items, summaryFields, itemFields }) => {
  const summaries = useMemo(() => {
    return summaryFields.map(summary => {
      const { key, label, type = 'sum', field, format } = summary;

      let value = 0;

      switch (type) {
        case 'sum':
          value = items.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
          break;
        case 'count':
          value = items.length;
          break;
        case 'avg':
          value = items.length > 0
            ? items.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0) / items.length
            : 0;
          break;
        case 'custom':
          if (typeof summary.compute === 'function') {
            value = summary.compute(items);
          }
          break;
        default:
          break;
      }

      // Formátování
      const displayValue = format
        ? format(value)
        : formatNumber(value, itemFields.find(f => f.key === field)?.type);

      return { key, label, value: displayValue };
    });
  }, [items, summaryFields, itemFields]);

  if (summaries.length === 0) return null;

  return (
    <div className="flex justify-end gap-6 pt-3 border-t border-gray-200 dark:border-gray-700">
      {summaries.map(summary => (
        <div key={summary.key} className="text-right">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
            {summary.label}:
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {summary.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// =====================================================
// HELPER FUNKCE
// =====================================================
const getInputType = (fieldType) => {
  switch (fieldType) {
    case 'number':
    case 'currency':
    case 'percentage':
      return 'number';
    case 'email':
      return 'email';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
};

const parseValue = (value, fieldType) => {
  switch (fieldType) {
    case 'number':
    case 'currency':
    case 'percentage':
      return value === '' ? null : parseFloat(value);
    default:
      return value;
  }
};

const formatFieldValue = (value, field) => {
  if (value === null || value === undefined) return '-';

  switch (field.type) {
    case 'currency':
      return `${Number(value).toLocaleString('cs-CZ')} Kč`;
    case 'percentage':
      return `${value} %`;
    case 'number':
      return Number(value).toLocaleString('cs-CZ');
    default:
      return String(value);
  }
};

const formatNumber = (value, type) => {
  switch (type) {
    case 'currency':
      return `${Number(value).toLocaleString('cs-CZ')} Kč`;
    case 'percentage':
      return `${value.toFixed(2)} %`;
    default:
      return Number(value).toLocaleString('cs-CZ');
  }
};

export default ArrayField;