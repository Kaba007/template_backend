// src/pages/DealsKanbanPage.jsx
import { Spinner } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheck,
  HiOutlineDocumentText,
  HiOutlinePlay,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineEye,
  HiCurrencyDollar,
  HiOfficeBuilding,
  HiDocument,
  HiClock,
} from 'react-icons/hi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { KanbanBoard } from '../components/Kanban/KanbanBoard';
import { useToast } from '../contexts/ToastContext';

// Definice klíčů filtrů
const FILTER_KEYS = [
  'status',
  'payment_status',
  'company_id',
  'assigned_to',
  'date_from',
  'date_to',
  'search'
];

// Default filtry - nezobrazujeme cancelled a completed
const DEFAULT_FILTERS = {
  status: 'draft,confirmed,in_progress',
};

export const DealsKanbanPage = () => {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  // Načti filtry z URL
  const currentFilters = useMemo(() => {
    const filters = {};

    FILTER_KEYS.forEach(key => {
      const value = searchParams.get(key);
      if (value !== null) {
        if (value === 'true') {
          filters[key] = true;
        } else if (value === 'false') {
          filters[key] = false;
        } else {
          filters[key] = value;
        }
      }
    });

    if (Object.keys(filters).length === 0) {
      return DEFAULT_FILTERS;
    }

    return filters;
  }, [searchParams]);

  // Ulož filtry do URL
  const applyFilters = useCallback((newFilters) => {
    const params = new URLSearchParams();

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const queryString = queryParams.toString();
      const url = `/api/v1/deals${queryString ? `?${queryString}` : ''}`;

      console.log('📡 Fetching deals:', url);

      const response = await api.get(url);
      setDeals(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  // Načtení dat při změně URL (filtrů)
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // =====================================================
  // HELPER - Výpočty
  // =====================================================
  const calculateSubtotal = (items) => {
    return (items || []).reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price || 0;
      const discountPercent = item.discount_percent || 0;
      const subtotal = quantity * unitPrice;
      const discount = subtotal * (discountPercent / 100);
      return sum + (subtotal - discount);
    }, 0);
  };

  const calculateVat = (items) => {
    return (items || []).reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price || 0;
      const discountPercent = item.discount_percent || 0;
      const vatRate = item.vat_rate || 0;
      const subtotal = quantity * unitPrice;
      const discount = subtotal * (discountPercent / 100);
      const base = subtotal - discount;
      return sum + (base * (vatRate / 100));
    }, 0);
  };

  // =====================================================
  // WORKFLOW HANDLERS
  // =====================================================
  const handleConfirmDeal = useCallback(async (deal) => {
    if (!window.confirm(`Potvrdit deal "${deal.title}"?`)) return;
    try {
      await api.post(`/api/v1/deals/${deal.id}/confirm`);
      showToast('success', `Deal ${deal.deal_number} byl potvrzen`);
      await fetchDeals();
    } catch (err) {
      console.error('Error confirming deal:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message;
      showToast('error', `Chyba při potvrzování dealu: ${errorMsg}`);
    }
  }, [fetchDeals, showToast]);

  const handleStartDeal = useCallback(async (deal) => {
    if (!window.confirm(`Zahájit realizaci dealu "${deal.title}"?`)) return;
    try {
      await api.post(`/api/v1/deals/${deal.id}/start`);
      showToast('success', `Deal ${deal.deal_number} zahájen`);
      await fetchDeals();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message;
      showToast('error', `Chyba při změně stavu dealu: ${errorMsg}`);
    }
  }, [fetchDeals, showToast]);

  const handleCompleteDeal = useCallback(async (deal) => {
    if (!window.confirm(`Označit deal "${deal.title}" jako dokončený?`)) return;
    try {
      await api.post(`/api/v1/deals/${deal.id}/complete`);
      showToast('success', `Deal ${deal.deal_number} dokončen`);
      await fetchDeals();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message;
      showToast('error', `Chyba při změně stavu dealu: ${errorMsg}`);
    }
  }, [fetchDeals, showToast]);

  const handleCreateInvoice = useCallback(async (deal, invoiceType = 'invoice') => {
    try {
      if (!deal.company_id && !deal.company_name) {
        showToast('error', 'Deal nemá přiřazenou firmu. Nelze vystavit fakturu bez údajů o odběrateli.');
        return;
      }

      const suppliersResponse = await api.get('/api/v1/companies/suppliers?limit=1');
      const suppliers = suppliersResponse.data;
      
      if (!suppliers || suppliers.length === 0) {
        showToast('error', 'Není nastaven žádný dodavatel. Prosím, nejprve vytvořte dodavatele v sekci Firmy.');
        return;
      }

      const supplierId = suppliers[0].id;
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const invoiceData = {
        deal_id: deal.id,
        supplier_id: supplierId,
        invoice_type: invoiceType,
        issue_date: today,
        due_date: dueDateStr,
        tax_date: today,
        notes: deal.notes || null,
        order_number: deal.deal_number,
      };

      console.log('📤 Vytváření faktury z dealu:', deal.deal_number, 'typu:', invoiceType);
      
      const response = await api.post(
        `/api/v1/deals/${deal.id}/create-invoice`, 
        invoiceData
      );
      
      const typeLabel = invoiceType === 'proforma' ? 'Proforma' : 'Faktura';
      showToast('success', `${typeLabel} ${response.data.invoice_number} byla vytvořena`);
      
      await fetchDeals();
      navigate(`/invoices?id=${response.data.invoice_id}`);
      
    } catch (err) {
      console.error('❌ Error creating invoice:', err);
      let errorMsg = 'Neznámá chyba při vytváření faktury';
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.message) {
        errorMsg = err.message;
      }
      showToast('error', `Chyba při vytváření faktury: ${errorMsg}`);
    }
  }, [fetchDeals, navigate, showToast]);

  const handleDuplicate = useCallback(async (deal) => {
    try {
      const response = await api.get(`/api/v1/deals/${deal.id}`);
      const originalDeal = response.data;

      const { id, deal_number, created_at, updated_at, completed_at, ...dealData } = originalDeal;

      const newDeal = {
        ...dealData,
        title: `[KOPIE] ${dealData.title}`,
        status: 'draft',
        payment_status: 'unpaid',
        paid_amount: 0,
      };

      await api.post('/api/v1/deals', newDeal);
      showToast('success', 'Deal byl úspěšně duplikován');
      await fetchDeals();
    } catch (err) {
      console.error('Error duplicating deal:', err);
      showToast('error', 'Chyba při duplikování dealu');
    }
  }, [fetchDeals, showToast]);

  // Konfigurace Kanbanu
  const kanbanConfig = useMemo(() => ({
    title: 'Sales Pipeline - Dealy',

    columns: [
      { key: 'draft', label: '📝 Koncept', color: 'gray' },
      { key: 'confirmed', label: '✅ Potvrzeno', color: 'blue' },
      { key: 'in_progress', label: '🔄 V realizaci', color: 'yellow' },
      { key: 'completed', label: '✔️ Dokončeno', color: 'green' },
      { key: 'cancelled', label: '❌ Zrušeno', color: 'red' },
    ],

    formSections: [
      {
        key: 'basic',
        label: 'Základní údaje',
        icon: '📋',
        columns: 2,
        defaultOpen: true,
      },
      {
        key: 'company',
        label: 'Zákazník',
        icon: '🏢',
        columns: 2,
        defaultOpen: true,
      },
      {
        key: 'items',
        label: 'Položky objednávky',
        icon: '📦',
        columns: 1,
        defaultOpen: true,
      },
      {
        key: 'totals',
        label: 'Celkový souhrn',
        icon: '🧮',
        columns: 4,
        defaultOpen: true,
      },
      {
        key: 'finance',
        label: 'Finance',
        icon: '💰',
        columns: 3,
        defaultOpen: true,
      },
      {
        key: 'dates',
        label: 'Termíny',
        icon: '📅',
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

    formModal: {
      size: '8xl',
    },

    fields: [
      // =====================================================
      // ZÁKLADNÍ ÚDAJE
      // =====================================================
      {
        key: 'id',
        label: 'ID',
        type: 'number',
        editable: false,
        showInCard: false,
        showInForm: false,
      },
      {
        key: 'deal_number',
        label: 'Číslo',
        type: 'text',
        editable: false,
        showInCard: true,
        showInForm: false,
        helpText: 'Generováno automaticky',
      },
      {
        key: 'title',
        label: 'Název',
        type: 'text',
        required: true,
        editable: true,
        showInCard: true,
        showInForm: true,
        placeholder: 'např. Web pro ACME s.r.o.',
        formSection: 'basic',
      },
      {
        key: 'user_id',
        label: 'Vlastník',
        type: 'async-select',
        required: true,
        editable: true,
        showInCard: false,
        showInForm: true,
        endpoint: '/api/v1/users',
        optionValue: 'id',
        optionLabel: 'client_id',
        queryParamKey: 'client_id',
        placeholder: 'Vyberte vlastníka...',
        formSection: 'basic',
        enrich: {
          endpoint: '/api/v1/users',
          foreignKey: 'id',
          displayField: 'client_id',
          showAsBadge: false,
        },
      },
      {
        key: 'description',
        label: 'Popis',
        type: 'textarea',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Detailní popis objednávky...',
        formSection: 'basic',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        editable: false,
        showInCard: false,
        showInForm: true,
        options: [
          { value: 'draft', label: '📝 Koncept' },
          { value: 'confirmed', label: '✅ Potvrzeno' },
          { value: 'in_progress', label: '🔄 V realizaci' },
          { value: 'completed', label: '✔️ Dokončeno' },
          { value: 'cancelled', label: '❌ Zrušeno' },
        ],
        defaultValue: 'draft',
        formSection: 'basic',
      },
      {
        key: 'lead_id',
        label: 'Zdrojový Lead',
        type: 'async-select',
        editable: true,
        showInCard: false,
        showInForm: true,
        endpoint: '/api/v1/leads/simple',
        optionValue: 'id',
        optionLabel: 'title',
        queryParamKey: 'title',
        placeholder: 'Vyberte lead (nepovinné)...',
        helpText: 'Z jakého leadu deal vznikl',
        formSection: 'basic',
        enrich: {
          endpoint: '/api/v1/leads',
          foreignKey: 'id',
          displayField: 'title',
        },
      },

      // =====================================================
      // ZÁKAZNÍK
      // =====================================================
      {
        key: 'company_id',
        label: 'Firma (z databáze)',
        type: 'async-select',
        editable: true,
        showInCard: false,
        showInForm: true,
        endpoint: '/api/v1/companies/customers',
        optionValue: 'id',
        optionLabel: 'name',
        queryParamKey: 'name',
        placeholder: 'Vyberte firmu...',
        helpText: 'Vyberte existující firmu nebo zadejte název ručně níže',
        formSection: 'company',
        enrich: {
          endpoint: '/api/v1/companies',
          foreignKey: 'id',
          displayField: 'name',
        },
        fillFields: {
          company_name: 'name',
          email: 'email',
          phone: 'phone',
          contact_person: 'contact_person',
        },
      },
      {
        key: 'company_name',
        label: 'Firma',
        type: 'text',
        editable: true,
        showInCard: true,
        showInForm: true,
        placeholder: 'ACME s.r.o.',
        helpText: 'Pokud firma není v databázi',
        formSection: 'company',
      },
      {
        key: 'contact_person',
        label: 'Kontaktní osoba',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Jan Novák',
        formSection: 'company',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'kontakt@firma.cz',
        formSection: 'company',
      },
      {
        key: 'phone',
        label: 'Telefon',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: '+420 123 456 789',
        formSection: 'company',
      },

      // =====================================================
      // POLOŽKY
      // =====================================================
      {
        key: 'items',
        label: 'Položky objednávky',
        type: 'array',
        required: true,
        editable: true,
        showInCard: false,
        showInForm: true,
        minItems: 1,
        maxItems: 100,
        addButtonLabel: 'Přidat položku',
        showSummary: true,
        summaryFields: [
          { key: 'items_subtotal', label: 'Základ', type: 'sum', field: 'subtotal_after_discount' },
          { key: 'items_vat', label: 'DPH', type: 'sum', field: 'vat_amount' },
          { key: 'items_total', label: 'Celkem', type: 'sum', field: 'total' },
        ],
        defaultItem: {
          quantity: 1,
          unit: 'ks',
          unit_price: 0,
          discount_percent: 0,
          vat_rate: 21,
        },
        itemFields: [
          {
            key: 'product_id',
            label: 'Produkt',
            type: 'async-select',
            endpoint: '/api/v1/products/simple',
            optionValue: 'id',
            optionLabel: 'name',
            queryParamKey: 'name',
            placeholder: 'Vybrat produkt z katalogu...',
            minChars: 0,
            fillFields: {
              name: 'name',
              code: 'code',
              unit_price: 'price',
              vat_rate: 'tax_rate',
              unit: 'unit',
            },
          },
          {
            key: 'name',
            label: 'Název',
            type: 'text',
            required: true,
            placeholder: 'Název položky',
          },
          {
            key: 'description',
            label: 'Popis',
            type: 'text',
            placeholder: 'Popis položky (nepovinné)',
          },
          {
            key: 'code',
            label: 'Kód',
            type: 'text',
            placeholder: 'SKU/kód produktu',
          },
          {
            key: 'quantity',
            label: 'Množství',
            type: 'number',
            required: true,
            defaultValue: 1,
          },
          {
            key: 'unit',
            label: 'Jednotka',
            type: 'text',
            defaultValue: 'ks',
          },
          {
            key: 'unit_price',
            label: 'Cena/j.',
            type: 'currency',
            required: true,
          },
          {
            key: 'discount_percent',
            label: 'Sleva %',
            type: 'number',
            defaultValue: 0,
          },
          {
            key: 'vat_rate',
            label: 'DPH %',
            type: 'number',
            defaultValue: 21,
          },
          {
            key: 'subtotal',
            label: 'Základ',
            type: 'currency',
            computed: (item) => (item.quantity || 0) * (item.unit_price || 0),
          },
          {
            key: 'discount_amount',
            label: 'Sleva',
            type: 'currency',
            computed: (item) => {
              const subtotal = (item.quantity || 0) * (item.unit_price || 0);
              return subtotal * ((item.discount_percent || 0) / 100);
            },
          },
          {
            key: 'subtotal_after_discount',
            label: 'Po slevě',
            type: 'currency',
            computed: (item) => {
              const subtotal = (item.quantity || 0) * (item.unit_price || 0);
              const discount = subtotal * ((item.discount_percent || 0) / 100);
              return subtotal - discount;
            },
          },
          {
            key: 'vat_amount',
            label: 'DPH',
            type: 'currency',
            computed: (item) => {
              const subtotal = (item.quantity || 0) * (item.unit_price || 0);
              const discount = subtotal * ((item.discount_percent || 0) / 100);
              const base = subtotal - discount;
              return base * ((item.vat_rate || 0) / 100);
            },
          },
          {
            key: 'total',
            label: 'Celkem',
            type: 'currency',
            computed: (item) => {
              const subtotal = (item.quantity || 0) * (item.unit_price || 0);
              const discount = subtotal * ((item.discount_percent || 0) / 100);
              const base = subtotal - discount;
              const vat = base * ((item.vat_rate || 0) / 100);
              return base + vat;
            },
          },
        ],
        formSection: 'items',
      },

      // =====================================================
      // CELKOVÉ SOUČTY
      // =====================================================
      {
        key: 'subtotal',
        label: 'Základ bez DPH',
        type: 'currency',
        editable: false,
        showInCard: false,
        showInForm: true,
        computed: (formData) => calculateSubtotal(formData.items),
        formSection: 'totals',
      },
      {
        key: 'total_vat',
        label: 'DPH celkem',
        type: 'currency',
        editable: false,
        showInCard: false,
        showInForm: true,
        computed: (formData) => calculateVat(formData.items),
        formSection: 'totals',
      },
      {
        key: 'rounding',
        label: 'Zaokrouhlení',
        type: 'currency',
        editable: true,
        showInCard: false,
        showInForm: true,
        defaultValue: 0,
        formSection: 'totals',
      },
      {
        key: 'total',
        label: 'Celkem k úhradě',
        type: 'currency',
        editable: false,
        showInCard: true,
        showInForm: true,
        computed: (formData) => {
          const subtotal = calculateSubtotal(formData.items);
          const vat = calculateVat(formData.items);
          const rounding = formData.rounding || 0;
          return subtotal + vat + rounding;
        },
        formatValue: (value) => {
          if (!value || value === 0) return '—';
          return `${value.toLocaleString('cs-CZ')} Kč`;
        },
        formSection: 'totals',
      },

      // =====================================================
      // FINANCE
      // =====================================================
      {
        key: 'currency',
        label: 'Měna',
        type: 'select',
        editable: true,
        showInCard: false,
        showInForm: true,
        options: [
          { value: 'CZK', label: 'CZK' },
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ],
        defaultValue: 'CZK',
        formSection: 'finance',
      },
      {
        key: 'discount',
        label: 'Sleva na celou objednávku',
        type: 'number',
        editable: true,
        showInCard: false,
        showInForm: true,
        defaultValue: 0,
        formSection: 'finance',
      },
      {
        key: 'discount_type',
        label: 'Typ slevy',
        type: 'select',
        editable: true,
        showInCard: false,
        showInForm: true,
        options: [
          { value: 'percent', label: 'Procenta (%)' },
          { value: 'fixed', label: 'Fixní částka' },
        ],
        defaultValue: 'percent',
        formSection: 'finance',
      },
      {
        key: 'payment_status',
        label: 'Stav platby',
        type: 'select',
        editable: false,
        showInCard: true,
        showInForm: false,
        options: [
          { value: 'unpaid', label: '⏳ Nezaplaceno' },
          { value: 'partial', label: '💳 Částečně' },
          { value: 'paid', label: '✅ Zaplaceno' },
          { value: 'overpaid', label: '➕ Přeplaceno' },
          { value: 'refunded', label: '↩️ Vráceno' },
        ],
      },
      {
        key: 'paid_amount',
        label: 'Zaplaceno',
        type: 'currency',
        editable: false,
        showInCard: false,
        showInForm: false,
        helpText: 'Agregováno z faktur',
      },
      {
        key: 'payment_method',
        label: 'Způsob platby',
        type: 'select',
        editable: true,
        showInCard: false,
        showInForm: true,
        options: [
          { value: 'bank_transfer', label: '🏦 Bankovní převod' },
          { value: 'cash', label: '💵 Hotovost' },
          { value: 'card', label: '💳 Kartou' },
          { value: 'cod', label: '📦 Dobírka' },
          { value: 'paypal', label: '🅿️ PayPal' },
        ],
        defaultValue: 'bank_transfer',
        formSection: 'finance',
      },

      // =====================================================
      // TERMÍNY
      // =====================================================
      {
        key: 'deal_date',
        label: 'Datum uzavření',
        type: 'date',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'dates',
      },
      {
        key: 'delivery_date',
        label: 'Očekávané dodání',
        type: 'date',
        editable: true,
        showInCard: true,
        showInForm: true,
        formSection: 'dates',
      },
      {
        key: 'completed_at',
        label: 'Dokončeno',
        type: 'datetime',
        editable: false,
        showInCard: false,
        showInForm: false,
      },

      // =====================================================
      // POZNÁMKY
      // =====================================================
      {
        key: 'tags',
        label: 'Štítky',
        type: 'tags',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Přidat štítek...',
        formSection: 'notes',
      },
      {
        key: 'notes',
        label: 'Poznámky (pro zákazníka)',
        type: 'textarea',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Poznámky viditelné na dokladech...',
        formSection: 'notes',
      },
      {
        key: 'internal_notes',
        label: 'Interní poznámky',
        type: 'textarea',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Interní poznámky (nevidí zákazník)...',
        formSection: 'notes',
      },

      // =====================================================
      // AUDIT
      // =====================================================
      {
        key: 'created_at',
        label: 'Vytvořeno',
        type: 'datetime',
        editable: false,
        showInCard: false,
        showInForm: false,
      },
      {
        key: 'updated_at',
        label: 'Upraveno',
        type: 'datetime',
        editable: false,
        showInCard: false,
        showInForm: false,
      },
    ],

    filters: [
      {
        key: 'search',
        label: 'Hledat',
        type: 'text',
        placeholder: 'Číslo, název, firma...',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'multi-select',
        options: [
          { value: 'draft', label: 'Koncept' },
          { value: 'confirmed', label: 'Potvrzeno' },
          { value: 'in_progress', label: 'V realizaci' },
          { value: 'completed', label: 'Dokončeno' },
          { value: 'cancelled', label: 'Zrušeno' },
        ],
      },
      {
        key: 'payment_status',
        label: 'Stav platby',
        type: 'multi-select',
        options: [
          { value: 'unpaid', label: 'Nezaplaceno' },
          { value: 'partial', label: 'Částečně' },
          { value: 'paid', label: 'Zaplaceno' },
        ],
      },
      {
        key: 'company_id',
        label: 'Firma',
        type: 'async-select',
        endpoint: '/api/v1/companies/customers',
        valueKey: 'id',
        labelKey: 'name',
        queryParamKey: 'name',
        placeholder: 'Hledat firmu...',
      },
      {
        key: 'date_from',
        label: 'Datum od',
        type: 'date',
      },
      {
        key: 'date_to',
        label: 'Datum do',
        type: 'date',
      },
      {
        key: 'assigned_to',
        label: 'Přiřazeno',
        type: 'async-select',
        endpoint: '/api/v1/users',
        valueKey: 'id',
        labelKey: 'client_id',
        queryParamKey: 'client_id',
        placeholder: 'Filtrovat podle přiřazení...',
      },
    ],

    defaultFilters: DEFAULT_FILTERS,
    currentFilters,
    onApplyFilters: applyFilters,

    cardConfig: {
      displayFields: ['deal_number', 'title', 'company_name', 'total', 'payment_status', 'delivery_date'],
      
      cardColor: (item) => {
        if (item.payment_status === 'paid') return 'green';
        if (item.payment_status === 'partial') return 'yellow';
        if (!item.total || item.total === 0) return 'gray';
        if (item.total >= 100000) return 'blue';
        return 'gray';
      },
      
      cardIcon: (item) => {
        switch (item.status) {
          case 'draft': return HiDocument;
          case 'confirmed': return HiOutlineCheck;
          case 'in_progress': return HiClock;
          case 'completed': return HiOutlineCheck;
          case 'cancelled': return HiOutlineX;
          default: return HiDocument;
        }
      },
      
      showAvatar: true,
      avatarInitials: (item) => {
        if (item.company_name) {
          return item.company_name.substring(0, 2).toUpperCase();
        }
        if (item.deal_number) {
          return item.deal_number.substring(0, 2).toUpperCase();
        }
        return '?';
      },
      avatarLabel: (item) => {
        return item.company_name || item.deal_number || 'Bez firmy';
      },
      
      cardBadges: [
        {
          field: 'payment_status',
          getColor: (value) => {
            switch (value) {
              case 'paid': return 'success';
              case 'partial': return 'warning';
              case 'unpaid': return 'gray';
              default: return 'gray';
            }
          },
          formatValue: (value) => {
            switch (value) {
              case 'paid': return '✅ Zaplaceno';
              case 'partial': return '💳 Částečně';
              case 'unpaid': return '⏳ Nezaplaceno';
              case 'overpaid': return '➕ Přeplaceno';
              case 'refunded': return '↩️ Vráceno';
              default: return value;
            }
          },
        },
      ],
    },

    data: deals,

    contextActions: [
      // =====================================================
      // WORKFLOW AKCE
      // =====================================================
      {
        label: '✅ Potvrdit',
        icon: HiOutlineCheck,
        color: 'green',
        condition: (deal) => deal.status === 'draft',
        onClick: handleConfirmDeal,
      },
      {
        label: '▶️ Zahájit realizaci',
        icon: HiOutlinePlay,
        color: 'blue',
        condition: (deal) => ['draft', 'confirmed'].includes(deal.status),
        onClick: handleStartDeal,
      },
      {
        label: '✔️ Dokončit',
        icon: HiOutlineCheck,
        color: 'green',
        condition: (deal) => deal.status === 'in_progress',
        onClick: handleCompleteDeal,
      },

      // =====================================================
      // FAKTURACE
      // =====================================================
      {
        label: '📄 Vystavit fakturu',
        icon: HiOutlineDocumentText,
        color: 'purple',
        condition: (deal) => deal.status !== 'cancelled' && deal.company_id,
        onClick: (deal) => handleCreateInvoice(deal, 'invoice'),
      },
      {
        label: '📋 Vystavit proformu',
        icon: HiOutlineDocumentText,
        color: 'blue',
        condition: (deal) => deal.status !== 'cancelled' && deal.company_id,
        onClick: (deal) => handleCreateInvoice(deal, 'proforma'),
      },

      // =====================================================
      // DALŠÍ AKCE
      // =====================================================
      {
        label: '📄 Duplikovat',
        icon: HiDocument,
        onClick: handleDuplicate,
      },
      {
        label: '👁️ Zobrazit faktury',
        icon: HiOutlineEye,
        color: 'gray',
        condition: (deal) => deal.invoices_summary?.length > 0,
        onClick: (deal) => {
          navigate(`/invoices?deal_id=${deal.id}`);
        },
      },
      {
        label: '👁️ Zobrazit lead',
        icon: HiOutlineEye,
        color: 'gray',
        condition: (deal) => deal.lead_id,
        onClick: (deal) => {
          navigate(`/leads?id=${deal.lead_id}`);
        },
      },
    ],

    endpoints: {
      create: '/api/v1/deals',
      update: '/api/v1/deals',
      delete: '/api/v1/deals',
      updateStatus: '/api/v1/deals',
    },
    
    actions: {
      create: true,
      edit: true,
      delete: true,
      export: true,
    },
    
    statusField: 'status',
    onDataChange: fetchDeals,
  }), [deals, currentFilters, applyFilters, fetchDeals, handleConfirmDeal, handleStartDeal, handleCompleteDeal, handleCreateInvoice, handleDuplicate, navigate]);

  if (loading && deals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám objednávky...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Chyba!</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={fetchDeals}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <KanbanBoard config={kanbanConfig} />
    </div>
  );
};