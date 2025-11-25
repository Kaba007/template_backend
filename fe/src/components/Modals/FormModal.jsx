import { Modal, ModalBody, ModalHeader } from 'flowbite-react';
import { useEffect, useState } from 'react';
import api from '../../api/client';
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
        columns.forEach(col => {
          if (col.defaultValue !== undefined) {
            emptyData[col.key] = col.defaultValue;
          }
        });
        setFormData(emptyData);
      }
      setError(null);
    }
  }, [open, isEdit, item, columns]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      if (isEdit && item && item.id) {
        await api.put(`${endpoints.update}/${item.id}`, data);
      } else {
        await api.post(endpoints.create, data);
      }
      onSubmit?.(data);
      onClose();
    } catch (err) {
      console.error('Form submit error:', err);
      setError(err.response?.data?.message || err.message || 'Chyba při ukládání');
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
