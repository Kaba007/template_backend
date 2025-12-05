// src/components/Documents/useDocuments.js
import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';

/**
 * Hook pro práci s dokumenty entity
 *
 * @param {string} entityType - Typ entity (deal, invoice, lead, user, ...)
 * @param {number|string} entityId - ID entity
 * @returns {Object} - Stav a funkce pro práci s dokumenty
 */
export const useDocuments = (entityType, entityId) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Načtení dokumentů
  const fetchDocuments = useCallback(async () => {
    if (!entityType || !entityId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/v1/documents/${entityType}/${entityId}`);
      setDocuments(response.data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.response?.data?.detail || 'Nepodařilo se načíst dokumenty');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  // Automatické načtení při změně entity
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload souboru
  const uploadDocument = useCallback(async (file, description = null) => {
    if (!entityType || !entityId || !file) {
      return { success: false, error: 'Chybí povinné parametry' };
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      const response = await api.post(
        `/api/v1/documents/${entityType}/${entityId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(progress);
          },
        }
      );

      // Refresh seznam dokumentů
      await fetchDocuments();

      return { success: true, document: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Nepodařilo se nahrát soubor';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [entityType, entityId, fetchDocuments]);

  // Upload více souborů
  const uploadDocuments = useCallback(async (files, descriptions = {}) => {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const description = descriptions[file.name] || null;
      const result = await uploadDocument(file, description);
      results.push({ file: file.name, ...result });
    }

    return results;
  }, [uploadDocument]);

  // Smazání dokumentu
  const deleteDocument = useCallback(async (documentId) => {
    try {
      setError(null);
      await api.delete(`/api/v1/documents/${documentId}`);

      // Refresh seznam dokumentů
      await fetchDocuments();

      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Nepodařilo se smazat dokument';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [fetchDocuments]);

  // Smazání všech dokumentů entity
  const deleteAllDocuments = useCallback(async () => {
    if (!entityType || !entityId) {
      return { success: false, error: 'Chybí povinné parametry' };
    }

    try {
      setError(null);
      const response = await api.delete(`/api/v1/documents/${entityType}/${entityId}`);

      // Refresh seznam dokumentů
      await fetchDocuments();

      return {
        success: true,
        deletedCount: response.data?.deleted_count || 0
      };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Nepodařilo se smazat dokumenty';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [entityType, entityId, fetchDocuments]);

  // Stažení dokumentu
  const downloadDocument = useCallback(async (document) => {
    try {
      const response = await api.get(`/api/v1/documents/${document.id}/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: document.mime_type });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.original_filename || document.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Nepodařilo se stáhnout dokument';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  // Získání URL pro náhled
  const getPreviewUrl = useCallback((documentId) => {
    return `/api/v1/documents/${documentId}/preview`;
  }, []);

  // Získání URL pro stažení
  const getDownloadUrl = useCallback((documentId) => {
    return `/api/v1/documents/${documentId}/download`;
  }, []);

  // Získání info o dokumentu
  const getDocumentInfo = useCallback(async (documentId) => {
    try {
      const response = await api.get(`/api/v1/documents/${documentId}`);
      return { success: true, document: response.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Nepodařilo se načíst informace'
      };
    }
  }, []);

  return {
    // Stav
    documents,
    loading,
    uploading,
    uploadProgress,
    error,
    documentCount: documents.length,

    // Akce
    fetchDocuments,
    uploadDocument,
    uploadDocuments,
    deleteDocument,
    deleteAllDocuments,
    downloadDocument,

    // Utility
    getPreviewUrl,
    getDownloadUrl,
    getDocumentInfo,

    // Reset error
    clearError: () => setError(null),
  };
};
