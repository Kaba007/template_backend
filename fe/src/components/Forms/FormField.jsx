import { Label, Select, Textarea, TextInput, ToggleSwitch } from 'flowbite-react';
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { AsyncSelectFilter } from '../filters/AjaxSelect';

export const FormField = ({ column, value, onChange, error }) => {
  const { key, label, type, required, placeholder, options, disabled, helpText } = column;

  // Pro AJAX select (starý typ - načte vše najednou)
  const [ajaxOptions, setAjaxOptions] = useState([]);
  const [ajaxLoading, setAjaxLoading] = useState(false);
  const [ajaxError, setAjaxError] = useState(null);

  // Načíst options pro AJAX typ
  useEffect(() => {
    if (type === 'ajax' && column.endpoint) {
      loadAjaxOptions();
    }
  }, [type, column.endpoint]);

  const loadAjaxOptions = async () => {
    setAjaxLoading(true);
    setAjaxError(null);

    try {
      const response = await api.get(column.endpoint);
      const data = response.data?.data || response.data;

      const transformedOptions = data.map(item => {
        if (column.optionValue && column.optionLabel) {
          return {
            value: item[column.optionValue],
            label: item[column.optionLabel],
          };
        }
        return item;
      });

      setAjaxOptions(transformedOptions);
    } catch (err) {
      console.error('AJAX options load error:', err);
      setAjaxError('Nepodařilo se načíst možnosti');
    } finally {
      setAjaxLoading(false);
    }
  };

  const renderField = () => {
    switch (type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
      case 'datetime-local':
        return (
          <TextInput
            id={key}
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Zadejte ${label.toLowerCase()}...`}
            required={required}
            disabled={disabled}
            color={error ? 'failure' : undefined}
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={key}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Zadejte ${label.toLowerCase()}...`}
            required={required}
            disabled={disabled}
            rows={4}
            color={error ? 'failure' : undefined}
          />
        );

      case 'select':
        return (
          <Select
            id={key}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
            color={error ? 'failure' : undefined}
          >
            <option value="">Vyberte...</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      // Starý AJAX - načte všechny options najednou
      case 'ajax':
        return (
          <div>
            <Select
              id={key}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              disabled={disabled || ajaxLoading}
              color={error || ajaxError ? 'failure' : undefined}
            >
              <option value="">
                {ajaxLoading ? 'Načítám...' : 'Vyberte...'}
              </option>
              {ajaxOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {ajaxError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {ajaxError}
              </p>
            )}
          </div>
        );

      // Nový ASYNC SELECT - vyhledává dynamicky
      case 'async-select':
        return (
          <AsyncSelectFilter
            filter={{
              key,
              label,
              endpoint: column.endpoint,
              valueKey: column.optionValue || 'id',
              labelKey: column.optionLabel || 'name',
              queryParamKey: column.queryParamKey || column.optionLabel || 'name',
              placeholder: placeholder,
              minChars: column.minChars || 2,
            }}
            value={value}
            onChange={onChange}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2 pt-2">
            <ToggleSwitch
              checked={!!value}
              onChange={onChange}
              disabled={disabled}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {value ? 'Ano' : 'Ne'}
            </span>
          </div>
        );

      case 'currency':
        return (
          <div className="relative">
            <TextInput
              id={key}
              type="number"
              value={value || ''}
              onChange={(e) => onChange(parseFloat(e.target.value) || '')}
              placeholder={placeholder || '0'}
              required={required}
              disabled={disabled}
              step="0.01"
              color={error ? 'failure' : undefined}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              Kč
            </span>
          </div>
        );

      case 'percentage':
        return (
          <div className="relative">
            <TextInput
              id={key}
              type="number"
              value={value || ''}
              onChange={(e) => onChange(parseFloat(e.target.value) || '')}
              placeholder={placeholder || '0'}
              required={required}
              disabled={disabled}
              min="0"
              max="100"
              step="0.01"
              color={error ? 'failure' : undefined}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              %
            </span>
          </div>
        );

      default:
        return (
          <TextInput
            id={key}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Zadejte ${label.toLowerCase()}...`}
            required={required}
            disabled={disabled}
            color={error ? 'failure' : undefined}
          />
        );
    }
  };

  // Full-width pro textarea
  const fullWidth = type === 'textarea';

  // Pro async-select nepotřebujeme Label (má vlastní)
  if (type === 'async-select') {
    return (
      <div className={fullWidth ? 'md:col-span-2' : ''}>
        {renderField()}
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <div className="mb-2 flex items-center gap-1.5">
        <Label
          htmlFor={key}
          className="text-gray-900 dark:text-gray-100 font-medium"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" title="Povinné pole">
              *
            </span>
          )}
        </Label>
        {helpText && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 italic">
            {helpText}
          </span>
        )}
      </div>
      {renderField()}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};
