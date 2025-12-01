import { Label, Spinner, TextInput } from 'flowbite-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HiX } from 'react-icons/hi';
import api from '../../api/client';

/**
 * AsyncSelectFilter - Komponenta pro asynchronní vyhledávání a výběr
 *
 * @param {Object} filter - Konfigurace filtru
 * @param {string} filter.key - Unikátní klíč filtru
 * @param {string} filter.label - Popisek filtru
 * @param {string} filter.endpoint - API endpoint pro vyhledávání
 * @param {string} filter.valueKey - Klíč pro hodnotu v API response
 * @param {string} filter.labelKey - Klíč pro label v API response
 * @param {string} filter.queryParamKey - Název query parametru pro vyhledávání
 * @param {string} [filter.placeholder] - Placeholder pro input
 * @param {number} [filter.minChars=2] - Minimální počet znaků pro spuštění vyhledávání
 * @param {string} value - Aktuální hodnota (ID)
 * @param {Function} onChange - Callback při změně hodnoty (value, rawData?)
 * @param {boolean} [returnFullItem=false] - Pokud true, onChange dostane i celý objekt
 */
export const AsyncSelectFilter = ({ filter, value, onChange, returnFullItem = false }) => {
  const {
    key,
    label,
    endpoint,
    valueKey,
    labelKey,
    queryParamKey,
    placeholder,
    minChars = 2
  } = filter;

  const [inputValue, setInputValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  // Ref pro sledování, že výběr právě proběhl (abychom nevolali API zbytečně)
  const justSelectedRef = useRef(false);

  // Načti počáteční hodnotu (label pro již vybrané ID)
  const loadInitialValue = useCallback(async (valueToLoad) => {
    if (!valueToLoad) return;

    try {
      const response = await api.get(`${endpoint}/${valueToLoad}`);
      const data = response.data;
      setDisplayValue(data[labelKey]);
      setSelectedOption({
        value: data[valueKey],
        label: data[labelKey],
        raw: data, // Uložíme celý objekt
      });
    } catch (err) {
      console.error('Error loading initial value:', err);
      setDisplayValue(String(valueToLoad)); // Fallback na ID
      setSelectedOption({
        value: valueToLoad,
        label: String(valueToLoad),
        raw: null,
      });
    }
  }, [endpoint, valueKey, labelKey]);

  // Synchronizace s externím value prop
  useEffect(() => {
    // Pokud jsme právě vybrali položku, přeskoč API call
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    // Pokud se value změnilo externě (ne naším výběrem)
    if (value) {
      // Máme value, zkontroluj zda odpovídá selectedOption
      if (!selectedOption || String(selectedOption.value) !== String(value)) {
        // Value se změnilo - načti data z API
        loadInitialValue(value);
      }
    } else {
      // Value je prázdné - resetuj
      if (selectedOption) {
        setSelectedOption(null);
        setDisplayValue('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // Záměrně ignorujeme selectedOption - chceme reagovat jen na změnu value

  // Zavři dropdown při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce při unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Vyhledávání s debounce
  const searchOptions = useCallback(async (searchTerm) => {
    if (searchTerm.length < minChars) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(
        `${endpoint}?${queryParamKey}=${encodeURIComponent(searchTerm)}`
      );
      const data = response.data;

      // Mapuj data na options (podporuje různé formáty API response)
      const items = Array.isArray(data)
        ? data
        : data.items || data.results || data.data || [];

      const mappedOptions = items.map(item => ({
        value: item[valueKey],
        label: item[labelKey],
        raw: item, // Celý objekt pro fillFields
      }));

      setOptions(mappedOptions);
    } catch (err) {
      console.error('Error searching options:', err);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, valueKey, labelKey, queryParamKey, minChars]);

  // Handler pro změnu inputu
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsDropdownOpen(true);

    // Debounce API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchOptions(newValue);
    }, 300);
  };

  // Handler pro výběr option
  const handleSelectOption = (option) => {
    // Označíme, že právě proběhl výběr - useEffect to přeskočí
    justSelectedRef.current = true;

    setSelectedOption(option);
    setDisplayValue(option.label);
    setInputValue('');
    setOptions([]);
    setIsDropdownOpen(false);

    // NOVÉ: Pokud returnFullItem nebo fillFields, pošleme i raw data
    if (returnFullItem) {
      onChange(option.value, option.raw);
    } else {
      onChange(option.value);
    }
  };

  // Handler pro vymazání výběru
  const handleClear = () => {
    setSelectedOption(null);
    setDisplayValue('');
    setInputValue('');
    setOptions([]);

    // Při vymazání pošleme prázdnou hodnotu a null pro raw data
    if (returnFullItem) {
      onChange('', null);
    } else {
      onChange('');
    }
  };

  // Handler pro focus na input
  const handleFocus = () => {
    if (inputValue.length >= minChars) {
      setIsDropdownOpen(true);
    }
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label htmlFor={key}>{label}</Label>

      <div className="relative">
        {/* Zobrazení vybrané hodnoty nebo input pro vyhledávání */}
        {selectedOption ? (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
            <span className="text-gray-900 dark:text-white truncate">
              {displayValue}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              aria-label="Vymazat výběr"
            >
              <HiX className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <TextInput
              ref={inputRef}
              id={key}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              placeholder={placeholder || `Hledat ${label.toLowerCase()}...`}
              autoComplete="off"
            />
            {/* Loading indicator uvnitř inputu */}
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
          </div>
        )}

        {/* Dropdown s výsledky */}
        {isDropdownOpen && !selectedOption && (
         <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600 max-h-60 overflow-y-auto">
            {inputValue.length < minChars ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 ">
                Zadejte alespoň {minChars} {minChars === 1 ? 'znak' : minChars < 5 ? 'znaky' : 'znaků'}...
              </div>
            ) : loading ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Spinner size="sm" />
                Hledám...
              </div>
            ) : options.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Žádné výsledky
              </div>
            ) : (
              options.map((option, index) => (
                <button
                  key={option.value ?? `option-${index}`}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AsyncSelectFilter;
