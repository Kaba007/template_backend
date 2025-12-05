// src/components/Documents/DocumentUploadZone.jsx
import { Progress } from 'flowbite-react';
import { useCallback, useState } from 'react';
import { HiCloudUpload, HiDocument, HiX } from 'react-icons/hi';

// Formátování velikosti souboru
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DocumentUploadZone = ({
  onUpload,
  uploading = false,
  progress = 0,
  acceptedTypes = '*',
  maxFiles = 20,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  // Validace souborů
  const validateFiles = useCallback((files) => {
    const validFiles = [];
    const fileErrors = [];

    Array.from(files).forEach((file) => {
      // Kontrola velikosti
      if (file.size > maxFileSize) {
        fileErrors.push(`${file.name}: Soubor je příliš velký (max ${formatFileSize(maxFileSize)})`);
        return;
      }

      // Kontrola typu (pokud je specifikován)
      if (acceptedTypes !== '*') {
        const types = acceptedTypes.split(',').map(t => t.trim());
        const isValid = types.some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', '/'));
          }
          return file.type === type;
        });

        if (!isValid) {
          fileErrors.push(`${file.name}: Nepodporovaný typ souboru`);
          return;
        }
      }

      validFiles.push(file);
    });

    // Kontrola max počtu
    if (selectedFiles.length + validFiles.length > maxFiles) {
      fileErrors.push(`Maximální počet souborů je ${maxFiles}`);
      validFiles.splice(maxFiles - selectedFiles.length);
    }

    return { validFiles, fileErrors };
  }, [acceptedTypes, maxFileSize, maxFiles, selectedFiles.length]);

  // Drag & Drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const { validFiles, fileErrors } = validateFiles(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setErrors(fileErrors);
    }
  }, [validateFiles]);

  // File input change
  const handleChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      const { validFiles, fileErrors } = validateFiles(e.target.files);
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setErrors(fileErrors);
    }
  }, [validateFiles]);

  // Odebrání souboru ze seznamu
  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Upload
  const handleUpload = useCallback(() => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
      setErrors([]);
    }
  }, [selectedFiles, onUpload]);

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8
          transition-all duration-200 ease-in-out
          ${dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        <div className="text-center">
          <HiCloudUpload className={`
            mx-auto h-12 w-12
            ${dragActive ? 'text-blue-500' : 'text-gray-400'}
          `} />

          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {dragActive ? 'Pusťte soubory zde' : 'Přetáhněte soubory sem'}
          </p>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            nebo klikněte pro výběr souborů
          </p>

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Max. {maxFiles} souborů, každý max. {formatFileSize(maxFileSize)}
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700 dark:text-red-400">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Vybrané soubory ({selectedFiles.length})
          </h4>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <HiDocument className="h-5 w-5 text-gray-400" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  disabled={uploading}
                >
                  <HiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">Nahrávání...</span>
            <span className="font-medium text-blue-600">{progress}%</span>
          </div>
          <Progress progress={progress} color="blue" />
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <HiCloudUpload className="h-5 w-5" />
          Nahrát {selectedFiles.length} {selectedFiles.length === 1 ? 'soubor' : 'soubory'}
        </button>
      )}
    </div>
  );
};
