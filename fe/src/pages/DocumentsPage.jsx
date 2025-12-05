// src/pages/DocumentsPage.jsx
import { Badge, Breadcrumb, BreadcrumbItem, Button, Card, Spinner, TextInput, Tooltip } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    HiChevronDown,
    HiChevronRight,
    HiDocument,
    HiDocumentText,
    HiDownload,
    HiEye,
    HiFolder,
    HiFolderOpen,
    HiHome,
    HiOutlinePhotograph,
    HiRefresh,
    HiSearch,
    HiTrash,
    HiViewGrid,
    HiViewList,
} from 'react-icons/hi';
import api from '../api/client';
import { DocumentPreview } from '../components/Documents/DocumentPreview';
import { useToast } from '../contexts/ToastContext';

// =====================================================
// HELPERS
// =====================================================

// Ikony podle typu souboru
const getFileIcon = (mimeType, filename) => {
  if (!mimeType && !filename) return HiDocument;

  const ext = filename?.split('.').pop()?.toLowerCase();

  if (mimeType?.startsWith('image/')) return HiOutlinePhotograph;
  if (mimeType === 'application/pdf') return HiDocumentText;
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return HiDocumentText;

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

// Barvy pro entity typy
const getEntityColor = (entityType) => {
  const colors = {
    deals: 'blue',
    invoices: 'green',
    leads: 'purple',
    companies: 'orange',
    users: 'pink',
  };
  return colors[entityType] || 'gray';
};

// Ikony pro entity typy
const getEntityIcon = (entityType) => {
  const icons = {
    deals: '📦',
    invoices: '📄',
    leads: '💡',
    companies: '🏢',
    users: '👤',
  };
  return icons[entityType] || '📁';
};

// =====================================================
// TREE NODE COMPONENT
// =====================================================

const TreeNode = ({
  label,
  icon,
  children,
  isExpanded,
  onToggle,
  onClick,
  isSelected,
  badge,
  badgeColor = 'gray',
  level = 0,
}) => {
  const hasChildren = children && (Array.isArray(children) ? children.length > 0 : true);

  return (
    <div>
      <div
        onClick={onClick}
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg
          transition-colors duration-150
          ${isSelected
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {/* Expand/Collapse icon */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            {isExpanded ? (
              <HiChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <HiChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon */}
        <span className="text-lg">{icon}</span>

        {/* Label */}
        <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </span>

        {/* Badge */}
        {badge !== undefined && (
          <Badge color={badgeColor} size="xs">
            {badge}
          </Badge>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
};

// =====================================================
// DOCUMENT ITEM COMPONENT
// =====================================================

const DocumentItem = ({
  document,
  viewMode,
  isSelected,
  onClick,
  onPreview,
  onDownload,
  onDelete,
}) => {
  const FileIcon = getFileIcon(document.mime_type, document.filename);

  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className={`
          p-4 border rounded-xl cursor-pointer transition-all duration-150
          ${isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
          }
        `}
      >
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-700">
            <FileIcon className="h-10 w-10 text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        {/* Name */}
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate text-center" title={document.filename}>
          {document.filename}
        </p>

        {/* Size */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
          {formatFileSize(document.file_size)}
        </p>

        {/* Actions */}
        <div className="flex justify-center gap-1 mt-3">
          <Tooltip content="Náhled">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview?.(document); }}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <HiEye className="h-4 w-4 text-gray-500" />
            </button>
          </Tooltip>
          <Tooltip content="Stáhnout">
            <button
              onClick={(e) => { e.stopPropagation(); onDownload?.(document); }}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <HiDownload className="h-4 w-4 text-gray-500" />
            </button>
          </Tooltip>
          <Tooltip content="Smazat">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(document); }}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <HiTrash className="h-4 w-4 text-red-500" />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-colors duration-150
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      {/* Icon */}
      <FileIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {document.filename}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatFileSize(document.file_size)}</span>
          {document.uploaded_at && (
            <span>{new Date(document.uploaded_at).toLocaleDateString('cs-CZ')}</span>
          )}
          <span className="truncate">{document.mime_type}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Tooltip content="Náhled">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview?.(document); }}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <HiEye className="h-4 w-4 text-gray-500" />
          </button>
        </Tooltip>
        <Tooltip content="Stáhnout">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload?.(document); }}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <HiDownload className="h-4 w-4 text-gray-500" />
          </button>
        </Tooltip>
        <Tooltip content="Smazat">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(document); }}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <HiTrash className="h-4 w-4 text-red-500" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================

export const DocumentsPage = () => {
  const { showToast } = useToast();

  // Data state
  const [tree, setTree] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedPath, setSelectedPath] = useState(null); // { entityType, entityId }
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [previewModal, setPreviewModal] = useState({ open: false, document: null });

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/v1/documents/storage/tree');

      if (response.data.success) {
        setTree(response.data.tree || {});
        setSummary(response.data.summary || null);

        // Auto-expand první úroveň
        const firstLevel = new Set(Object.keys(response.data.tree || {}));
        setExpandedNodes(firstLevel);
      }
    } catch (err) {
      console.error('Error fetching document tree:', err);
      setError('Nepodařilo se načíst strukturu dokumentů');
      showToast('error', 'Chyba při načítání dokumentů');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const toggleNode = (nodeKey) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeKey)) {
        newSet.delete(nodeKey);
      } else {
        newSet.add(nodeKey);
      }
      return newSet;
    });
  };

  const handleSelectPath = (entityType, entityId = null) => {
    if (entityId) {
      setSelectedPath({ entityType, entityId });
    } else {
      setSelectedPath({ entityType, entityId: null });
    }
    setSelectedDocument(null);
  };

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/api/v1/documents/${doc.id}/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: doc.mime_type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', 'Stahování zahájeno');
    } catch (err) {
      console.error('Error downloading document:', err);
      showToast('error', 'Nepodařilo se stáhnout dokument');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Opravdu chcete smazat "${doc.filename}"?`)) return;

    try {
      await api.delete(`/api/v1/documents/${doc.id}`);
      showToast('success', 'Dokument byl smazán');
      fetchTree();
    } catch (err) {
      console.error('Error deleting document:', err);
      showToast('error', 'Nepodařilo se smazat dokument');
    }
  };

  const handlePreview = (doc) => {
    setPreviewModal({ open: true, document: doc });
  };

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  // Dokumenty pro aktuální výběr
  const currentDocuments = useMemo(() => {
    if (!selectedPath) return [];

    const { entityType, entityId } = selectedPath;

    if (entityId) {
      // Konkrétní entita
      return tree[entityType]?.[entityId]?.documents || [];
    } else {
      // Všechny dokumenty v kategorii
      const allDocs = [];
      Object.values(tree[entityType] || {}).forEach(entity => {
        allDocs.push(...(entity.documents || []));
      });
      return allDocs;
    }
  }, [selectedPath, tree]);

  // Filtrované dokumenty podle vyhledávání
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return currentDocuments;

    const query = searchQuery.toLowerCase();
    return currentDocuments.filter(doc =>
      doc.filename?.toLowerCase().includes(query) ||
      doc.mime_type?.toLowerCase().includes(query)
    );
  }, [currentDocuments, searchQuery]);

  // Breadcrumb path
  const breadcrumbPath = useMemo(() => {
    const items = [{ label: 'Dokumenty', onClick: () => setSelectedPath(null) }];

    if (selectedPath?.entityType) {
      const entityInfo = Object.values(tree[selectedPath.entityType] || {})[0]?.entity_info;
      const dirName = entityInfo?.dir_name || selectedPath.entityType;

      items.push({
        label: dirName,
        onClick: () => handleSelectPath(selectedPath.entityType),
      });

      if (selectedPath.entityId) {
        const entity = tree[selectedPath.entityType]?.[selectedPath.entityId];
        const entityName = entity?.entity_info?.name || `#${selectedPath.entityId}`;
        items.push({
          label: entityName,
          onClick: null,
        });
      }
    }

    return items;
  }, [selectedPath, tree]);

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám dokumenty...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button color="blue" onClick={fetchTree}>
              <HiRefresh className="mr-2 h-4 w-4" />
              Zkusit znovu
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* =====================================================
          SIDEBAR - Stromová struktura
          ===================================================== */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HiFolder className="h-5 w-5" />
            Správa dokumentů
          </h2>
          {summary && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Object.values(summary.entity_counts || {}).reduce((a, b) => a + b, 0)} entit
            </p>
          )}
        </div>

        {/* Tree */}
        <div className="py-2">
          {/* Root - All documents */}
          <TreeNode
            label="Všechny dokumenty"
            icon={<HiHome className="h-5 w-5 text-gray-500" />}
            isSelected={!selectedPath}
            onClick={() => setSelectedPath(null)}
            level={0}
          />

          {/* Entity types */}
          {Object.entries(tree).map(([entityType, entities]) => {
            const docCount = Object.values(entities).reduce(
              (sum, e) => sum + (e.documents?.length || 0), 0
            );
            const firstEntity = Object.values(entities)[0];
            const dirName = firstEntity?.entity_info?.dir_name || entityType;

            return (
              <TreeNode
                key={entityType}
                label={dirName}
                icon={getEntityIcon(entityType)}
                badge={docCount}
                badgeColor={getEntityColor(entityType)}
                isExpanded={expandedNodes.has(entityType)}
                onToggle={() => toggleNode(entityType)}
                isSelected={selectedPath?.entityType === entityType && !selectedPath?.entityId}
                onClick={() => handleSelectPath(entityType)}
                level={0}
              >
                {/* Entities within type */}
                {Object.entries(entities).map(([entityId, entity]) => (
                  <TreeNode
                    key={`${entityType}-${entityId}`}
                    label={entity.entity_info?.name || `#${entityId}`}
                    icon={expandedNodes.has(`${entityType}-${entityId}`) ? <HiFolderOpen className="h-4 w-4 text-yellow-500" /> : <HiFolder className="h-4 w-4 text-yellow-500" />}
                    badge={entity.documents?.length || 0}
                    isExpanded={expandedNodes.has(`${entityType}-${entityId}`)}
                    onToggle={() => toggleNode(`${entityType}-${entityId}`)}
                    isSelected={selectedPath?.entityType === entityType && selectedPath?.entityId === entityId}
                    onClick={() => handleSelectPath(entityType, entityId)}
                    level={1}
                  />
                ))}
              </TreeNode>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT - Seznam dokumentů
          ===================================================== */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Toolbar */}
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-3">
            {breadcrumbPath.map((item, index) => (
              <BreadcrumbItem
                key={index}
                onClick={item.onClick}
                className={item.onClick ? 'cursor-pointer hover:text-blue-600' : ''}
              >
                {item.label}
              </BreadcrumbItem>
            ))}
          </Breadcrumb>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <TextInput
                icon={HiSearch}
                placeholder="Hledat dokumenty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View mode & Refresh */}
            <div className="flex items-center gap-2">
              <Tooltip content="Zobrazení seznamem">
                <Button
                  size="sm"
                  color={viewMode === 'list' ? 'blue' : 'light'}
                  onClick={() => setViewMode('list')}
                >
                  <HiViewList className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Zobrazení mřížkou">
                <Button
                  size="sm"
                  color={viewMode === 'grid' ? 'blue' : 'light'}
                  onClick={() => setViewMode('grid')}
                >
                  <HiViewGrid className="h-4 w-4" />
                </Button>
              </Tooltip>

              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

              <Button size="sm" color="light" onClick={fetchTree}>
                <HiRefresh className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Documents Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedPath ? (
            /* No selection - show overview */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(tree).map(([entityType, entities]) => {
                const docCount = Object.values(entities).reduce(
                  (sum, e) => sum + (e.documents?.length || 0), 0
                );
                const entityCount = Object.keys(entities).length;
                const firstEntity = Object.values(entities)[0];
                const dirName = firstEntity?.entity_info?.dir_name || entityType;

                return (
                  <Card
                    key={entityType}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectPath(entityType)}
                  >
                    <div className="text-center">
                      <span className="text-4xl">{getEntityIcon(entityType)}</span>
                      <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">
                        {dirName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {entityCount} záznamů • {docCount} dokumentů
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : filteredDocuments.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <HiDocument className="h-16 w-16 mb-4" />
              <p className="text-lg">Žádné dokumenty</p>
              {searchQuery && (
                <p className="text-sm mt-1">
                  Zkuste upravit vyhledávání
                </p>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid view */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  viewMode="grid"
                  isSelected={selectedDocument?.id === doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            /* List view */
            <Card className="overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <div className="w-8" />
                  <div className="flex-1">Název</div>
                  <div className="w-32 text-right">Akce</div>
                </div>

                {/* Items */}
                {filteredDocuments.map((doc) => (
                  <DocumentItem
                    key={doc.id}
                    document={doc}
                    viewMode="list"
                    isSelected={selectedDocument?.id === doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {filteredDocuments.length} dokumentů
          {searchQuery && ` (filtrováno z ${currentDocuments.length})`}
        </div>
      </div>

      {/* =====================================================
          PREVIEW MODAL
          ===================================================== */}
      <DocumentPreview
        open={previewModal.open}
        document={previewModal.document}
        onClose={() => setPreviewModal({ open: false, document: null })}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default DocumentsPage;
