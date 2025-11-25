import { Button, Card, Label, Select, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { HiFilter, HiX } from 'react-icons/hi';

export const DataTableFilters = ({ filters, onApplyFilters }) => {
  const [filterValues, setFilterValues] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (filterKey, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const handleApply = () => {
    onApplyFilters(filterValues);
  };

  const handleReset = () => {
    setFilterValues({});
    onApplyFilters({});
  };

  const renderFilterField = (filter) => {
    const { key, label, type, options } = filter;

    switch (type) {
      case 'text':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {label}
            </Label>
            <TextInput
              id={key}
              type="text"
              value={filterValues[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              placeholder={`Hledat ${label.toLowerCase()}...`}
            />
          </div>
        );

      case 'select':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {label}
            </Label>
            <Select
              id={key}
              value={filterValues[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
            >
              {options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {label}
            </Label>
            <TextInput
              id={key}
              type="date"
              value={filterValues[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
            />
          </div>
        );

      case 'number':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {label}
            </Label>
            <TextInput
              id={key}
              type="number"
              value={filterValues[key] || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              placeholder={`Hledat ${label.toLowerCase()}...`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const activeFiltersCount = Object.keys(filterValues).filter(
    key => filterValues[key] && filterValues[key] !== ''
  ).length;

  return (
    <div>
      <Button
        color="light"
        onClick={() => setIsOpen(!isOpen)}
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
        <Card>
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
