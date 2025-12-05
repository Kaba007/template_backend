// src/components/Documents/DocumentModal.jsx
import { Modal, ModalBody, ModalHeader } from 'flowbite-react';
import { DocumentManager } from './DocumentManager';

/**
 * Modální okno pro správu dokumentů entity
 * Používá se z DataTable pro zobrazení/správu dokumentů konkrétního řádku
 */
export const DocumentModal = ({
  open,
  onClose,
  entityType,
  entityId,
  entityTitle,
  readOnly = false,
  onDocumentsChange,
}) => {
  if (!entityType || !entityId) return null;

  return (
    <Modal show={open} onClose={onClose} size="4xl">
      <ModalHeader>
        <div className="flex items-center gap-2">
          <span>Dokumenty</span>
          {entityTitle && (
            <span className="text-gray-500 dark:text-gray-400 font-normal">
              — {entityTitle}
            </span>
          )}
        </div>
      </ModalHeader>

      <ModalBody>
        <DocumentManager
          entityType={entityType}
          entityId={entityId}
          readOnly={readOnly}
          onDocumentsChange={() => {
            onDocumentsChange?.();
          }}
        />
      </ModalBody>
    </Modal>
  );
};
