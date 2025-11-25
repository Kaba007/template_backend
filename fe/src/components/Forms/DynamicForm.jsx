import { Button } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { FormField } from './FormField';

export const DynamicForm = ({
  columns,
  initialValues = {},
  onSubmit,
  loading,
  onCancel,
}) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});

  // Aktualizovat formData když se změní initialValues (např. při přepnutí z create na edit)
  useEffect(() => {
    setFormData(initialValues);
    setErrors({});
  }, [initialValues]);

  // Filtrovat pouze editovatelné sloupce
  const editableColumns = columns.filter(col => col.editable !== false);

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));

    // Vymazat error pro toto pole
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    editableColumns.forEach(column => {
      // Required validace
      if (column.required && !formData[column.key]) {
        newErrors[column.key] = `${column.label} je povinné`;
      }

      // Custom validace
      if (column.validate && formData[column.key]) {
        const error = column.validate(formData[column.key], formData);
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
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {editableColumns.map((column) => (
          <FormField
            key={column.key}
            column={column}
            value={formData[column.key]}
            onChange={(value) => handleChange(column.key, value)}
            error={errors[column.key]}
          />
        ))}
      </div>

      <div className="flex gap-4 mt-6">
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
