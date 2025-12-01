// src/pages/ProductsPage.jsx
import { Spinner } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HiOutlineDocumentDuplicate,
  HiOutlineStar,
  HiOutlineTag,
} from 'react-icons/hi';
import api from '../api/client';
import { DataTable } from '../components/DataTable/DataTable';

export const ProductsPage = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  // Fetch data z API
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const queryString = searchParams.toString();
      const url = `/api/v1/products${queryString ? `?${queryString}` : ''}`;
      
      console.log('🌐 Fetching URL:', url);
      
      const response = await api.get(url);
      setProducts(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Konfigurace tabulky
  const tableConfig = {
    title: 'Katalog produktů a služeb',
    serverSideFiltering: true,
    
    formModal: {
      size: '3xl',
    },
    
    formSections: [
      {
        key: 'basic',
        label: 'Základní údaje',
        icon: '📦',
        columns: 2,
        defaultOpen: true,
      },
      {
        key: 'pricing',
        label: 'Cena a náklady',
        icon: '💰',
        columns: 3,
        defaultOpen: true,
      },
      {
        key: 'categorization',
        label: 'Kategorizace',
        icon: '🏷️',
        columns: 2,
        defaultOpen: false,
      },
      {
        key: 'notes',
        label: 'Poznámky',
        icon: '📝',
        columns: 1,
        defaultOpen: false,
      },
    ],

    columns: [
      // =====================================================
      // ZÁKLADNÍ ÚDAJE
      // =====================================================
      {
        key: 'id',
        label: 'ID',
        type: 'number',
        sortable: true,
        editable: false,
        showInTable: true,
        showInForm: false,
      },
      {
        key: 'name',
        label: 'Název',
        type: 'text',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: 'např. Webová stránka - základní',
        helpText: 'Název produktu nebo služby',
        formSection: 'basic',
      },
      {
        key: 'code',
        label: 'Kód / SKU',
        type: 'text',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: 'WEB-001',
        helpText: 'Interní kód produktu',
        formSection: 'basic',
      },
      {
        key: 'ean',
        label: 'EAN',
        type: 'text',
        sortable: false,
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: '8591234567890',
        helpText: 'EAN/GTIN kód (pro fyzické produkty)',
        formSection: 'basic',
      },
      {
        key: 'description',
        label: 'Popis',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Detailní popis produktu nebo služby...',
        formSection: 'basic',
      },
      {
        key: 'unit',
        label: 'Jednotka',
        type: 'select',
        sortable: false,
        editable: true,
        showInTable: true,
        showInForm: true,
        options: [
          { value: 'ks', label: 'ks (kus)' },
          { value: 'hod', label: 'hod (hodina)' },
          { value: 'den', label: 'den' },
          { value: 'měsíc', label: 'měsíc' },
          { value: 'rok', label: 'rok' },
          { value: 'projekt', label: 'projekt' },
          { value: 'm', label: 'm (metr)' },
          { value: 'm²', label: 'm² (metr čtvereční)' },
          { value: 'kg', label: 'kg (kilogram)' },
          { value: 'l', label: 'l (litr)' },
        ],
        defaultValue: 'ks',
        formSection: 'basic',
      },

      // =====================================================
      // CENA A NÁKLADY
      // =====================================================
      {
        key: 'price',
        label: 'Prodejní cena',
        type: 'currency',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        defaultValue: 0,
        helpText: 'Cena bez DPH',
        formSection: 'pricing',
      },
      {
        key: 'currency',
        label: 'Měna',
        type: 'select',
        editable: true,
        showInTable: false,
        showInForm: true,
        options: [
          { value: 'CZK', label: 'CZK' },
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ],
        defaultValue: 'CZK',
        formSection: 'pricing',
      },
      {
        key: 'tax_rate',
        label: 'Sazba DPH (%)',
        type: 'select',
        sortable: false,
        editable: true,
        showInTable: true,
        showInForm: true,
        options: [
          { value: 21, label: '21% (základní)' },
          { value: 15, label: '15% (snížená)' },
          { value: 10, label: '10% (snížená)' },
          { value: 0, label: '0% (osvobozeno)' },
        ],
        defaultValue: 21,
        formSection: 'pricing',
      },
      {
        key: 'cost',
        label: 'Náklady',
        type: 'currency',
        sortable: true,
        editable: true,
        showInTable: false,
        showInForm: true,
        defaultValue: 0,
        helpText: 'Nákupní cena / vlastní náklady (pro výpočet marže)',
        formSection: 'pricing',
      },
      {
        key: 'margin_percent',
        label: 'Marže',
        type: 'percentage',
        sortable: true,
        editable: false,
        showInTable: true,
        showInForm: false,
        helpText: 'Vypočteno automaticky',
      },
      {
        key: 'price_with_vat',
        label: 'Cena s DPH',
        type: 'currency',
        sortable: false,
        editable: false,
        showInTable: false,
        showInForm: false,
        helpText: 'Vypočteno automaticky',
      },

      // =====================================================
      // KATEGORIZACE
      // =====================================================
      {
        key: 'category',
        label: 'Kategorie',
        type: 'async-select',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        endpoint: '/api/v1/products/categories',
        // Pro kategorie - umožnit i vlastní hodnotu
        allowCreate: true,
        placeholder: 'Vyberte nebo zadejte kategorii...',
        formSection: 'categorization',
      },
      {
        key: 'tags',
        label: 'Štítky',
        type: 'tags',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Přidat štítek...',
        formSection: 'categorization',
      },

      // =====================================================
      // STAV
      // =====================================================
      {
        key: 'is_active',
        label: 'Aktivní',
        type: 'boolean',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        defaultValue: true,
        helpText: 'Zobrazovat v nabídce?',
        formSection: 'categorization',
      },
      {
        key: 'is_featured',
        label: '⭐ Oblíbený',
        type: 'boolean',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        defaultValue: false,
        helpText: 'Zobrazit nahoře v seznamu',
        formSection: 'categorization',
      },

      // =====================================================
      // POZNÁMKY
      // =====================================================
      {
        key: 'notes',
        label: 'Interní poznámky',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Poznámky k produktu (nevidí zákazník)...',
        formSection: 'notes',
      },

      // =====================================================
      // AUDIT
      // =====================================================
      {
        key: 'created_at',
        label: 'Vytvořeno',
        type: 'datetime',
        sortable: true,
        editable: false,
        showInTable: false,
        showInForm: false,
      },
      {
        key: 'updated_at',
        label: 'Upraveno',
        type: 'datetime',
        sortable: true,
        editable: false,
        showInTable: false,
        showInForm: false,
      },
    ],

    data: products,

    endpoints: {
      create: '/api/v1/products',
      update: '/api/v1/products',
      delete: '/api/v1/products',
      bulkDelete: '/api/v1/products/bulk',
      export: '/api/v1/products/export',
    },

    filters: [
      {
        key: 'search',
        label: 'Hledat',
        type: 'text',
        placeholder: 'Název, kód...',
      },
      {
        key: 'category',
        label: 'Kategorie',
        type: 'async-select',
        endpoint: '/api/v1/products/categories',
        placeholder: 'Všechny kategorie',
      },
      {
        key: 'is_active',
        label: 'Stav',
        type: 'select',
        options: [
          { value: '', label: 'Všechny' },
          { value: 'true', label: 'Aktivní' },
          { value: 'false', label: 'Neaktivní' },
        ],
      },
      {
        key: 'is_featured',
        label: 'Oblíbené',
        type: 'select',
        options: [
          { value: '', label: 'Všechny' },
          { value: 'true', label: 'Pouze oblíbené' },
        ],
      },
      {
        key: 'price_from',
        label: 'Cena od',
        type: 'number',
        placeholder: 'Min. cena',
      },
      {
        key: 'price_to',
        label: 'Cena do',
        type: 'number',
        placeholder: 'Max. cena',
      },
      {
        key: 'tax_rate',
        label: 'Sazba DPH',
        type: 'select',
        options: [
          { value: '', label: 'Všechny' },
          { value: '21', label: '21%' },
          { value: '15', label: '15%' },
          { value: '10', label: '10%' },
          { value: '0', label: '0%' },
        ],
      },
    ],

    actions: {
      create: true,
      edit: true,
      delete: true,
      bulkDelete: true,
      export: true,
    },

    contextActions: [
      {
        label: 'Duplikovat',
        icon: HiOutlineDocumentDuplicate,
        color: 'blue',
        onClick: async (product) => {
          try {
            const { id, created_at, updated_at, ...productData } = product;
            productData.name = `${productData.name} (kopie)`;
            productData.code = productData.code ? `${productData.code}-COPY` : null;
            
            await api.post('/api/v1/products', productData);
            fetchProducts();
          } catch (err) {
            console.error('Error duplicating product:', err);
          }
        },
      },
      {
        label: 'Označit jako oblíbený',
        icon: HiOutlineStar,
        color: 'yellow',
        condition: (product) => !product.is_featured,
        onClick: async (product) => {
          try {
            await api.patch(`/api/v1/products/${product.id}`, {
              is_featured: true,
            });
            fetchProducts();
          } catch (err) {
            console.error('Error marking as featured:', err);
          }
        },
      },
      {
        label: 'Odebrat z oblíbených',
        icon: HiOutlineStar,
        color: 'gray',
        condition: (product) => product.is_featured,
        onClick: async (product) => {
          try {
            await api.patch(`/api/v1/products/${product.id}`, {
              is_featured: false,
            });
            fetchProducts();
          } catch (err) {
            console.error('Error removing from featured:', err);
          }
        },
      },
      {
        label: 'Deaktivovat',
        icon: HiOutlineTag,
        color: 'red',
        condition: (product) => product.is_active,
        onClick: async (product) => {
          try {
            await api.patch(`/api/v1/products/${product.id}`, {
              is_active: false,
            });
            fetchProducts();
          } catch (err) {
            console.error('Error deactivating product:', err);
          }
        },
      },
      {
        label: 'Aktivovat',
        icon: HiOutlineTag,
        color: 'green',
        condition: (product) => !product.is_active,
        onClick: async (product) => {
          try {
            await api.patch(`/api/v1/products/${product.id}`, {
              is_active: true,
            });
            fetchProducts();
          } catch (err) {
            console.error('Error activating product:', err);
          }
        },
      },
    ],

    onDataChange: fetchProducts,
  };

  // Loading state
  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám produkty...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Chyba!</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={fetchProducts}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <DataTable config={tableConfig} />
    </div>
  );
};