// src/pages/DealsPage.jsx - FINÁLNÍ VERZE
import { Button, Modal, Spinner, TextInput, Label } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import {
  HiOutlineCheck,
  HiOutlineDocumentText,
  HiOutlinePlay,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineEye,
} from 'react-icons/hi';
import api from '../api/client';
import { DataTable } from '../components/DataTable/DataTable';

export const DealsPage = () => {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Modal pro zrušení dealu
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const { showToast } = useToast();

  // Fetch data z API
  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const queryString = searchParams.toString();
      const url = `/api/v1/deals${queryString ? `?${queryString}` : ''}`;

      console.log('🌐 Fetching URL:', url);

      const response = await api.get(url);
      console.log('📦 Received deals:', response.data);
      setDeals(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

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
  const handleConfirmDeal = async (deal) => {
    if (!window.confirm(`Potvrdit deal "${deal.title}"?`)) return;
    try {
      await api.post(`/api/v1/deals/${deal.id}/confirm`);
      fetchDeals();
    } catch (err) {
      console.error('Error confirming deal:', err);
      alert('Chyba při potvrzování dealu');
    }
  };

  const handleStartDeal = async (deal) => {
    if (!window.confirm(`Zahájit realizaci dealu "${deal.title}"?`)) return;
    try {
      await api.post(`/api/v1/deals/${deal.id}/start`);
      fetchDeals();
    } catch (err) {
      console.error('Error starting deal:', err);
      alert('Chyba při zahájení dealu');
    }
  };

  const handleCompleteDeal = async (deal) => {
    if (!window.confirm(`Označit deal "${deal.title}" jako dokončený?`)) return;
    try {
      await api.post(`/api/v1/deals/${deal.id}/complete`);
      fetchDeals();
    } catch (err) {
      console.error('Error completing deal:', err);
      alert('Chyba při dokončování dealu');
    }
  };

  const handleCancelDeal = async () => {
    if (!selectedDeal) return;
    try {
      await api.post(`/api/v1/deals/${selectedDeal.id}/cancel`, null, {
        params: { reason: cancelReason },
      });
      setCancelModalOpen(false);
      setCancelReason('');
      setSelectedDeal(null);
      fetchDeals();
    } catch (err) {
      console.error('Error cancelling deal:', err);
      alert('Chyba při rušení dealu');
    }
  };

  /**
   * Vytvoří fakturu z dealu pomocí backend API
   * @param {Object} deal - Deal objekt
   * @param {string} invoiceType - Typ faktury ('invoice' | 'proforma')
   */
  const handleCreateInvoice = async (deal, invoiceType = 'invoice') => {
    try {
      // 1. Kontrola že deal má firmu
      if (!deal.company_id && !deal.company_name) {
        alert('⚠️ Deal nemá přiřazenou firmu.\nNelze vystavit fakturu bez údajů o odběrateli.');
        return;
      }

      // 2. Zjistit dodavatele
      // V produkci by mělo být v systémových nastavení, zatím použijeme první firmu typu supplier
      const suppliersResponse = await api.get('/api/v1/companies/suppliers?limit=1');
      const suppliers = suppliersResponse.data;
      
      if (!suppliers || suppliers.length === 0) {
        alert('⚠️ Není nastaven žádný dodavatel.\n\nProsím, nejprve vytvořte dodavatele v sekci Firmy a označte ho jako "Dodavatel".');
        return;
      }

      const supplierId = suppliers[0].id;

      // 3. Připravit data pro vytvoření faktury
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // Splatnost 14 dní (lze změnit)
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const invoiceData = {
        deal_id: deal.id,
        supplier_id: supplierId,
        invoice_type: invoiceType, // 'invoice' nebo 'proforma'
        issue_date: today,
        due_date: dueDateStr,
        tax_date: today, // DUZP = datum vystavení
        notes: deal.notes || null,
        order_number: deal.deal_number, // Číslo objednávky na faktuře
      };

      // 4. Volání backend API
      console.log('📤 Vytváření faktury z dealu:', deal.deal_number, 'typu:', invoiceType);
      
      const response = await api.post(
        `/api/v1/deals/${deal.id}/create-invoice`, 
        invoiceData
      );
      
      // 5. Úspěšné vytvoření
      const typeLabel = invoiceType === 'proforma' ? 'Proforma' : 'Faktura';
      alert(
        `✅ ${response.data.message}\n\n` +
        `${typeLabel}: ${response.data.invoice_number}\n` +
        `Deal: ${response.data.deal_number}\n` +
        `Celkem: ${response.data.total} ${response.data.currency}`
      );
      
      // 6. Refresh seznamu dealů (může se změnit payment_status)
      fetchDeals();
      
      // 7. Přesměrovat na detail faktury
      navigate(`/invoices?id=${response.data.invoice_id}`);
      
    } catch (err) {
      console.error('❌ Error creating invoice:', err);
      
      // Rozpoznání různých typů chyb
      let errorMsg = 'Neznámá chyba při vytváření faktury';
      
      if (err.response?.data?.detail) {
        // FastAPI error detail
        errorMsg = err.response.data.detail;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      alert(`❌ Chyba při vytváření faktury:\n\n${errorMsg}`);
    }
  };

  const handleRecalculatePayments = async (deal) => {
    try {
      await api.post(`/api/v1/deals/${deal.id}/recalculate-payments`);
      fetchDeals();
    } catch (err) {
      console.error('Error recalculating payments:', err);
    }
  };

  const openCancelModal = (deal) => {
    setSelectedDeal(deal);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  // =====================================================
  // TABLE CONFIG
  // =====================================================
  const tableConfig = {
    title: 'Správa objednávek (Deals)',
    serverSideFiltering: true,

    formModal: {
      size: '8xl',
    },

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
        showInTable: false,
        showInForm: false,
      },
      {
        key: 'deal_number',
        label: 'Číslo',
        type: 'text',
        sortable: true,
        editable: false,
        showInTable: true,
        showInForm: false,
        helpText: 'Generováno automaticky',
      },
      {
        key: 'title',
        label: 'Název',
        type: 'text',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: 'např. Web pro ACME s.r.o.',
        formSection: 'basic',
      },
       {
        key: 'user_id',
        label: 'Přiřazeno',
        type: 'async-select',
        sortable: true,
        editable: true,
        showInTable: false,
        showInForm: true,
        endpoint: '/api/v1/users',
        optionValue: 'id',
        optionLabel: 'client_id',
        queryParamKey: 'client_id',
        placeholder: 'Přiřadit kolegovi...',
        formSection: 'basic',
      },
      {
        key: 'description',
        label: 'Popis',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Detailní popis objednávky...',
        formSection: 'basic',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
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
        sortable: false,
        editable: true,
        showInTable: false,
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
        sortable: true,
        editable: true,
        showInTable: false,
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
        sortable: true,
        editable: true,
        showInTable: true,
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
        showInTable: false,
        showInForm: true,
        placeholder: 'Jan Novák',
        formSection: 'company',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'text',
        sortable: true,
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'kontakt@firma.cz',
        formSection: 'company',
      },
      {
        key: 'phone',
        label: 'Telefon',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: '+420 123 456 789',
        formSection: 'company',
      },

      // =====================================================
      // POLOŽKY - TYPE ARRAY s podporou ajax-select
      // =====================================================
      {
        key: 'items',
        label: 'Položky objednávky',
        type: 'array',
        required: true,
        editable: true,
        showInTable: false,
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
          // ✅ ASYNC SELECT pro výběr produktu z katalogu
          {
            key: 'product_id',
            label: 'Produkt',
            type: 'async-select',
            endpoint: '/api/v1/products/simple',
            optionValue: 'id',
            optionLabel: 'name',
            queryParamKey: 'name',
            placeholder: 'Vybrat produkt z katalogu...',
            minChars: 0, // Zobrazí všechny produkty i bez zadání
            // Automaticky vyplní ostatní pole po výběru produktu
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
          // Computed fields
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
      // CELKOVÉ SOUČTY (COMPUTED)
      // =====================================================
      {
        key: 'subtotal',
        label: 'Základ bez DPH',
        type: 'currency',
        sortable: true,
        editable: false,
        showInTable: false,
        showInForm: true,
        computed: (formData) => calculateSubtotal(formData.items),
        formSection: 'totals',
      },
      {
        key: 'total_vat',
        label: 'DPH celkem',
        type: 'currency',
        sortable: true,
        editable: false,
        showInTable: false,
        showInForm: true,
        computed: (formData) => calculateVat(formData.items),
        formSection: 'totals',
      },
      {
        key: 'rounding',
        label: 'Zaokrouhlení',
        type: 'currency',
        editable: true,
        showInTable: false,
        showInForm: true,
        defaultValue: 0,
        formSection: 'totals',
      },
      {
        key: 'total',
        label: 'Celkem k úhradě',
        type: 'currency',
        sortable: true,
        editable: false,
        showInTable: true,
        showInForm: true,
        computed: (formData) => {
          const subtotal = calculateSubtotal(formData.items);
          const vat = calculateVat(formData.items);
          const rounding = formData.rounding || 0;
          return subtotal + vat + rounding;
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
        showInTable: false,
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
        showInTable: false,
        showInForm: true,
        defaultValue: 0,
        formSection: 'finance',
      },
      {
        key: 'discount_type',
        label: 'Typ slevy',
        type: 'select',
        editable: true,
        showInTable: false,
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
        sortable: true,
        editable: false,
        showInTable: true,
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
        sortable: true,
        editable: false,
        showInTable: true,
        showInForm: false,
        helpText: 'Agregováno z faktur',
      },
      {
        key: 'payment_method',
        label: 'Způsob platby',
        type: 'select',
        editable: true,
        showInTable: false,
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
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        formSection: 'dates',
      },
      {
        key: 'delivery_date',
        label: 'Očekávané dodání',
        type: 'date',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        formSection: 'dates',
      },
      {
        key: 'completed_at',
        label: 'Dokončeno',
        type: 'datetime',
        sortable: true,
        editable: false,
        showInTable: false,
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
        showInTable: false,
        showInForm: true,
        placeholder: 'Přidat štítek...',
        formSection: 'notes',
      },
      {
        key: 'notes',
        label: 'Poznámky (pro zákazníka)',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Poznámky viditelné na dokladech...',
        formSection: 'notes',
      },
      {
        key: 'internal_notes',
        label: 'Interní poznámky',
        type: 'textarea',
        editable: true,
        showInTable: false,
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
        sortable: true,
        editable: false,
        showInTable: true,
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

    data: deals,

    endpoints: {
      create: '/api/v1/deals',
      update: '/api/v1/deals',
      delete: '/api/v1/deals',
      bulkDelete: '/api/v1/deals/bulk',
      export: '/api/v1/deals/export',
    },

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

    actions: {
      create: true,
      edit: true,
      delete: true,
      bulkDelete: true,
      export: true,
    },

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
      {
        label: '❌ Zrušit',
        icon: HiOutlineX,
        color: 'red',
        condition: (deal) => !['completed', 'cancelled'].includes(deal.status),
        onClick: openCancelModal,
      },

      // =====================================================
      // FAKTURACE - Přesměrování místo modálu
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
        label: '🔄 Přepočítat platby',
        icon: HiOutlineRefresh,
        color: 'gray',
        onClick: handleRecalculatePayments,
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

    onDataChange: fetchDeals,
  };

  // =====================================================
  // RENDER
  // =====================================================
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
    <div className="p-6">
      <DataTable config={tableConfig} />

      {/* =====================================================
          MODAL - Zrušení dealu (jediný zbývající modál)
          ===================================================== */}
      <Modal show={cancelModalOpen} onClose={() => setCancelModalOpen(false)} size="md">
        <Modal.Header>❌ Zrušit deal</Modal.Header>
        <Modal.Body>
          {selectedDeal && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Rušíte deal:</p>
                <p className="font-semibold">{selectedDeal.deal_number} - {selectedDeal.title}</p>
              </div>

              <div>
                <Label htmlFor="cancel_reason">Důvod zrušení</Label>
                <TextInput
                  id="cancel_reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Proč rušíte tento deal?"
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setCancelModalOpen(false)}>
            Zpět
          </Button>
          <Button color="failure" onClick={handleCancelDeal}>
            <HiOutlineX className="mr-2 h-5 w-5" />
            Zrušit deal
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};