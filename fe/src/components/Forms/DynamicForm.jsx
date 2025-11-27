import { Button } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrayField } from './ArrayField';
import { FormField } from './FormField';
import { FormSection } from './FormSection';

export const DynamicForm = ({
  columns,
  initialValues = {},
  onSubmit,
  loading,
  onCancel,
  // NOVÉ: Callback při změně dat (pro live preview faktury apod.)
  onFormDataChange,
  // NOVÉ: Konfigurace sekcí pro accordion layout
  formSections,
}) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});

  // Aktualizovat formData když se změní initialValues
  useEffect(() => {
    setFormData(initialValues);
    setErrors({});
  }, [initialValues]);

  // Filtrovat pouze editovatelné sloupce (computed fields jsou readonly)
  const editableColumns = columns.filter(col => col.editable !== false && !col.computed);

  // Všechny sloupce pro renderování (včetně computed)
  const allColumns = columns.filter(col => col.showInForm !== false);

  // =====================================================
  // COMPUTED VALUES - Přepočet všech computed polí
  // =====================================================
  const computedValues = useMemo(() => {
    const computed = {};

    columns.forEach(column => {
      if (column.computed && typeof column.computed === 'function') {
        try {
          computed[column.key] = column.computed(formData);
        } catch (err) {
          console.error(`Error computing ${column.key}:`, err);
          computed[column.key] = null;
        }
      }
    });

    return computed;
  }, [formData, columns]);

  // Merged data = formData + computed values
  const mergedData = useMemo(() => ({
    ...formData,
    ...computedValues,
  }), [formData, computedValues]);

  // Notifikovat parent o změně dat
  useEffect(() => {
    onFormDataChange?.(mergedData);
  }, [mergedData, onFormDataChange]);

  // =====================================================
  // SESKUPENÍ POLÍ DO SEKCÍ
  // =====================================================
  const groupedColumns = useMemo(() => {
    // Pokud nejsou definovány sekce, vrátíme null (použije se původní layout)
    if (!formSections || formSections.length === 0) {
      return null;
    }

    // Vytvořit mapu sekcí - kopírujeme originál a přidáme pole pro fieldy
    const sectionsMap = new Map();
    formSections.forEach(section => {
      sectionsMap.set(section.key, {
        ...section,
        // Použijeme _fields pro pole ve formuláři, aby se nepřepsalo columns (počet sloupců)
        _fields: [],
      });
    });

    // Přidat sekci "other" pro pole bez definované sekce
    sectionsMap.set('_other', {
      key: '_other',
      label: 'Ostatní',
      icon: '📋',
      columns: 2, // počet sloupců layoutu
      defaultOpen: true,
      _fields: [],
    });

    // Rozdělit sloupce do sekcí
    allColumns.forEach(column => {
      const sectionKey = column.formSection || '_other';
      const section = sectionsMap.get(sectionKey);

      if (section) {
        section._fields.push(column);
      } else {
        // Neznámá sekce - dát do "other"
        sectionsMap.get('_other')._fields.push(column);
      }
    });

    // Převést na pole a odfiltrovat prázdné sekce
    return Array.from(sectionsMap.values()).filter(
      section => section._fields && section._fields.length > 0
    );
  }, [allColumns, formSections]);

  // =====================================================
  // FILL FIELDS - Automatické vyplnění polí z vybraného záznamu
  // =====================================================
  const handleFieldChange = useCallback((key, value, selectedItemData = null) => {
    setFormData(prev => {
      const newData = { ...prev, [key]: value };

      // Najdi sloupec pro tento klíč
      const column = columns.find(col => col.key === key);

      // Pokud má sloupec fillFields a máme data vybraného itemu
      if (column?.fillFields && selectedItemData) {
        Object.entries(column.fillFields).forEach(([targetField, sourceField]) => {
          // sourceField může být string nebo funkce
          if (typeof sourceField === 'function') {
            newData[targetField] = sourceField(selectedItemData);
          } else {
            newData[targetField] = selectedItemData[sourceField];
          }
        });
      }

      return newData;
    });

    // Vymazat error pro toto pole
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [columns, errors]);

  // =====================================================
  // ARRAY FIELD HANDLER
  // =====================================================
  const handleArrayChange = useCallback((key, items) => {
    setFormData(prev => ({
      ...prev,
      [key]: items,
    }));
  }, []);

  // =====================================================
  // VALIDATION
  // =====================================================
  const validate = () => {
    const newErrors = {};

    editableColumns.forEach(column => {
      const value = formData[column.key];

      // Required validace
      if (column.required) {
        if (column.type === 'array') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            newErrors[column.key] = `${column.label} musí obsahovat alespoň jednu položku`;
          }
        } else if (value === undefined || value === null || value === '') {
          newErrors[column.key] = `${column.label} je povinné`;
        }
      }

      // Custom validace
      if (column.validate && value) {
        const error = column.validate(value, formData);
        if (error) {
          newErrors[column.key] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validate()) {
      // Odeslat merged data (včetně computed values)
      onSubmit(mergedData);
    }
  };

  // =====================================================
  // RENDER FIELD
  // =====================================================
  const renderField = (column) => {
    // Určení šířky pole (pro grid)
    const widthClass = getFieldWidthClass(column);

    // Array field - speciální komponenta
    if (column.type === 'array') {
      return (
        <div key={column.key} className={widthClass || 'col-span-full'}>
          <ArrayField
            column={column}
            items={formData[column.key] || []}
            onChange={(items) => handleArrayChange(column.key, items)}
            error={errors[column.key]}
            formData={formData}
          />
        </div>
      );
    }

    // Computed field - readonly zobrazení
    if (column.computed) {
      return (
        <div key={column.key} className={widthClass}>
          <FormField
            column={{ ...column, disabled: true }}
            value={computedValues[column.key]}
            onChange={() => {}} // Computed fields nelze měnit
            error={errors[column.key]}
            isComputed
          />
        </div>
      );
    }

    // Standardní field
    return (
      <div key={column.key} className={widthClass}>
        <FormField
          column={column}
          value={formData[column.key]}
          onChange={(value, selectedItemData) => handleFieldChange(column.key, value, selectedItemData)}
          error={errors[column.key]}
          formData={formData}
        />
      </div>
    );
  };

  // =====================================================
  // RENDER SEKCE (accordion layout)
  // =====================================================
  const renderSections = () => {
    return (
      <div className="space-y-4">
        {groupedColumns.map((section) => {
          // Zjistit, zda sekce obsahuje chybu
          const sectionHasError = section._fields.some(col => errors[col.key]);

          return (
            <FormSection
              key={section.key}
              section={section}
              hasError={sectionHasError}
              defaultOpen={section.defaultOpen ?? true}
            >
              {section._fields.map(renderField)}
            </FormSection>
          );
        })}
      </div>
    );
  };

  // =====================================================
  // RENDER KLASICKÝ LAYOUT (bez sekcí - zpětná kompatibilita)
  // =====================================================
  const renderClassicLayout = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allColumns.map(renderField)}
      </div>
    );
  };

  // =====================================================
  // HLAVNÍ RENDER
  // =====================================================
  return (
    <form onSubmit={handleSubmit}>
      {/* Použít sekce pokud jsou definovány, jinak klasický layout */}
      {groupedColumns ? renderSections() : renderClassicLayout()}

      <div className="flex gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="submit"
          color="blue"
          disabled={loading}
        >
          {loading ? 'Ukládám...' : 'Uložit'}
        </Button>
        <Button
          type="button"
          color="gray"
          onClick={onCancel}
          disabled={loading}
        >
          Zrušit
        </Button>
      </div>
    </form>
  );
};

// =====================================================
// HELPER: Určení CSS třídy pro šířku pole
// =====================================================
const getFieldWidthClass = (column) => {
  // Explicitně definovaná šířka
  if (column.formWidth) {
    const widthMap = {
      1: '',  // default, 1 sloupec
      2: 'md:col-span-2',
      3: 'md:col-span-3',
      4: 'col-span-full',
      'full': 'col-span-full',
      'half': '',
      'third': '',
      'quarter': '',
    };
    return widthMap[column.formWidth] || '';
  }

  // Automatická šířka podle typu
  if (column.type === 'textarea') {
    return 'col-span-full';
  }
  if (column.type === 'array') {
    return 'col-span-full';
  }

  return ''; // default - 1 sloupec v gridu
};
