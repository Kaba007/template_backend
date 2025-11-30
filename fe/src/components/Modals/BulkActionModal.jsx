import { Button, Modal, ModalBody, ModalHeader } from 'flowbite-react';
import { useState } from 'react';
import { HiExclamation } from 'react-icons/hi';
import api from '../../api/client';

export const BulkActionModal = ({
  open,
  action,
  selectedItems,
  onClose,
  onConfirm,
  endpoint,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getActionText = () => {
    switch (action) {
      case 'delete':
        return {
          title: 'Smazat vybrané položky?',
          description: `Opravdu chcete smazat ${selectedItems.length} položek?`,
          button: 'Ano, smazat vše',
        };
      default:
        return {
          title: 'Potvrdit akci?',
          description: `Opravdu chcete provést akci na ${selectedItems.length} položkách?`,
          button: 'Potvrdit',
        };
    }
  };

  const handleBulkAction = async () => {
    if (!endpoint || !selectedItems.length) return;

    setLoading(true);
    setError(null);

    try {
      await api.post(endpoint, {
        ids: selectedItems,
        action: action,
      });
      onConfirm?.();
      onClose();
    } catch (err) {
      console.error('Bulk action error:', err);
      setError(err.response?.data?.message || err.message || 'Chyba při provádění akce');
    } finally {
      setLoading(false);
    }
  };

  const text = getActionText();

  return (
    <Modal show={open} size="md" onClose={onClose} popup>
      <ModalHeader />
      <ModalBody>
        <div className="text-center">
          <HiExclamation className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
          <h3 className="mb-2 text-lg font-normal text-gray-500 dark:text-gray-400">
            {text.title}
          </h3>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            {text.description}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              color="failure"
              onClick={handleBulkAction}
              disabled={loading}
            >
              {loading ? 'Zpracovávám...' : text.button}
            </Button>
            <Button
              color="gray"
              onClick={onClose}
              disabled={loading}
            >
              Zrušit
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};
