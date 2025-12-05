// src/components/Documents/DocumentPreview.jsx
import { Badge, Button, Modal, ModalBody, ModalHeader, Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import {
    HiArrowLeft,
    HiArrowRight,
    HiDocument,
    HiDocumentText,
    HiDownload,
    HiExternalLink,
    HiZoomIn,
    HiZoomOut
} from 'react-icons/hi';

// Formátování velikosti souboru
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Určení typu souboru pro preview
const getPreviewType = (mimeType, filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();

  // Obrázky - nativní podpora
  if (mimeType?.startsWith('image/')) {
    return 'image';
  }

  // PDF - nativní podpora
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }

  // MS Office - použijeme Office Online Viewer
  if (['doc', 'docx'].includes(ext) ||
      mimeType?.includes('msword') ||
      mimeType?.includes('wordprocessingml')) {
    return 'office';
  }

  if (['xls', 'xlsx'].includes(ext) ||
      mimeType?.includes('spreadsheet') ||
      mimeType?.includes('excel')) {
    return 'office';
  }

  if (['ppt', 'pptx'].includes(ext) ||
      mimeType?.includes('presentation') ||
      mimeType?.includes('powerpoint')) {
    return 'office';
  }

  // HTML
  if (mimeType === 'text/html' || ext === 'html' || ext === 'htm') {
    return 'html';
  }

  // Text soubory
  if (mimeType?.startsWith('text/') ||
      ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) {
    return 'text';
  }

  // Video
  if (mimeType?.startsWith('video/')) {
    return 'video';
  }

  // Audio
  if (mimeType?.startsWith('audio/')) {
    return 'audio';
  }

  return 'unsupported';
};

// Komponenta pro náhled obrázku
const ImagePreview = ({ url, filename }) => {
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative flex flex-col h-full">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 dark:bg-gray-800/90 rounded-lg p-1 shadow">
        <Button size="xs" color="light" onClick={() => setZoom(z => Math.max(25, z - 25))}>
          <HiZoomOut className="h-4 w-4" />
        </Button>
        <span className="px-2 py-1 text-xs font-medium">{zoom}%</span>
        <Button size="xs" color="light" onClick={() => setZoom(z => Math.min(200, z + 25))}>
          <HiZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Image container */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="xl" />
          </div>
        )}
        <img
          src={url}
          alt={filename}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
          className="max-w-full max-h-full object-contain transition-transform"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
};

// Komponenta pro náhled PDF
const PdfPreview = ({ url }) => {
  return (
    <iframe
      src={url}
      className="w-full h-full border-0"
      title="PDF Preview"
    />
  );
};

// Komponenta pro náhled Office dokumentů
const OfficePreview = ({ url, filename }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <HiDocumentText className="h-16 w-16 text-gray-400 mb-4" />

      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {filename}
      </h3>

      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        Pro náhled MS Office dokumentů stáhněte soubor a otevřete ho v příslušné aplikaci,
        nebo použijte tlačítko níže pro otevření v Office Online.
      </p>

      <div className="flex gap-3">
        <Button color="blue" onClick={() => window.open(url, '_blank')}>
          <HiDownload className="mr-2 h-4 w-4" />
          Stáhnout
        </Button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
        <strong>Tip:</strong> Pro plnou podporu náhledů Office dokumentů
        můžete integrovat OnlyOffice nebo LibreOffice Online.
      </div>
    </div>
  );
};

// Komponenta pro náhled textu
const TextPreview = ({ url, filename }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError('Nepodařilo se načíst obsah souboru');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  return (
    <pre className="w-full h-full overflow-auto p-4 bg-gray-50 dark:bg-gray-900 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
      {content}
    </pre>
  );
};

// Komponenta pro náhled HTML
const HtmlPreview = ({ url }) => {
  return (
    <iframe
      src={url}
      className="w-full h-full border-0 bg-white"
      title="HTML Preview"
      sandbox="allow-same-origin"
    />
  );
};

// Komponenta pro video
const VideoPreview = ({ url, mimeType }) => {
  return (
    <div className="flex items-center justify-center h-full bg-black p-4">
      <video
        src={url}
        controls
        className="max-w-full max-h-full"
      >
        Váš prohlížeč nepodporuje přehrávání videa.
      </video>
    </div>
  );
};

// Komponenta pro audio
const AudioPreview = ({ url, filename }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <HiDocument className="h-16 w-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {filename}
      </h3>
      <audio src={url} controls className="w-full max-w-md">
        Váš prohlížeč nepodporuje přehrávání zvuku.
      </audio>
    </div>
  );
};

// Komponenta pro nepodporované typy
const UnsupportedPreview = ({ filename, mimeType, onDownload }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <HiDocument className="h-16 w-16 text-gray-400 mb-4" />

      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {filename}
      </h3>

      <Badge color="gray" className="mb-4">
        {mimeType || 'Neznámý typ'}
      </Badge>

      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Náhled tohoto typu souboru není podporován.
        Stáhněte si soubor pro jeho zobrazení.
      </p>

      <Button color="blue" onClick={onDownload}>
        <HiDownload className="mr-2 h-4 w-4" />
        Stáhnout soubor
      </Button>
    </div>
  );
};

// Hlavní komponenta
export const DocumentPreview = ({
  open,
  document,
  documents = [],
  currentIndex = 0,
  onClose,
  onDownload,
  onNavigate,
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Načtení URL pro preview
  useEffect(() => {
    if (open && document) {
      setLoading(true);
      // Používáme preview endpoint
      const url = `/api/v1/documents/${document.id}/preview`;
      setPreviewUrl(url);
      setLoading(false);
    } else {
      setPreviewUrl(null);
    }
  }, [open, document]);

  if (!document) return null;

  const previewType = getPreviewType(document.mime_type, document.original_filename || document.filename);
  const hasNavigation = documents.length > 1;

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner size="xl" />
        </div>
      );
    }

    if (!previewUrl) return null;

    switch (previewType) {
      case 'image':
        return <ImagePreview url={previewUrl} filename={document.original_filename} />;
      case 'pdf':
        return <PdfPreview url={previewUrl} />;
      case 'office':
        return <OfficePreview url={previewUrl} filename={document.original_filename} />;
      case 'text':
        return <TextPreview url={previewUrl} filename={document.original_filename} />;
      case 'html':
        return <HtmlPreview url={previewUrl} />;
      case 'video':
        return <VideoPreview url={previewUrl} mimeType={document.mime_type} />;
      case 'audio':
        return <AudioPreview url={previewUrl} filename={document.original_filename} />;
      default:
        return (
          <UnsupportedPreview
            filename={document.original_filename}
            mimeType={document.mime_type}
            onDownload={() => onDownload?.(document)}
          />
        );
    }
  };

  return (
    <Modal show={open} onClose={onClose} size="7xl">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <span className="truncate">{document.original_filename || document.filename}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
            {formatFileSize(document.file_size)} • {document.mime_type}
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="p-0">
        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Button size="sm" color="light" onClick={() => onDownload?.(document)}>
            <HiDownload className="mr-2 h-4 w-4" />
            Stáhnout
          </Button>

          <Button size="sm" color="light" onClick={() => window.open(previewUrl, '_blank')}>
            <HiExternalLink className="mr-2 h-4 w-4" />
            Otevřít v novém okně
          </Button>
        </div>

        {/* Preview Area */}
        <div className="relative h-[70vh] bg-gray-100 dark:bg-gray-900">
          {renderPreview()}

          {/* Navigation arrows */}
          {hasNavigation && (
            <>
              <button
                onClick={() => onNavigate?.(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiArrowLeft className="h-6 w-6" />
              </button>

              <button
                onClick={() => onNavigate?.(currentIndex + 1)}
                disabled={currentIndex === documents.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiArrowRight className="h-6 w-6" />
              </button>

              {/* Page indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/90 dark:bg-gray-800/90 rounded-full text-sm">
                {currentIndex + 1} / {documents.length}
              </div>
            </>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};
