import { Badge } from 'flowbite-react';
import { useState } from 'react';
import { KanbanCard } from './KanbanCard';

export const KanbanColumn = ({
  column,
  items,
  fields,
  cardConfig,
  onEdit,
  onDelete,
  onDrop,
  selectedCard,
  onCardClick,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Handler pro začátek tažení
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    e.dataTransfer.setData('itemId', item.id.toString());
    e.dataTransfer.setData('sourceColumn', column.key);
  };

  // Handler pro konec tažení
  const handleDragEnd = (e) => {
    setDraggedItem(null);
  };

  // Handler pro vstup do drop zóny
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
  };

  // Handler pro opuštění drop zóny
  const handleDragLeave = (e) => {
    setIsDraggingOver(false);
  };

  // Handler pro drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const itemId = parseInt(e.dataTransfer.getData('itemId'));
    const sourceColumn = e.dataTransfer.getData('sourceColumn');

    if (sourceColumn === column.key) {
      // Přesun ve stejném sloupci - nic neděláme
      return;
    }

    // Zavoláme callback pro změnu stavu
    onDrop(itemId, column.key, sourceColumn);
  };

  // Barva sloupce
  const getColumnColor = () => {
    const colorMap = {
      'gray': 'bg-gray-100 dark:bg-gray-800',
      'blue': 'bg-blue-50 dark:bg-blue-900/20',
      'green': 'bg-green-50 dark:bg-green-900/20',
      'yellow': 'bg-yellow-50 dark:bg-yellow-900/20',
      'red': 'bg-red-50 dark:bg-red-900/20',
      'purple': 'bg-purple-50 dark:bg-purple-900/20',
      'pink': 'bg-pink-50 dark:bg-pink-900/20',
    };
    return colorMap[column.color] || colorMap['gray'];
  };

  // Barva badge podle stavu
  const getBadgeColor = () => {
    const colorMap = {
      'gray': 'gray',
      'blue': 'info',
      'green': 'success',
      'yellow': 'warning',
      'red': 'failure',
      'purple': 'purple',
      'pink': 'pink',
    };
    return colorMap[column.color] || 'gray';
  };

  return (
    <div className="flex flex-col h-full min-w-[250px] max-w-[275px]">
      {/* Header sloupce */}
      <div className={`p-4 rounded-t-lg ${getColumnColor()}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {column.label}
          </h3>
          <Badge color={getBadgeColor()} size="sm">
            {items.length}
            {column.limit && ` / ${column.limit}`}
          </Badge>
        </div>

        {/* Popis sloupce (volitelné) */}
        {column.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {column.description}
          </p>
        )}
      </div>

      {/* Drop zóna */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex-1 p-4 space-y-3 rounded-b-lg
          border-2 border-dashed transition-colors
          overflow-y-auto
          ${isDraggingOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
          }
          ${column.limit && items.length >= column.limit
            ? 'bg-red-50 dark:bg-red-900/10'
            : ''
          }
        `}
        style={{ minHeight: '400px' }}
      >
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <p className="text-sm">Žádné položky</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
            >
              <KanbanCard
                item={item}
                fields={fields}
                cardConfig={cardConfig}
                onEdit={onEdit}
                onDelete={onDelete}
                isDragging={draggedItem?.id === item.id}
                isHighlighted={selectedCard?.id === item.id}
                onClick={() => onCardClick?.(item)}
              />
            </div>
          ))
        )}

        {/* Upozornění na limit */}
        {column.limit && items.length >= column.limit && (
          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400 text-center">
            Dosažen limit {column.limit} položek
          </div>
        )}
      </div>
    </div>
  );
};
