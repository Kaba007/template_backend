// src/components/Documents/DocumentPreview.jsx
import { Button, Modal, ModalBody, ModalHeader, Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import {
  HiDocument,
  HiDownload,
  HiExternalLink,
  HiTable,
  HiPresentationChartBar,
  HiZoomIn,
  HiZoomOut
} from 'react-icons/hi';
import { HiDocumentText } from 'react-icons/hi2';
import api from '../../api/client';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getPreviewType = (mimeType, filename) => {
  if (!mimeType) return 'download';
  
  const ext = filename?.split('.').pop()?.toLowerCase();
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  // Office dokumenty
  if (['doc', 'docx'].includes(ext) || mimeType.includes('msword') || mimeType.includes('wordprocessingml')) {
    return 'word';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return 'excel';
  }
  if (['ppt', 'pptx'].includes(ext) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return 'powerpoint';
  }
  
  return 'download';
};

// Ikona podle typu Office dokumentu
const getOfficeIcon = (type) => {
  switch (type) {
    case 'word': return HiDocumentText;
    case 'excel': return HiTable;
    case 'powerpoint': return HiPresentationChartBar;
    default: return HiDocument;
  }
};

// Barva podle typu Office dokumentu
const getOfficeColor = (type) => {
  switch (type) {
    case 'word': return 'text-blue-500';
    case 'excel': return 'text-green-500';
    case 'powerpoint': return 'text-orange-500';
    default: return 'text-gray-500';
  }
};

// Název typu dokumentu
const getOfficeTypeName = (type) => {
  switch (type) {
    case 'word': return 'Word dokument';
    case 'excel': return 'Excel tabulka';
    case 'powerpoint': return 'PowerPoint prezentace';
    default: return 'Dokument';
  }
};

export const DocumentPreview = ({
  open,
  document: doc,
  onClose,
  onDownload,
  // Nastav na true pokud máš veřejně dostupné API (ne localhost)
  useExternalViewer = false,
}) => {
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState(null);
  const [publicUrl, setPublicUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const previewType = doc ? getPreviewType(doc.mime_type, doc.original_filename) : 'download';
  const isOfficeType = ['word', 'excel', 'powerpoint'].includes(previewType);

  useEffect(() => {
    if (!open || !doc) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setPublicUrl(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setBlobUrl(null);
    setPublicUrl(null);

    // Pro Office dokumenty s externím viewerem
    if (isOfficeType && useExternalViewer) {
      api.get(`/api/v1/documents/${doc.id}/public-url`)
        .then((response) => {
          setPublicUrl(response.data.url);
        })
        .catch((err) => {
          console.error('Error getting public URL:', err);
          setError('Nepodařilo se načíst náhled');
        })
        .finally(() => {
          setLoading(false);
        });
    }
    // Pro obrázky, PDF, video, audio
    else if (['image', 'pdf', 'video', 'audio'].includes(previewType)) {
      api.get(`/api/v1/documents/${doc.id}/preview`, { responseType: 'blob' })
        .then((response) => {
          const objectUrl = URL.createObjectURL(response.data);
          setBlobUrl(objectUrl);
        })
        .catch((err) => {
          console.error('Error loading preview:', err);
          setError('Nepodařilo se načíst náhled');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [open, doc?.id, previewType, isOfficeType, useExternalViewer]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!open || !doc) return null;

  const filename = doc.original_filename || doc.filename;

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center">
          <Spinner size="xl" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <HiDocument className="h-16 w-16 text-red-400 mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button color="blue" onClick={() => onDownload?.(doc)}>
            <HiDownload className="mr-2 h-4 w-4" />
            Stáhnout soubor
          </Button>
        </div>
      );
    }

    switch (previewType) {
      case 'image':
        return (
          <div className="relative h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 overflow-auto">
            <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 dark:bg-gray-800/90 rounded-lg p-1 shadow">
              <Button size="xs" color="light" onClick={() => setZoom(z => Math.max(25, z - 25))}>
                <HiZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 py-1 text-xs font-medium">{zoom}%</span>
              <Button size="xs" color="light" onClick={() => setZoom(z => Math.min(200, z + 25))}>
                <HiZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            {blobUrl ? (
              <img
                src={blobUrl}
                alt={filename}
                style={{ transform: `scale(${zoom / 100})` }}
                className="max-w-full max-h-full object-contain transition-transform"
              />
            ) : (
              <p className="text-gray-500">Načítám obrázek...</p>
            )}
          </div>
        );

      case 'pdf':
        return blobUrl ? (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        ) : null;

      case 'video':
        return blobUrl ? (
          <div className="h-full flex items-center justify-center bg-black">
            <video src={blobUrl} controls className="max-w-full max-h-full" />
          </div>
        ) : null;

      case 'audio':
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <HiDocument className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-700 dark:text-gray-300 mb-4">{filename}</p>
            {blobUrl && <audio src={blobUrl} controls />}
          </div>
        );

      // Office dokumenty s externím viewerem
      case 'word':
      case 'excel':
      case 'powerpoint':
        if (useExternalViewer && publicUrl) {
          const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`;
          return (
            <iframe
              src={googleViewerUrl}
              className="w-full h-full border-0"
              title="Office Document Preview"
            />
          );
        }
        
        // Fallback - hezký placeholder pro Office dokumenty
        const OfficeIcon = getOfficeIcon(previewType);
        const colorClass = getOfficeColor(previewType);
        const typeName = getOfficeTypeName(previewType);
        
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-8 max-w-md">
              <OfficeIcon className={`h-20 w-20 mx-auto mb-4 ${colorClass}`} />
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {filename}
              </h3>
              
              <p className="text-gray-500 dark:text-gray-400 mb-1">
                {typeName}
              </p>
              
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                {formatFileSize(doc.file_size)}
              </p>
              
              <div className="flex flex-col gap-3">
                <Button color="blue" onClick={() => onDownload?.(doc)} className="w-full">
                  <HiDownload className="mr-2 h-5 w-5" />
                  Stáhnout soubor
                </Button>
                
                {publicUrl && (
                  <Button color="light" onClick={() => window.open(publicUrl, '_blank')} className="w-full">
                    <HiExternalLink className="mr-2 h-5 w-5" />
                    Otevřít v prohlížeči
                  </Button>
                )}
              </div>
              
              <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                Pro náhled Office dokumentů stáhněte soubor a otevřete v příslušné aplikaci.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <HiDocument className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filename}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Náhled tohoto typu souboru není podporován.
            </p>
            <Button color="blue" onClick={() => onDownload?.(doc)}>
              <HiDownload className="mr-2 h-4 w-4" />
              Stáhnout soubor
            </Button>
          </div>
        );
    }
  };

  return (
    <Modal show={open} onClose={onClose} size="7xl">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <span className="truncate">{filename}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
            {formatFileSize(doc.file_size)}
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="p-0">
        <div className="flex items-center justify-end gap-2 p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Button size="sm" color="light" onClick={() => onDownload?.(doc)}>
            <HiDownload className="mr-2 h-4 w-4" />
            Stáhnout
          </Button>
          {(blobUrl || publicUrl) && (
            <Button 
              size="sm" 
              color="light" 
              onClick={() => window.open(blobUrl || publicUrl, '_blank')}
            >
              <HiExternalLink className="mr-2 h-4 w-4" />
              Otevřít v novém okně
            </Button>
          )}
        </div>

        <div className="h-[70vh] bg-gray-100 dark:bg-gray-900">
          {renderPreview()}
        </div>
      </ModalBody>
    </Modal>
  );
};