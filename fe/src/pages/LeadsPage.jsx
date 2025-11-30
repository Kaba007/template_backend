// src/pages/LeadsPage.jsx
import { Spinner } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { DataTable } from '../components/DataTable/DataTable';

export const LeadsPage = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  // Fetch data z API - parametry se berou přímo z URL
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);

      // Sestavit query string přímo z URL search params
      const queryString = searchParams.toString();
      const url = `/api/v1/leads${queryString ? `?${queryString}` : ''}`;

      console.log('🌐 Fetching URL:', url);

      const response = await api.get(url);
      setLeads(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Načtení dat při změně URL parametrů
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

const tableConfig = {
  title: 'Správa Leadů',
  serverSideFiltering: true,
  formModal: {
    size: '4xl',
  },
  formSections: [
    {
      key: 'basic',
      label: 'Základní údaje',
      icon: '🎯',
      columns: 3,
      defaultOpen: true,
    },
    {
      key: 'company',
      label: 'Společnost',
      icon: '🏢',
      columns: 2,
      defaultOpen: true,
    },

    {
      key: 'value',
      label: 'Hodnota a pravděpodobnost',
      icon: '💰',
      columns: 3,
      defaultOpen: true,
    },
    {
      key: 'source',
      label: 'Zdroj leadu',
      icon: '📍',
      columns: 3,
      defaultOpen: false,
    },
    {
      key: 'timeline',
      label: 'Časová osa',
      icon: '📅',
      columns: 2,
      defaultOpen: false,
    },
    {
      key: 'qualification',
      label: 'BANT Kvalifikace',
      icon: '✅',
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
      key: 'title',
      label: 'Název',
      type: 'text',
      sortable: true,
      required: true,
      editable: true,
      showInTable: true,
      showInForm: true,
      placeholder: 'např. Nový web pro e-shop',
      formSection: 'basic',
    },
    {
      key: 'user_id',
      label: 'Vlastník',
      type: 'async-select',
      sortable: true,
      required: true,
      editable: true,
      showInTable: false,
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
      key: 'assigned_to',
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
      helpText: 'Komu je lead přiřazen k práci',
      formSection: 'basic',
    },
    {
      key: 'description',
      label: 'Popis',
      type: 'textarea',
      editable: true,
      showInTable: false,
      showInForm: true,
      placeholder: 'Detailní popis příležitosti...',
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
        { value: 'new', label: '🆕 Nový' },
        { value: 'contacted', label: '📞 Kontaktován' },
        { value: 'qualified', label: '✅ Kvalifikován' },
        { value: 'proposal', label: '📋 Nabídka' },
        { value: 'negotiation', label: '🤝 Jednání' },
        { value: 'won', label: '💰 Vyhrán' },
        { value: 'lost', label: '❌ Ztracen' },
      ],
      defaultValue: 'new',
      formSection: 'basic',
    },
    

    // =====================================================
    // SPOLEČNOST
    // =====================================================
    {
      key: 'company_id',
      label: 'Firma (z databáze)',
      type: 'async-select',
      sortable: true,
      editable: true,
      showInTable: false,
      showInForm: true,
      endpoint: '/api/v1/companies',
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
        showAsBadge: false,
      },
      fillFields: {
        company_name: 'name',
        email: 'email',
        phone: 'phone',
      },
    },
    {
      key: 'company_name',
      label: 'Název firmy (volný text)',
      type: 'text',
      sortable: true,
      editable: true,
      showInTable: true,
      showInForm: true,
      placeholder: 'ACME s.r.o.',
      helpText: 'Pokud firma není v databázi, zadejte název ručně',
      formSection: 'company',
    },

    // =====================================================
    // KONTAKT
    // =====================================================
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
      type: 'email',
      sortable: true,
      editable: true,
      showInTable: true,
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
    // HODNOTA
    // =====================================================
    {
      key: 'value',
      label: 'Hodnota',
      type: 'currency',
      sortable: true,
      editable: true,
      showInTable: true,
      showInForm: true,
      defaultValue: 0,
      helpText: 'Odhadovaná hodnota obchodu',
      formSection: 'value',
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
      formSection: 'value',
    },
    {
      key: 'probability',
      label: 'Pravděpodobnost (%)',
      type: 'number',
      editable: true,
      showInTable: false,
      showInForm: true,
      defaultValue: 0,
      formSection: 'value',
    },

    // =====================================================
    // ZDROJ
    // =====================================================
    {
      key: 'source',
      label: 'Zdroj',
      type: 'select',
      sortable: true,
      editable: true,
      showInTable: true,
      showInForm: true,
      options: [
        { value: 'website', label: '🌐 Web' },
        { value: 'phone', label: '📞 Telefon' },
        { value: 'email', label: '📧 Email' },
        { value: 'referral', label: '👥 Doporučení' },
        { value: 'social', label: '📱 Sociální sítě' },
        { value: 'advertising', label: '📢 Reklama' },
        { value: 'event', label: '🎪 Událost' },
        { value: 'partner', label: '🤝 Partner' },
        { value: 'other', label: '📋 Jiné' },
      ],
      defaultValue: 'other',
      formSection: 'source',
    },
    {
      key: 'source_details',
      label: 'Detaily zdroje',
      type: 'text',
      editable: true,
      showInTable: false,
      showInForm: true,
      placeholder: 'např. Google Ads - Kampaň ABC',
      formSection: 'source',
    },
    {
      key: 'campaign',
      label: 'Kampaň',
      type: 'text',
      editable: true,
      showInTable: false,
      showInForm: true,
      placeholder: 'Název marketingové kampaně',
      formSection: 'source',
    },

    // =====================================================
    // ČASOVÁ OSA
    // =====================================================
    {
      key: 'expected_close_date',
      label: 'Očekávané uzavření',
      type: 'date',
      sortable: true,
      editable: true,
      showInTable: false,
      showInForm: true,
      helpText: 'Kdy očekáváte uzavření obchodu',
      formSection: 'timeline',
    },
    {
      key: 'next_action_date',
      label: 'Datum další akce',
      type: 'date',
      sortable: true,
      editable: true,
      showInTable: false,
      showInForm: true,
      formSection: 'timeline',
    },
    {
      key: 'next_action',
      label: 'Další akce',
      type: 'text',
      editable: true,
      showInTable: false,
      showInForm: true,
      placeholder: 'Co je třeba udělat příště',
      formSection: 'timeline',
    },

    // =====================================================
    // BANT KVALIFIKACE
    // =====================================================
    {
      key: 'is_qualified',
      label: 'Kvalifikován',
      type: 'boolean',
      sortable: true,
      editable: true,
      showInTable: true,
      showInForm: true,
      defaultValue: false,
      formSection: 'qualification',
    },
    {
      key: 'qualification_score',
      label: 'Skóre kvalifikace',
      type: 'number',
      editable: true,
      showInTable: false,
      showInForm: true,
      defaultValue: 0,
      helpText: '0-100, automaticky z BANT',
      formSection: 'qualification',
    },
    {
      key: 'has_budget',
      label: '💰 Má rozpočet?',
      type: 'boolean',
      editable: true,
      showInTable: false,
      showInForm: true,
      helpText: 'Budget',
      formSection: 'qualification',
    },
    {
      key: 'has_authority',
      label: '👔 Má rozhodovací pravomoc?',
      type: 'boolean',
      editable: true,
      showInTable: false,
      showInForm: true,
      helpText: 'Authority',
      formSection: 'qualification',
    },
    {
      key: 'has_need',
      label: '🎯 Má skutečnou potřebu?',
      type: 'boolean',
      editable: true,
      showInTable: false,
      showInForm: true,
      helpText: 'Need',
      formSection: 'qualification',
    },
    {
      key: 'has_timeline',
      label: '📅 Má časový plán?',
      type: 'boolean',
      editable: true,
      showInTable: false,
      showInForm: true,
      helpText: 'Timeline',
      formSection: 'qualification',
    },

    // =====================================================
    // ZTRÁTA
    // =====================================================
    {
      key: 'lost_reason',
      label: 'Důvod ztráty',
      type: 'text',
      editable: true,
      showInTable: false,
      showInForm: true,
      placeholder: 'Proč byl lead ztracen',
      helpText: 'Vyplňte při statusu "Ztracen"',
      formSection: 'notes',
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
      label: 'Poznámky',
      type: 'textarea',
      editable: true,
      showInTable: false,
      showInForm: true,
      placeholder: 'Poznámky k leadu...',
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
      key: 'converted_at',
      label: 'Konvertováno',
      type: 'datetime',
      sortable: true,
      editable: false,
      showInTable: false,
      showInForm: false,
    },
  ],

  data: leads,

  endpoints: {
    create: '/api/v1/leads',
    update: '/api/v1/leads',
    delete: '/api/v1/leads',
    bulkDelete: '/api/v1/leads/bulk',
    export: '/api/v1/leads/export',
  },

  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'multi-select',  // MULTI-SELECT pro IN operátor!
      options: [
        { value: 'new', label: 'Nový' },
        { value: 'contacted', label: 'Kontaktován' },
        { value: 'qualified', label: 'Kvalifikován' },
        { value: 'proposal', label: 'Nabídka' },
        { value: 'negotiation', label: 'Jednání' },
        { value: 'won', label: 'Vyhrán' },
        { value: 'lost', label: 'Ztracen' },
      ],
    },
    {
      key: 'company_id',
      label: 'Firma',
      type: 'async-select',
      endpoint: '/api/v1/companies',
      valueKey: 'id',
      labelKey: 'name',
      queryParamKey: 'name',
      placeholder: 'Hledat firmu...',
      minChars: 2,
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
      minChars: 2,
    },
    {
      key: 'source',
      label: 'Zdroj',
      type: 'select',
      options: [
        { value: 'website', label: 'Web' },
        { value: 'phone', label: 'Telefon' },
        { value: 'email', label: 'Email' },
        { value: 'referral', label: 'Doporučení' },
        { value: 'social', label: 'Sociální sítě' },
        { value: 'advertising', label: 'Reklama' },
        { value: 'event', label: 'Událost' },
        { value: 'partner', label: 'Partner' },
      ],
    },
    {
      key: 'value_from',
      label: 'Hodnota od',
      type: 'number',
      placeholder: 'Min. hodnota',
    },
    {
      key: 'value_to',
      label: 'Hodnota do',
      type: 'number',
      placeholder: 'Max. hodnota',
    },
    {
      key: 'is_qualified',
      label: 'Kvalifikován',
      type: 'boolean',
    },
    {
      key: 'title',
      label: 'Název',
      type: 'text',
      placeholder: 'Hledat v názvu...',
    },
  ],

  actions: {
    create: true,
    edit: true,
    delete: true,
    bulkDelete: true,
    export: true,
  },

  onDataChange: fetchLeads,
};

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám leady...</span>
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
            onClick={fetchLeads}
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
