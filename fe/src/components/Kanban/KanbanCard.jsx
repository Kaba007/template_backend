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

  // Built-in rendering
  const displayFields = cardConfig.displayFields || fields.filter(f => f.showInCard !== false);

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

  // Renderovat jednotlivé pole
  const renderField = (field) => {
    const value = item[field.key];

    // Custom render pro pole v kartě
    if (field.cardRender) {
      return field.cardRender(value, item);
    }

    // Default rendering podle typu
    switch (field.type) {
      case 'badge':
        const badgeColor = field.getBadgeColor ? field.getBadgeColor(value) : 'info';
        return (
          <Badge color={badgeColor} size="sm">
            {field.formatValue ? field.formatValue(value) : value}
          </Badge>
        );

      case 'date':
        return value ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(value).toLocaleDateString('cs-CZ')}
          </span>
        ) : null;

      case 'boolean':
        return (
          <Badge color={value ? 'success' : 'failure'} size="sm">
            {value ? 'Ano' : 'Ne'}
          </Badge>
        );

      default:
        return (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {field.formatValue ? field.formatValue(value) : value}
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
        cursor-move hover:shadow-lg transition-all
        border-l-4 ${getBorderColor()}
        ${isDragging ? 'opacity-50 rotate-2' : ''}
        ${isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
      `}
    >
      {/* Header s ikonou a akcemi */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {CardIcon && <CardIcon className="h-5 w-5 text-gray-500" />}

          {/* Hlavní pole (title nebo první displayField) */}
          {displayFields[0] && (
            <div className="flex-1 font-semibold text-gray-900 dark:text-white">
              {renderField(displayFields[0])}
            </div>
          )}
        </div>

        {/* Akce */}
        <div className="flex items-center gap-1">
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
          if (!value && value !== 0 && value !== false) return null;

          return (
            <div key={field.key} className="flex items-center gap-2">
              {field.label && (
                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px]">
                  {field.label}:
                </span>
              )}
              <div className="flex-1">
                {renderField(field)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Badges (pokud jsou definované) */}
      {cardConfig.cardBadges && (
        <div className="flex flex-wrap gap-1 mt-2">
          {cardConfig.cardBadges.map((badgeConfig, index) => {
            const value = item[badgeConfig.field];
            if (!value) return null;

            const color = badgeConfig.getColor ? badgeConfig.getColor(value) : 'info';
            const displayValue = badgeConfig.formatValue ? badgeConfig.formatValue(value) : value;

            return (
              <Badge key={index} color={color} size="xs">
                {displayValue}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Avatar (pokud je definovaný) */}
      {cardConfig.showAvatar && cardConfig.avatarField && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {cardConfig.avatarUrl?.(item) ? (
            <img
              src={cardConfig.avatarUrl(item)}
              alt=""
              className="w-6 h-6 rounded-full"
            />
          ) : cardConfig.avatarInitials?.(item) ? (
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
              {cardConfig.avatarInitials(item)}
            </div>
          ) : null}
          {cardConfig.avatarLabel && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {cardConfig.avatarLabel(item)}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
