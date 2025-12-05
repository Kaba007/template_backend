// src/components/Documents/DocumentColumnRenderer.jsx
import { Badge, Tooltip } from 'flowbite-react';
import { useEffect, useState } from 'react';
import {
    HiDocument,
    HiDocumentText,
    HiOutlinePhotograph,
    HiPaperClip,
} from 'react-icons/hi';
import api from '../../api/client';

// Ikony podle typu souboru
const getFileIcon = (mimeType, filename) => {
  if (!mimeType && !filename) return HiDocument;

  const ext = filename?.split('.').pop()?.toLowerCase();

  if (mimeType?.startsWith('image/')) return HiOutlinePhotograph;
  if (mimeType === 'application/pdf') return HiDocumentText;
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return HiDocumentText;

  return HiDocument;
};

/**
 * Komponenta pro zobrazení počtu dokumentů jako badge v tabulce
 * Použití v DataTableCell když column.type === 'documents'
 */
export const DocumentColumnRenderer = ({
  entityType,
  entityId,
  onClick,
}) => {
  const [count, setCount] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      if (!entityType || !entityId) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/v1/documents/${entityType}/${entityId}`);
        const docs = response.data || [];
        setDocuments(docs);
        setCount(docs.length);
      } catch (err) {
        console.error('Error fetching document count:', err);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [entityType, entityId]);

  if (loading) {
    return (
      <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    );
  }

  if (count === 0) {
    return (
      <button
        onClick={onClick}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <HiPaperClip className="h-5 w-5" />
      </button>
    );
  }

  // Zobrazit první 3 dokumenty jako ikony
  const visibleDocs = documents.slice(0, 3);
  const remainingCount = documents.length - 3;

  return (
    <Tooltip
      content={
        <div className="text-sm">
          {documents.map(doc => (
            <div key={doc.id} className="py-0.5">
              {doc.original_filename || doc.filename}
            </div>
          ))}
        </div>
      }
    >
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 transition-colors"
      >
        {visibleDocs.map(doc => {
          const FileIcon = getFileIcon(doc.mime_type, doc.original_filename);
          return (
            <FileIcon key={doc.id} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          );
        })}

        {remainingCount > 0 && (
          <Badge color="blue" size="xs">
            +{remainingCount}
          </Badge>
        )}

        {visibleDocs.length === 0 && (
          <>
            <HiPaperClip className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">{count}</span>
          </>
        )}
      </button>
    </Tooltip>
  );
};
