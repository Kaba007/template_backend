import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react';
import { useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

export const DeleteModal = ({ open, item, onClose, onConfirm, endpoint }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const handleDelete = async () => {
    if (!endpoint || !item) return;

    setLoading(true);
    setError(null);

    try {
      await api.delete(`${endpoint}/${item.id}`);
      showToast('success', 'Záznam byl úspěšně smazán');
      onConfirm?.();
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Chyba při mazání';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={open} size="md" onClose={onClose}>
      <ModalHeader>Smazat položku</ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          <p className="text-center text-lg text-gray-500 dark:text-gray-400">
            Opravdu chcete smazat tuto položku?
          </p>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          color="failure"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? 'Mažu...' : 'Ano, smazat'}
        </Button>
        <Button
          color="gray"
          onClick={onClose}
          disabled={loading}
        >
          Zrušit
        </Button>
      </ModalFooter>
    </Modal>
  );
};
