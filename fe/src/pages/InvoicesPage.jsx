// src/pages/InvoicesPage.jsx
import { Spinner } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { DataTable } from '../components/DataTable/DataTable';

export const InvoicesPage = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const queryString = searchParams.toString();
      const url = `/api/v1/invoices${queryString ? `?${queryString}` : ''}`;
      const response = await api.get(url);
      setInvoices(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // =====================================================
  // HELPER - Výpočty pro faktury
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

  const calculateVat = (items, vatMode) => {
    if (vatMode !== 'with_vat') return 0;
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
  // KONFIGURACE
  // =====================================================
  const tableConfig = {
    title: 'Správa Faktur',
    serverSideFiltering: true,
    formModal: {
        size: '6xl',  // Možnosti: 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'
        // Nebo vlastní šířka:
        // maxWidth: '1400px',
      },
    formSections: [
    {
      key: 'basic',
      label: 'Základní údaje',
      icon: '📄',
      columns: 4,        // 4 pole na řádek
      defaultOpen: true, // Rozbaleno při otevření
    },
    {
      key: 'supplier',
      label: 'Dodavatel',
      icon: '🏢',
      columns: 3,        // 3 pole na řádek
      defaultOpen: true,
    },
    {
      key: 'customer',
      label: 'Odběratel',
      icon: '👤',
      columns: 3,
      defaultOpen: true,
    },
    {
      key: 'shipping',
      label: 'Doručovací adresa',
      icon: '📦',
      columns: 3,
      defaultOpen: false, // Sbaleno - není tak důležité
    },
    {
      key: 'dates',
      label: 'Datumy',
      icon: '📅',
      columns: 4,        // 4 datumy vedle sebe
      defaultOpen: true,
    },
    {
      key: 'currency',
      label: 'Měna a DPH',
      icon: '💱',
      columns: 4,
      defaultOpen: true,
    },
    {
      key: 'payment',
      label: 'Platba',
      icon: '💳',
      columns: 3,
      defaultOpen: true,
    },
    {
      key: 'items',
      label: 'Položky faktury',
      icon: '📋',
      columns: 1,        // Full width pro tabulku položek
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
      key: 'texts',
      label: 'Texty a poznámky',
      icon: '📝',
      columns: 2,
      defaultOpen: false, // Sbaleno - sekundární info
    },
  ],
    columns: [
      // =====================================================
      // ZÁKLADNÍ IDENTIFIKACE
      // =====================================================
      {
        key: 'id',
        label: 'ID',
        type: 'number',
        sortable: true,
        editable: false,
        showInTable: true,
        showInForm: false,
        formSection: 'basic',
        formWidth: 1,

      },
      {
        key: 'invoice_type',
        label: 'Typ dokladu',
        type: 'select',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        formSection: 'basic',
        options: [
          { value: 'invoice', label: '📄 Faktura' },
          { value: 'proforma', label: '📋 Proforma' },
          { value: 'credit_note', label: '↩️ Dobropis' },
          { value: 'debit_note', label: '↪️ Vrubopis' },
          { value: 'receipt', label: '🧾 Příjmový doklad' },
        ],
        defaultValue: 'invoice',
      },
      {
        key: 'invoice_number',
        label: 'Číslo dokladu',
        type: 'text',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: 'Automaticky vygenerováno',
        helpText: 'Ponechte prázdné pro automatické generování',
        formSection: 'basic',
      },
      {
        key: 'variable_symbol',
        label: 'Variabilní symbol',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Automaticky z čísla faktury',
        formSection: 'basic',
      },
      {
        key: 'constant_symbol',
        label: 'Konstantní symbol',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: '0308',
        formSection: 'basic',
      },
      {
        key: 'specific_symbol',
        label: 'Specifický symbol',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'basic',
      },
      {
        key: 'order_number',
        label: 'Číslo objednávky',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'basic',
      },
      {
        key: 'contract_number',
        label: 'Číslo smlouvy',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'basic',
      },

      // =====================================================
      // DODAVATEL
      // =====================================================
      {
      key: 'supplier_id',
      label: 'Dodavatel',
      type: 'async-select',
      sortable: true,
      required: true,
      editable: true,
      showInTable: false,
      showInForm: true,
      endpoint: '/api/v1/companies/suppliers',
      optionValue: 'id',
      optionLabel: 'name',
      queryParamKey: 'name',
      placeholder: 'Vyberte dodavatele...',
      formSection: 'supplier',
        enrich: {
          endpoint: '/api/v1/companies/suppliers',
          foreignKey: 'id',
          displayField: 'name',
          showAsBadge: false,
        },
        fillFields: {
          supplier_name: 'name',
          supplier_legal_name: 'legal_name',
          supplier_ico: 'ico',
          supplier_dic: 'dic',
          supplier_vat_id: 'vat_id',
          supplier_is_vat_payer: 'is_vat_payer',
          supplier_address_street: 'address_street',
          supplier_address_city: 'address_city',
          supplier_address_zip: 'address_zip',
          supplier_address_country: 'address_country',
          supplier_address_country_name: 'address_country_name',
          supplier_email: 'email',
          supplier_phone: 'phone',
          supplier_website: 'website',
          supplier_bank_name: 'bank_name',
          supplier_bank_account: 'bank_account',
          supplier_bank_iban: 'bank_iban',
          supplier_bank_swift: 'bank_swift',
        },
      },
      // Readonly pole dodavatele
      { key: 'supplier_name', label: 'Název dodavatele', type: 'readonly', showInTable: true, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_ico', label: 'IČO dodavatele', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_dic', label: 'DIČ dodavatele', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_is_vat_payer', label: 'Plátce DPH', type: 'boolean', editable: false, showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_address_street', label: 'Ulice', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_address_city', label: 'Město', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_address_zip', label: 'PSČ', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_address_country_name', label: 'Země', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_bank_name', label: 'Banka', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_bank_account', label: 'Číslo účtu', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_bank_iban', label: 'IBAN', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },
      { key: 'supplier_bank_swift', label: 'SWIFT', type: 'readonly', showInTable: false, showInForm: true, formSection: 'supplier' },

      // =====================================================
      // ODBĚRATEL
      // =====================================================
      {
        key: 'customer_id',
        label: 'Odběratel',
        type: 'async-select',
        sortable: true,
        required: true,
        editable: true,
        showInTable: false,
        showInForm: true,
        endpoint: '/api/v1/companies/customers',
        optionValue: 'id',
        optionLabel: 'name',
        queryParamKey: 'name',
        placeholder: 'Vyberte odběratele...',
        fillFields: {
          customer_name: 'name',
          customer_legal_name: 'legal_name',
          customer_ico: 'ico',
          customer_dic: 'dic',
          customer_vat_id: 'vat_id',
          customer_address_street: 'address_street',
          customer_address_city: 'address_city',
          customer_address_zip: 'address_zip',
          customer_address_country: 'address_country',
          customer_address_country_name: 'address_country_name',
          customer_email: 'email',
          customer_phone: 'phone',
        },
        formSection: 'customer',
      },
      // Readonly pole odběratele
      { key: 'customer_name', label: 'Název odběratele', type: 'readonly', showInTable: true, showInForm: true, formSection: 'customer' },
      { key: 'customer_ico', label: 'IČO odběratele', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },
      { key: 'customer_dic', label: 'DIČ odběratele', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },
      { key: 'customer_address_street', label: 'Ulice', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },
      { key: 'customer_address_city', label: 'Město', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },
      { key: 'customer_address_zip', label: 'PSČ', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },
      { key: 'customer_address_country_name', label: 'Země', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },
      { key: 'customer_email', label: 'Email', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },
      { key: 'customer_phone', label: 'Telefon', type: 'readonly', showInTable: false, showInForm: true, formSection: 'customer' },

      // =====================================================
      // DORUČOVACÍ ADRESA (pokud se liší)
      // =====================================================
      { key: 'shipping_name', label: 'Doruč. jméno', type: 'text', editable: true, showInTable: false, showInForm: true, formSection: 'shipping' },
      { key: 'shipping_street', label: 'Doruč. ulice', type: 'text', editable: true, showInTable: false, showInForm: true, formSection: 'shipping' },
      { key: 'shipping_city', label: 'Doruč. město', type: 'text', editable: true, showInTable: false, showInForm: true, formSection: 'shipping' },
      { key: 'shipping_zip', label: 'Doruč. PSČ', type: 'text', editable: true, showInTable: false, showInForm: true, formSection: 'shipping' },
      { key: 'shipping_country_name', label: 'Doruč. země', type: 'text', editable: true, showInTable: false, showInForm: true, formSection: 'shipping' },

      // =====================================================
      // DATUMY
      // =====================================================
      {
        key: 'issue_date',
        label: 'Datum vystavení',
        type: 'date',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        defaultValue: new Date().toISOString().split('T')[0],
        formSection: 'dates',
      },
      {
        key: 'tax_date',
        label: 'DUZP',
        type: 'date',
        editable: true,
        showInTable: false,
        showInForm: true,
        helpText: 'Datum uskutečnění zdanitelného plnění',
        formSection: 'dates',
      },
      {
        key: 'due_date',
        label: 'Datum splatnosti',
        type: 'date',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        formSection: 'dates',
      },
      {
        key: 'delivery_date',
        label: 'Datum dodání',
        type: 'date',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'dates',
      },

      // =====================================================
      // MĚNA A DPH
      // =====================================================
      {
        key: 'currency',
        label: 'Měna',
        type: 'select',
        editable: true,
        showInTable: true,
        showInForm: true,
        options: [
          { value: 'CZK', label: 'CZK - Česká koruna' },
          { value: 'EUR', label: 'EUR - Euro' },
          { value: 'USD', label: 'USD - Americký dolar' },
          { value: 'GBP', label: 'GBP - Britská libra' },
          { value: 'PLN', label: 'PLN - Polský zlotý' },
          { value: 'CHF', label: 'CHF - Švýcarský frank' },
        ],
        defaultValue: 'CZK',
        formSection: 'currency',
      },
      {
        key: 'exchange_rate',
        label: 'Kurz',
        type: 'number',
        editable: true,
        showInTable: false,
        showInForm: true,
        defaultValue: 1.0,
        helpText: 'Kurz k CZK (1 pro CZK)',
        formSection: 'currency',
      },
      {
        key: 'vat_mode',
        label: 'Režim DPH',
        type: 'select',
        required: true,
        editable: true,
        showInTable: false,
        showInForm: true,
        options: [
          { value: 'with_vat', label: 'S DPH (plátce)' },
          { value: 'without_vat', label: 'Bez DPH (neplátce)' },
          { value: 'reverse_charge', label: 'Přenesená daň. povinnost' },
          { value: 'oss', label: 'OSS (One Stop Shop)' },
          { value: 'exempt', label: 'Osvobozeno od DPH' },
        ],
        defaultValue: 'with_vat',
        formSection: 'currency',
      },
      {
        key: 'vat_note',
        label: 'Poznámka k DPH',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'např. Daň odvede zákazník',
        helpText: 'Zobrazí se na faktuře',
        formSection: 'currency',
      },

      // =====================================================
      // PLATBA
      // =====================================================
      {
        key: 'payment_method',
        label: 'Způsob platby',
        type: 'select',
        editable: true,
        showInTable: true,
        showInForm: true,
        options: [
          { value: 'bank_transfer', label: '🏦 Bankovní převod' },
          { value: 'cash', label: '💵 Hotově' },
          { value: 'card', label: '💳 Kartou' },
          { value: 'paypal', label: '🅿️ PayPal' },
          { value: 'crypto', label: '₿ Kryptoměny' },
          { value: 'other', label: '📋 Jiné' },
        ],
        defaultValue: 'bank_transfer',
        formSection: 'payment',
      },
      {
        key: 'status',
        label: 'Stav',
        type: 'select',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        options: [
          { value: 'draft', label: '📝 Koncept' },
          { value: 'sent', label: '📤 Odesláno' },
          { value: 'viewed', label: '👁️ Zobrazeno' },
          { value: 'paid', label: '✅ Zaplaceno' },
          { value: 'partially_paid', label: '⏳ Částečně zaplaceno' },
          { value: 'overdue', label: '⚠️ Po splatnosti' },
          { value: 'cancelled', label: '❌ Stornováno' },
        ],
        defaultValue: 'draft',
        formSection: 'payment',
      },
      {
        key: 'paid_amount',
        label: 'Zaplaceno',
        type: 'currency',
        editable: true,
        showInTable: false,
        showInForm: true,
        defaultValue: 0,
        formSection: 'payment',
      },

      // =====================================================
      // POLOŽKY FAKTURY
      // =====================================================
      {
        key: 'items',
        label: 'Položky faktury',
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
          vat_rate: 21,
          discount_percent: 0,
        },
        itemFields: [
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
            placeholder: 'Popis položky',
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
            label: 'Cena/ks',
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
        showInTable: true,
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
        showInTable: true,
        showInForm: true,
        computed: (formData) => calculateVat(formData.items, formData.vat_mode),
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
          const vat = calculateVat(formData.items, formData.vat_mode);
          const rounding = formData.rounding || 0;
          return subtotal + vat + rounding;
        },
        formSection: 'totals',
      },

      // =====================================================
      // TEXTY NA FAKTUŘE
      // =====================================================
      {
        key: 'header_text',
        label: 'Text v záhlaví',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Text zobrazený v záhlaví faktury...',
        formSection: 'texts',
      },
      {
        key: 'footer_text',
        label: 'Text v patičce',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Text zobrazený v patičce faktury...',
        formSection: 'texts',
      },
      {
        key: 'notes',
        label: 'Poznámky',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Poznámky viditelné na faktuře...',
        formSection: 'texts',
      },
      {
        key: 'payment_instructions',
        label: 'Platební instrukce',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Speciální platební instrukce...',
        formSection: 'texts',
      },
      {
        key: 'internal_notes',
        label: 'Interní poznámky',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Interní poznámky (nezobrazí se na faktuře)...',
        formSection: 'texts',
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
    ],

    data: invoices,

    endpoints: {
      create: '/api/v1/invoices',
      update: '/api/v1/invoices',
      delete: '/api/v1/invoices',
      bulkDelete: '/api/v1/invoices/bulk',
      export: '/api/v1/invoices/export',
    },

    filters: [
      {
        key: 'invoice_type',
        label: 'Typ',
        type: 'select',
        options: [
          { value: 'invoice', label: 'Faktura' },
          { value: 'proforma', label: 'Proforma' },
          { value: 'credit_note', label: 'Dobropis' },
          { value: 'debit_note', label: 'Vrubopis' },
          { value: 'receipt', label: 'Příjmový doklad' },
        ],
      },
      {
        key: 'status',
        label: 'Stav',
        type: 'select',
        options: [
          { value: 'draft', label: 'Koncept' },
          { value: 'sent', label: 'Odesláno' },
          { value: 'paid', label: 'Zaplaceno' },
          { value: 'partially_paid', label: 'Částečně zaplaceno' },
          { value: 'overdue', label: 'Po splatnosti' },
          { value: 'cancelled', label: 'Stornováno' },
        ],
      },
      {
        key: 'supplier_id',
        label: 'Dodavatel',
        type: 'async-select',
        endpoint: '/api/v1/companies/suppliers',
        valueKey: 'id',
        labelKey: 'name',
        queryParamKey: 'name',
        placeholder: 'Hledat dodavatele...',
        minChars: 2,

      },
      {
        key: 'customer_id',
        label: 'Odběratel',
        type: 'async-select',
        endpoint: '/api/v1/companies',
        valueKey: 'id',
        labelKey: 'name',
        queryParamKey: 'name',
        placeholder: 'Hledat odběratele...',
        minChars: 2,
      },
      {
        key: 'invoice_number',
        label: 'Číslo dokladu',
        type: 'text',
        placeholder: 'Hledat číslo...',
      },
      {
        key: 'issue_date_from',
        label: 'Vystaveno od',
        type: 'date',
      },
      {
        key: 'issue_date_to',
        label: 'Vystaveno do',
        type: 'date',
      },
      {
        key: 'currency',
        label: 'Měna',
        type: 'select',
        options: [
          { value: 'CZK', label: 'CZK' },
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
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

    onDataChange: fetchInvoices,
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám faktury...</span>
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
            onClick={fetchInvoices}
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
