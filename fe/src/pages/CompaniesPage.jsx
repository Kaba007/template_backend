// src/pages/CompaniesPage.jsx
import { Spinner } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { DataTable } from '../components/DataTable/DataTable';

export const CompaniesPage = () => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const queryString = searchParams.toString();
      const url = `/api/v1/companies${queryString ? `?${queryString}` : ''}`;
      const response = await api.get(url);
      setCompanies(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const tableConfig = {
    title: 'Správa Společností',
    serverSideFiltering: true,

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
        key: 'company_type',
        label: 'Typ',
        type: 'select',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        options: [
          { value: 'supplier', label: '🏭 Dodavatel' },
          { value: 'customer', label: '🛒 Odběratel' },
          { value: 'both', label: '🔄 Oboje' },
        ],
        defaultValue: 'customer',
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
        placeholder: 'Název společnosti',
      },
      {
        key: 'legal_name',
        label: 'Právní název',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Právní název (pokud se liší)',
        helpText: 'Vyplňte pouze pokud se liší od názvu',
      },

      // =====================================================
      // IDENTIFIKÁTORY
      // =====================================================
      {
        key: 'ico',
        label: 'IČO',
        type: 'text',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: '12345678',
      },
      {
        key: 'dic',
        label: 'DIČ',
        type: 'text',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: 'CZ12345678',
      },
      {
        key: 'vat_id',
        label: 'VAT ID (EU)',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'CZ12345678',
        helpText: 'Pro zahraniční obchod v EU',
      },
      {
        key: 'registration_number',
        label: 'Registrační číslo',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
      },

      // =====================================================
      // DPH STATUS
      // =====================================================
      {
        key: 'is_vat_payer',
        label: 'Plátce DPH',
        type: 'boolean',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        defaultValue: false,
      },
      {
        key: 'vat_mode',
        label: 'Režim DPH',
        type: 'select',
        editable: true,
        showInTable: false,
        showInForm: true,
        options: [
          { value: 'with_vat', label: 'S DPH' },
          { value: 'without_vat', label: 'Bez DPH' },
          { value: 'reverse_charge', label: 'Přenesená daň. povinnost' },
          { value: 'oss', label: 'OSS (One Stop Shop)' },
          { value: 'exempt', label: 'Osvobozeno od DPH' },
        ],
        defaultValue: 'without_vat',
      },

      // =====================================================
      // KONTAKT
      // =====================================================
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        sortable: true,
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: 'info@firma.cz',
      },
      {
        key: 'phone',
        label: 'Telefon',
        type: 'text',
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: '+420 123 456 789',
      },
      {
        key: 'website',
        label: 'Web',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'https://www.firma.cz',
      },

      // =====================================================
      // FAKTURAČNÍ ADRESA
      // =====================================================
      {
        key: 'address_street',
        label: 'Ulice',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Ulice 123',
        formSection: 'billing_address',
      },
      {
        key: 'address_city',
        label: 'Město',
        type: 'text',
        editable: true,
        showInTable: true,
        showInForm: true,
        placeholder: 'Praha',
        formSection: 'billing_address',
      },
      {
        key: 'address_zip',
        label: 'PSČ',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: '110 00',
        formSection: 'billing_address',
      },
      {
        key: 'address_country',
        label: 'Kód země',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'CZ',
        defaultValue: 'CZ',
        formSection: 'billing_address',
      },
      {
        key: 'address_country_name',
        label: 'Země',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Česká republika',
        defaultValue: 'Česká republika',
        formSection: 'billing_address',
      },

      // =====================================================
      // DORUČOVACÍ ADRESA
      // =====================================================
      {
        key: 'shipping_street',
        label: 'Doruč. ulice',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Ulice 456',
        helpText: 'Vyplňte pouze pokud se liší od fakturační',
        formSection: 'shipping_address',
      },
      {
        key: 'shipping_city',
        label: 'Doruč. město',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'shipping_address',
      },
      {
        key: 'shipping_zip',
        label: 'Doruč. PSČ',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'shipping_address',
      },
      {
        key: 'shipping_country',
        label: 'Doruč. kód země',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'shipping_address',
      },
      {
        key: 'shipping_country_name',
        label: 'Doruč. země',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        formSection: 'shipping_address',
      },

      // =====================================================
      // BANKOVNÍ ÚDAJE
      // =====================================================
      {
        key: 'bank_name',
        label: 'Název banky',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Česká spořitelna',
        formSection: 'bank',
      },
      {
        key: 'bank_account',
        label: 'Číslo účtu',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: '123456789/0800',
        formSection: 'bank',
      },
      {
        key: 'bank_iban',
        label: 'IBAN',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'CZ6508000000001234567890',
        formSection: 'bank',
      },
      {
        key: 'bank_swift',
        label: 'SWIFT/BIC',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'GIBACZPX',
        formSection: 'bank',
      },
      {
        key: 'bank_currency',
        label: 'Měna účtu',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'CZK',
        defaultValue: 'CZK',
        formSection: 'bank',
      },

      // =====================================================
      // VÝCHOZÍ NASTAVENÍ
      // =====================================================
      {
        key: 'default_currency',
        label: 'Výchozí měna',
        type: 'select',
        editable: true,
        showInTable: false,
        showInForm: true,
        options: [
          { value: 'CZK', label: 'CZK - Česká koruna' },
          { value: 'EUR', label: 'EUR - Euro' },
          { value: 'USD', label: 'USD - Americký dolar' },
          { value: 'GBP', label: 'GBP - Britská libra' },
        ],
        defaultValue: 'CZK',
        formSection: 'defaults',
      },
      {
        key: 'default_payment_method',
        label: 'Výchozí platba',
        type: 'select',
        editable: true,
        showInTable: false,
        showInForm: true,
        options: [
          { value: 'bank_transfer', label: 'Bankovní převod' },
          { value: 'cash', label: 'Hotově' },
          { value: 'card', label: 'Kartou' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'crypto', label: 'Kryptoměny' },
          { value: 'other', label: 'Jiné' },
        ],
        defaultValue: 'bank_transfer',
        formSection: 'defaults',
      },
      {
        key: 'default_due_days',
        label: 'Splatnost (dny)',
        type: 'number',
        editable: true,
        showInTable: false,
        showInForm: true,
        defaultValue: 14,
        helpText: 'Výchozí počet dní do splatnosti',
        formSection: 'defaults',
      },
      {
        key: 'default_vat_rate',
        label: 'Výchozí DPH %',
        type: 'percentage',
        editable: true,
        showInTable: false,
        showInForm: true,
        defaultValue: 21,
        formSection: 'defaults',
      },

      // =====================================================
      // KONTAKTNÍ OSOBA
      // =====================================================
      {
        key: 'contact_person',
        label: 'Kontaktní osoba',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Jan Novák',
        formSection: 'contact',
      },
      {
        key: 'contact_email',
        label: 'Email kontaktu',
        type: 'email',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'jan.novak@firma.cz',
        formSection: 'contact',
      },
      {
        key: 'contact_phone',
        label: 'Telefon kontaktu',
        type: 'text',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: '+420 123 456 789',
        formSection: 'contact',
      },

      // =====================================================
      // POZNÁMKY
      // =====================================================
      {
        key: 'notes',
        label: 'Poznámky',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Poznámky viditelné na fakturách...',
        formSection: 'notes',
      },
      {
        key: 'internal_notes',
        label: 'Interní poznámky',
        type: 'textarea',
        editable: true,
        showInTable: false,
        showInForm: true,
        placeholder: 'Interní poznámky (nezobrazí se na fakturách)...',
        formSection: 'notes',
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

    data: companies,

    endpoints: {
      create: '/api/v1/companies',
      update: '/api/v1/companies',
      delete: '/api/v1/companies',
      bulkDelete: '/api/v1/companies/bulk',
      export: '/api/v1/companies/export',
    },

    filters: [
      {
        key: 'company_type',
        label: 'Typ',
        type: 'select',
        options: [
          { value: 'supplier', label: 'Dodavatel' },
          { value: 'customer', label: 'Odběratel' },
          { value: 'both', label: 'Oboje' },
        ],
      },
      {
        key: 'name',
        label: 'Název',
        type: 'text',
        placeholder: 'Hledat podle názvu...',
      },
      {
        key: 'ico',
        label: 'IČO',
        type: 'text',
        placeholder: 'Hledat podle IČO...',
      },
      {
        key: 'is_vat_payer',
        label: 'Plátce DPH',
        type: 'boolean',
      },
      {
        key: 'is_active',
        label: 'Aktivní',
        type: 'boolean',
      },
    ],

    actions: {
      create: true,
      edit: true,
      delete: true,
      bulkDelete: true,
      export: true,
    },

    onDataChange: fetchCompanies,
  };

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám společnosti...</span>
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
            onClick={fetchCompanies}
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
