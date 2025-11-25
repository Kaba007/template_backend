import { Modal, ModalBody, ModalHeader } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { DynamicForm } from '../Forms/DynamicForm';

export const FormModal = ({
  open,
  item,
  mode,
  columns,
  onClose,
  onSubmit,
  endpoints,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const isEdit = mode === 'edit';
  const title = isEdit ? 'Upravit záznam' : 'Přidat nový záznam';

  // Předvyplnit data při otevření modálu
  useEffect(() => {
    if (open) {
      if (isEdit && item) {
        // V režimu editace předvyplníme existující data
        setFormData(item);
      } else {
        // V režimu vytváření resetujeme na prázdné hodnoty
        const emptyData = {};

        // Nejdřív aplikujeme defaultní hodnoty ze sloupců
        columns.forEach(col => {
          if (col.defaultValue !== undefined) {
            emptyData[col.key] = col.defaultValue;
          }
        });

        // DYNAMICKÉ PŘEDVYPLNĚNÍ Z URL QUERY PARAMETRŮ
        // Projdeme všechny query parametry a pokud odpovídají nějakému sloupci, předvyplníme ho
        searchParams.forEach((value, key) => {
          // Najdeme sloupec, který odpovídá query parametru
          const column = columns.find(col => col.key === key);

          if (column) {
            // Konverze hodnoty podle typu sloupce
            switch (column.type) {
              case 'number':
              case 'currency':
              case 'percentage':
                emptyData[key] = parseFloat(value) || value;
                break;
              case 'boolean':
                emptyData[key] = value === 'true' || value === '1';
                break;
              case 'date':
              case 'datetime':
              case 'datetime-local':
                emptyData[key] = value;
                break;
              default:
                emptyData[key] = value;
            }
          }
        });

        setFormData(emptyData);
      }
      setError(null);
    }
  }, [open, isEdit, item, columns, searchParams]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      if (isEdit && item && item.id) {
        await api.put(`${endpoints.update}/${item.id}`, data);
        showToast('success', 'Záznam byl úspěšně upraven');
      } else {
        await api.post(endpoints.create, data);
        showToast('success', 'Záznam byl úspěšně vytvořen');
      }
      onSubmit?.(data);
      onClose();
    } catch (err) {
      console.error('Form submit error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Chyba při ukládání';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={open} size="2xl" onClose={onClose}>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <DynamicForm
          columns={columns}
          initialValues={formData}
          onSubmit={handleSubmit}
          loading={loading}
          onCancel={onClose}
        />
      </ModalBody>
    </Modal>
  );
};
