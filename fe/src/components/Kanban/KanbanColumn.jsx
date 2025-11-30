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
  const [draggingItemId, setDraggingItemId] = useState(null);

  // Handler pro začátek tažení
  const handleDragStart = (e, item) => {
    setDraggingItemId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      itemId: item.id,
      sourceColumn: column.key
    }));

    // Malé zpoždění pro lepší vizuální efekt
    requestAnimationFrame(() => {
      e.target.style.opacity = '0.5';
    });
  };

  // Handler pro konec tažení
  const handleDragEnd = (e) => {
    setDraggingItemId(null);
    e.target.style.opacity = '1';
  };

  // Handler pro vstup do drop zóny
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
  };

  // Handler pro opuštění drop zóny
  const handleDragLeave = (e) => {
    // Kontrola, zda opouštíme skutečně celou drop zónu
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingOver(false);
    }
  };

  // Handler pro drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { itemId, sourceColumn } = data;

      if (sourceColumn === column.key) {
        // Přesun ve stejném sloupci - nic neděláme
        return;
      }

      // Zavoláme callback pro změnu stavu
      onDrop(itemId, column.key, sourceColumn);
    } catch (err) {
      console.error('Drop error:', err);
    }
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
          border-2 border-dashed transition-all duration-200
          overflow-y-auto
          ${isDraggingOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]'
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
              className="transition-transform duration-200"
            >
              <KanbanCard
                item={item}
                fields={fields}
                cardConfig={cardConfig}
                onEdit={onEdit}
                onDelete={onDelete}
                isDragging={draggingItemId === item.id}
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
