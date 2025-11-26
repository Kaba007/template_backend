import { Button, Card, Label, Select, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { HiFilter, HiX } from 'react-icons/hi';
import { useSearchParams } from 'react-router-dom';
import { AsyncSelectFilter } from '../filters/AjaxSelect';

export const DataTableFilters = ({
  filters,
  // Callback když se změní filtry (volitelný - pro případné side effects)
  onFiltersChange,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({});

  // Při otevření panelu načti aktuální hodnoty z URL
  const handleOpen = () => {
    const currentFilters = {};
    filters.forEach(filter => {
      const value = searchParams.get(filter.key);
      if (value !== null) {
        currentFilters[filter.key] = value;
      }
    });
    setTempFilters(currentFilters);
    setIsOpen(true);
  };

  const handleFilterChange = (filterKey, value) => {
    setTempFilters(prev => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  // Aplikovat filtry = aktualizovat URL
  const handleApply = () => {
    const newParams = new URLSearchParams();

    // Zachovat existující parametry, které nejsou filtry
    searchParams.forEach((value, key) => {
      const isFilterKey = filters.some(f => f.key === key);
      if (!isFilterKey) {
        newParams.set(key, value);
      }
    });

    // Přidat nové hodnoty filtrů
    Object.entries(tempFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, value);
      }
    });

    setSearchParams(newParams);
    onFiltersChange?.(tempFilters);
    setIsOpen(false);
  };

  // Reset filtrů = odstranit z URL
  const handleReset = () => {
    const newParams = new URLSearchParams();

    // Zachovat pouze parametry, které nejsou filtry
    searchParams.forEach((value, key) => {
      const isFilterKey = filters.some(f => f.key === key);
      if (!isFilterKey) {
        newParams.set(key, value);
      }
    });

    setSearchParams(newParams);
    setTempFilters({});
    onFiltersChange?.({});
    setIsOpen(false);
  };

  const renderFilterField = (filter) => {
    const { key, label, type, options, placeholder, endpoint, valueKey, labelKey, queryParamKey, minChars } = filter;

    switch (type) {
      case 'text':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <TextInput
              id={key}
              type="text"
              value={tempFilters[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              placeholder={placeholder || `Hledat ${label.toLowerCase()}...`}
            />
          </div>
        );

      case 'select':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Select
              id={key}
              value={tempFilters[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
            >
              <option value="">Vše</option>
              {options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Select
              id={key}
              value={tempFilters[key] !== undefined ? tempFilters[key].toString() : ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange(key, value === '' ? undefined : value);
              }}
            >
              <option value="">Vše</option>
              <option value="true">Ano</option>
              <option value="false">Ne</option>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <TextInput
              id={key}
              type="date"
              value={tempFilters[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
            />
          </div>
        );

      case 'number':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <TextInput
              id={key}
              type="number"
              value={tempFilters[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              placeholder={placeholder || `Zadejte ${label.toLowerCase()}...`}
            />
          </div>
        );

      case 'async-select':
        return (
          <AsyncSelectFilter
            key={key}
            filter={filter}
            value={tempFilters[key] || ''}
            onChange={(value) => handleFilterChange(key, value)}
          />
        );

      default:
        return null;
    }
  };

  // Počet aktivních filtrů z URL
  const activeFiltersCount = filters.filter(f => {
    const value = searchParams.get(f.key);
    return value !== null && value !== '';
  }).length;

  return (
    <div>
      <Button
        color="light"
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className="mb-4"
      >
        <HiFilter className="mr-2 h-5 w-5" />
        Filtry
        {activeFiltersCount > 0 && (
          <span className="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filters.map((filter) => renderFilterField(filter))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button color="blue" onClick={handleApply}>
              Aplikovat filtry
            </Button>
            <Button color="light" onClick={handleReset}>
              <HiX className="mr-2 h-5 w-5" />
              Vymazat
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
