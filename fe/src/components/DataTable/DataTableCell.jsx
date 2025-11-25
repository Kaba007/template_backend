import { Badge } from 'flowbite-react';

export const DataTableCell = ({ column, value, row }) => {
  const renderCell = () => {
    // Custom render funkce
    if (column.render) {
      return column.render(value, row);
    }

    // Type-based rendering
    switch (column.type) {
      case 'badge':
        const badgeColor = column.getBadgeColor ? column.getBadgeColor(value) : 'info';
        const badgeValue = column.formatValue ? column.formatValue(value) : value;
        return (
          <Badge color={badgeColor}>
            {badgeValue}
          </Badge>
        );

      case 'boolean':
        return (
          <Badge color={value ? 'success' : 'failure'}>
            {value ? 'Ano' : 'Ne'}
          </Badge>
        );

      case 'date':
        return value ? new Date(value).toLocaleDateString('cs-CZ') : '-';

      case 'datetime':
        return value
          ? new Date(value).toLocaleString('cs-CZ')
          : '-';

      case 'number':
        const formattedNumber = column.formatValue
          ? column.formatValue(value)
          : (value ? value.toLocaleString('cs-CZ') : '-');
        return formattedNumber;

      case 'currency':
        return value
          ? `${value.toLocaleString('cs-CZ')} Kč`
          : '-';

      case 'percentage':
        return value !== null && value !== undefined
          ? `${value}%`
          : '-';

      case 'image':
        return value ? (
          <img
            src={value}
            alt=""
            className="w-10 h-10 rounded object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700" />
        );

      case 'link':
        const linkHref = column.getHref ? column.getHref(value, row) : value;
        const linkText = column.formatValue ? column.formatValue(value) : value;
        return value ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {linkText}
          </a>
        ) : (
          '-'
        );

      case 'array':
        return Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 3).map((item, index) => {
              const itemText = column.formatValue ? column.formatValue(item) : item;
              return (
                <Badge key={index} color="gray" size="xs">
                  {itemText}
                </Badge>
              );
            })}
            {value.length > 3 && (
              <Badge color="gray" size="xs">
                +{value.length - 3}
              </Badge>
            )}
          </div>
        ) : (
          '-'
        );

      case 'text':
      default:
        const displayValue = column.formatValue ? column.formatValue(value) : value;

        // Truncate dlouhého textu
        if (column.maxLength && displayValue && displayValue.length > column.maxLength) {
          return (
            <span title={displayValue}>
              {displayValue.substring(0, column.maxLength)}...
            </span>
          );
        }

        return displayValue || '-';
    }
  };

  return (
    <td className="px-6 py-4 text-gray-900 dark:text-white">
      {renderCell()}
    </td>
  );
};
