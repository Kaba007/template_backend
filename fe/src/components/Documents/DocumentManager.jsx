// src/components/Documents/DocumentManager.jsx
import { Badge, Button, Card, Modal, ModalBody, ModalFooter, ModalHeader, Spinner, Tooltip } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import {
    HiDocument,
    HiDocumentText,
    HiDownload,
    HiEye,
    HiOutlinePhotograph,
    HiPaperClip,
    HiPlus,
    HiTrash,
    HiUpload
} from 'react-icons/hi';
import api from '../../api/client';
import { DocumentPreview } from './DocumentPreview';
import { DocumentUploadZone } from './DocumentUploadZone';

// Ikony podle typu souboru
const getFileIcon = (mimeType, filename) => {
  if (!mimeType && !filename) return HiDocument;

  const ext = filename?.split('.').pop()?.toLowerCase();

  if (mimeType?.startsWith('image/')) return HiOutlinePhotograph;
  if (mimeType === 'application/pdf') return HiDocumentText;
  if (ext === 'doc' || ext === 'docx') return HiDocumentText;
  if (ext === 'xls' || ext === 'xlsx') return HiDocumentText;
  if (ext === 'ppt' || ext === 'pptx') return HiDocumentText;

  return HiDocument;
};

// Formátování velikosti souboru
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Barvy podle typu souboru
const getFileColor = (mimeType, filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();

  if (mimeType?.startsWith('image/')) return 'purple';
  if (mimeType === 'application/pdf') return 'red';
  if (ext === 'doc' || ext === 'docx') return 'blue';
  if (ext === 'xls' || ext === 'xlsx') return 'green';
  if (ext === 'ppt' || ext === 'pptx') return 'orange';

  return 'gray';
};

export const DocumentManager = ({
  entityType,
  entityId,
  onDocumentsChange,
  readOnly = false,
  compact = false,
  maxFiles = 20,
  acceptedTypes = '*',
  showPreview = true,
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Modal states
  const [previewModal, setPreviewModal] = useState({ open: false, document: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, document: null });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Načtení dokumentů
  const fetchDocuments = useCallback(async () => {
    if (!entityType || !entityId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/api/v1/documents/${entityType}/${entityId}`);
      setDocuments(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Nepodařilo se načíst dokumenty');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload souboru
  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let uploadedCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        await api.post(
          `/api/v1/documents/${entityType}/${entityId}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const fileProgress = (progressEvent.loaded / progressEvent.total) * 100;
              const totalProgress = ((uploadedCount / totalFiles) * 100) + (fileProgress / totalFiles);
              setUploadProgress(Math.round(totalProgress));
            },
          }
        );

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        setError(`Chyba při nahrávání: ${file.name}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadModalOpen(false);
    await fetchDocuments();
    onDocumentsChange?.();
  };

  // Smazání dokumentu
  const handleDelete = async () => {
    if (!deleteModal.document) return;

    try {
      await api.delete(`/api/v1/documents/${deleteModal.document.id}`);
      setDeleteModal({ open: false, document: null });
      await fetchDocuments();
      onDocumentsChange?.();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Nepodařilo se smazat dokument');
    }
  };

  // Stažení dokumentu
  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/api/v1/documents/${doc.id}/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: doc.mime_type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_filename || doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Nepodařilo se stáhnout dokument');
    }
  };

  // Náhled dokumentu
  const handlePreview = (doc) => {
    setPreviewModal({ open: true, document: doc });
  };

  // Kompaktní zobrazení - jen ikony
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <>
            {documents.map((doc) => {
              const FileIcon = getFileIcon(doc.mime_type, doc.original_filename);
              return (
                <Tooltip key={doc.id} content={doc.original_filename}>
                  <button
                    onClick={() => handlePreview(doc)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                  >
                    <FileIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </Tooltip>
              );
            })}

            {!readOnly && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 transition-colors"
              >
                <HiPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button>
            )}
          </>
        )}

        {/* Upload Modal */}
        <Modal show={uploadModalOpen} onClose={() => setUploadModalOpen(false)} size="xl">
          <ModalHeader>Nahrát dokumenty</ModalHeader>
          <ModalBody>
            <DocumentUploadZone
              onUpload={handleUpload}
              uploading={uploading}
              progress={uploadProgress}
              acceptedTypes={acceptedTypes}
              maxFiles={maxFiles}
            />
          </ModalBody>
        </Modal>

        {/* Preview Modal */}
        <DocumentPreview
          open={previewModal.open}
          document={previewModal.document}
          onClose={() => setPreviewModal({ open: false, document: null })}
          onDownload={handleDownload}
        />
      </div>
    );
  }

  // Plné zobrazení
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HiPaperClip className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-900 dark:text-white">
            Dokumenty
          </span>
          {documents.length > 0 && (
            <Badge color="gray" size="sm">
              {documents.length}
            </Badge>
          )}
        </div>

        {!readOnly && (
          <Button size="sm" color="blue" onClick={() => setUploadModalOpen(true)}>
            <HiUpload className="mr-2 h-4 w-4" />
            Nahrát
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Zavřít
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : documents.length === 0 ? (
        /* Empty state */
        <Card className="text-center py-8">
          <HiDocument className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Žádné dokumenty
          </p>
          {!readOnly && (
            <Button
              size="sm"
              color="light"
              className="mt-4"
              onClick={() => setUploadModalOpen(true)}
            >
              <HiPlus className="mr-2 h-4 w-4" />
              Přidat první dokument
            </Button>
          )}
        </Card>
      ) : (
        /* Document list */
        <div className="space-y-2">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.mime_type, doc.original_filename);
            const color = getFileColor(doc.mime_type, doc.original_filename);

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                {/* Icon */}
                <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                  <FileIcon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {doc.original_filename || doc.filename}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(doc.file_size)}</span>
                    {doc.uploaded_at && (
                      <>
                        <span>•</span>
                        <span>
                          {new Date(doc.uploaded_at).toLocaleDateString('cs-CZ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {showPreview && (
                    <Tooltip content="Náhled">
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => handlePreview(doc)}
                      >
                        <HiEye className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  )}

                  <Tooltip content="Stáhnout">
                    <Button
                      size="xs"
                      color="light"
                      onClick={() => handleDownload(doc)}
                    >
                      <HiDownload className="h-4 w-4" />
                    </Button>
                  </Tooltip>

                  {!readOnly && (
                    <Tooltip content="Smazat">
                      <Button
                        size="xs"
                        color="failure"
                        onClick={() => setDeleteModal({ open: true, document: doc })}
                      >
                        <HiTrash className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal show={uploadModalOpen} onClose={() => setUploadModalOpen(false)} size="xl">
        <ModalHeader>Nahrát dokumenty</ModalHeader>
        <ModalBody>
          <DocumentUploadZone
            onUpload={handleUpload}
            uploading={uploading}
            progress={uploadProgress}
            acceptedTypes={acceptedTypes}
            maxFiles={maxFiles}
          />
        </ModalBody>
      </Modal>

      {/* Preview Modal */}
      <DocumentPreview
        open={previewModal.open}
        document={previewModal.document}
        onClose={() => setPreviewModal({ open: false, document: null })}
        onDownload={handleDownload}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        show={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, document: null })}
        size="md"
      >
        <ModalHeader>Smazat dokument</ModalHeader>
        <ModalBody>
          <p className="text-gray-700 dark:text-gray-300">
            Opravdu chcete smazat dokument{' '}
            <strong>{deleteModal.document?.original_filename}</strong>?
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Tato akce je nevratná.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="failure"
            onClick={handleDelete}
          >
            <HiTrash className="mr-2 h-4 w-4" />
            Smazat
          </Button>
          <Button
            color="light"
            onClick={() => setDeleteModal({ open: false, document: null })}
          >
            Zrušit
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
