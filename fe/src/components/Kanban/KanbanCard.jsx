import { Badge, Button, Card } from 'flowbite-react';
import { HiPencil, HiTrash } from 'react-icons/hi';

export const KanbanCard = ({
  item,
  fields,
  cardConfig = {},
  onEdit,
  onDelete,
  isDragging,
  isHighlighted,
  onClick,
}) => {
  // Pokud je definována custom render funkce, použijeme ji
  if (cardConfig.renderCard) {
    return (
      <div
        className={`${isDragging ? 'opacity-50' : ''}`}
        onClick={onClick}
      >
        {cardConfig.renderCard(item, { onEdit, onDelete })}
      </div>
    );
  }

  // Built-in rendering - najít field definice podle klíčů
  const displayFieldKeys = cardConfig.displayFields || fields.filter(f => f.showInCard !== false).map(f => f.key);
  const displayFields = displayFieldKeys.map(key =>
    typeof key === 'string' ? fields.find(f => f.key === key) : key
  ).filter(Boolean);

  // Určit barvu karty
  const getCardColor = () => {
    if (cardConfig.cardColor && typeof cardConfig.cardColor === 'function') {
      return cardConfig.cardColor(item);
    }
    return 'gray';
  };

  const getBorderColor = () => {
    const color = getCardColor();
    const colorMap = {
      'red': 'border-red-500',
      'yellow': 'border-yellow-500',
      'green': 'border-green-500',
      'blue': 'border-blue-500',
      'gray': 'border-gray-300',
      'failure': 'border-red-500',
      'warning': 'border-yellow-500',
      'success': 'border-green-500',
      'info': 'border-blue-500',
    };
    return colorMap[color] || 'border-gray-300';
  };

  // ✅ Získat hodnotu pole - podporuje enriched data
  const getFieldValue = (field) => {
    const rawValue = item[field.key];

    // Pokud má pole enrich konfiguraci, zkus najít enriched data
    if (field.enrich) {
      const enrichedData = item[`${field.key}_data`];
      if (enrichedData) {
        return enrichedData[field.enrich.displayField] || rawValue;
      }
    }

    return rawValue;
  };

  // Renderovat jednotlivé pole
  const renderField = (field) => {
    const rawValue = item[field.key];
    const displayValue = getFieldValue(field);

    // Custom render pro pole v kartě
    if (field.cardRender) {
      return field.cardRender(rawValue, item);
    }

    // Default rendering podle typu
    switch (field.type) {
      case 'badge':
        const badgeColor = field.getBadgeColor ? field.getBadgeColor(rawValue) : 'info';
        return (
          <Badge color={badgeColor} size="sm">
            {field.formatValue ? field.formatValue(rawValue) : displayValue}
          </Badge>
        );

      case 'date':
        return rawValue ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {new Date(rawValue).toLocaleDateString('cs-CZ')}
          </span>
        ) : null;

      case 'boolean':
        return (
          <Badge color={rawValue ? 'success' : 'failure'} size="sm">
            {rawValue ? 'Ano' : 'Ne'}
          </Badge>
        );

      case 'currency':
        return (
          <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold truncate">
            {field.formatValue ? field.formatValue(rawValue) : `${rawValue} Kč`}
          </span>
        );

      // ✅ Async-select - zobrazit enriched hodnotu
      case 'async-select':
        if (!rawValue) return null;
        
        // Pokud máme enriched data, zobrazíme displayField
        const enrichedData = item[`${field.key}_data`];
        if (enrichedData && field.enrich?.displayField) {
          const enrichedValue = enrichedData[field.enrich.displayField];
          if (field.enrich.showAsBadge) {
            return (
              <Badge color="info" size="sm">
                {enrichedValue}
              </Badge>
            );
          }
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {enrichedValue}
            </span>
          );
        }
        // Fallback - zobraz ID
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
            ID: {rawValue}
          </span>
        );

      default:
        const formattedValue = field.formatValue ? field.formatValue(rawValue) : displayValue;
        return (
          <span
            className="text-sm text-gray-700 dark:text-gray-300 truncate block"
            title={formattedValue}
          >
            {formattedValue}
          </span>
        );
    }
  };

  // Ikona v kartě
  const CardIcon = cardConfig.cardIcon ? cardConfig.cardIcon(item) : null;

  return (
    <Card
      onClick={onClick}
      className={`
        cursor-move hover:shadow-lg transition-shadow
        border-l-4 ${getBorderColor()}
        ${isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
      `}
    >
      {/* Header s ikonou a akcemi */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {CardIcon && <CardIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />}

          {/* Hlavní pole (title nebo první displayField) */}
          {displayFields[0] && (
            <div className="flex-1 font-semibold text-gray-900 dark:text-white min-w-0">
              <div className="truncate" title={item[displayFields[0].key]}>
                {renderField(displayFields[0])}
              </div>
            </div>
          )}
        </div>

        {/* Akce */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <Button
              size="xs"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="p-1"
            >
              <HiPencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="xs"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="p-1"
            >
              <HiTrash className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Další pole */}
      <div className="space-y-2">
        {displayFields.slice(1).map((field) => {
          const value = item[field.key];
          // Pro async-select kontroluj i enriched data
          const hasEnrichedData = field.type === 'async-select' && item[`${field.key}_data`];
          
          if (!value && value !== 0 && value !== false && !hasEnrichedData) return null;

          return (
            <div key={field.key} className="flex items-center gap-2 min-w-0">
              {field.label && (
                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px] flex-shrink-0">
                  {field.label}:
                </span>
              )}
              <div className="flex-1 min-w-0">
                {renderField(field)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Badges (pokud jsou definované) */}
      {cardConfig.cardBadges && cardConfig.cardBadges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {cardConfig.cardBadges.map((badgeConfig, index) => {
            const value = item[badgeConfig.field];
            if (value === null || value === undefined) return null;

            const color = badgeConfig.getColor ? badgeConfig.getColor(value) : 'info';
            const displayValue = badgeConfig.formatValue ? badgeConfig.formatValue(value) : value;

            // Pokud formatValue vrátí prázdný string, nezobrazuj badge
            if (!displayValue) return null;

            return (
              <Badge key={index} color={color} size="xs">
                {displayValue}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Avatar (pokud je definovaný) */}
      {cardConfig.showAvatar && cardConfig.avatarInitials && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {cardConfig.avatarUrl?.(item) ? (
            <img
              src={cardConfig.avatarUrl(item)}
              alt=""
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
          ) : cardConfig.avatarInitials(item) ? (
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {cardConfig.avatarInitials(item)}
            </div>
          ) : null}
          {cardConfig.avatarLabel && (
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {cardConfig.avatarLabel(item)}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};