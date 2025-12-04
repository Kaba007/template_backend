import { Spinner } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiBan,
  HiClock,
  HiCurrencyDollar,
  HiDocument,
  HiMail,
  HiOfficeBuilding,
  HiPhone,
  HiUserCircle
} from 'react-icons/hi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { KanbanBoard } from '../components/Kanban/KanbanBoard';
import { useToast } from '../contexts/ToastContext';

// Definice klíčů filtrů
const FILTER_KEYS = [
  'is_active',
  'source',
  'company_id',
  'assigned_to',
  'value_from',
  'value_to',
  'is_qualified',
  'has_budget',
  'title'
];

// Default filtry
const DEFAULT_FILTERS = {
  is_active: true,
};

export const LeadsKanbanPage = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
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

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const queryString = queryParams.toString();
      const url = `/api/v1/leads${queryString ? `?${queryString}` : ''}`;

      console.log('📡 Fetching leads:', url);

      const response = await api.get(url);
      setLeads(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  // ✅ Zneplatnit lead (is_active = false)
  const handleDeactivate = useCallback(async (lead) => {
    try {
      await api.patch(`/api/v1/leads/${lead.id}`, {
        is_active: false
      });
      showToast('success', 'Lead byl úspěšně zneplatněn');
      await fetchLeads();
    } catch (err) {
      console.error('Error deactivating lead:', err);
      showToast('error', 'Chyba při zneplatnění leadu');
    }
  }, [fetchLeads, showToast]);

  // ✅ Duplikovat lead
  const handleDuplicate = useCallback(async (lead) => {
    try {
      const response = await api.get(`/api/v1/leads/${lead.id}`);
      const originalLead = response.data;

      const { id, created_at, updated_at, converted_at, lost_at, ...leadData } = originalLead;

      const newLead = {
        ...leadData,
        title: `[KOPIE] ${leadData.title}`,
        status: 'new',
      };

      await api.post('/api/v1/leads', newLead);
      showToast('success', 'Lead byl úspěšně duplikován');
      await fetchLeads();
    } catch (err) {
      console.error('Error duplicating lead:', err);
      showToast('error', 'Chyba při duplikování leadu');
    }
  }, [fetchLeads, showToast]);

  // Načtení dat při změně URL (filtrů)
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Konfigurace Kanbanu
  const kanbanConfig = useMemo(() => ({
    title: 'Sales Pipeline - Leads',

    columns: [
      { key: 'new', label: '🆕 Nové', color: 'blue' },
      { key: 'contacted', label: '📞 Kontaktováno', color: 'yellow' },
      { key: 'qualified', label: '✅ Kvalifikováno', color: 'purple' },
      { key: 'proposal', label: '📋 Nabídka', color: 'pink' },
      { key: 'negotiation', label: '🤝 Jednání', color: 'blue' },
      { key: 'won', label: '💰 Vyhráno', color: 'green' },
      { key: 'lost', label: '❌ Ztraceno', color: 'red' },
    ],

    // ✅ FormSections - stejné jako v LeadsPage
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

    // ✅ FormModal konfigurace
    formModal: {
      size: '4xl',
    },

    fields: [
      // =====================================================
      // ZÁKLADNÍ ÚDAJE
      // =====================================================
      {
        key: 'id',
        label: 'Lead ID',
        type: 'number',
        editable: false,
        showInCard: false,
        showInForm: false,
      },
      {
        key: 'title',
        label: 'Název',
        type: 'text',
        required: true,
        editable: true,
        showInCard: true,
        showInForm: true,
        placeholder: 'např. Nový web pro e-shop',
        formSection: 'basic', // ✅
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
        showInCard: true, // ✅ Zobrazit v kartě
        showInForm: true,
        endpoint: '/api/v1/users',
        optionValue: 'id',
        optionLabel: 'client_id',
        queryParamKey: 'client_id',
        placeholder: 'Přiřadit kolegovi...',
        formSection: 'basic', // ✅
        enrich: {
          endpoint: '/api/v1/users',
          foreignKey: 'id',
          displayField: 'client_id',
          showAsBadge: true,
        },
      },
      {
        key: 'description',
        label: 'Popis',
        type: 'textarea',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Detailní popis příležitosti...',
        formSection: 'basic', // ✅
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
          { value: 'new', label: '🆕 Nový' },
          { value: 'contacted', label: '📞 Kontaktován' },
          { value: 'qualified', label: '✅ Kvalifikován' },
          { value: 'proposal', label: '📋 Nabídka' },
          { value: 'negotiation', label: '🤝 Jednání' },
          { value: 'won', label: '💰 Vyhrán' },
          { value: 'lost', label: '❌ Ztracen' },
        ],
        defaultValue: 'new',
        formSection: 'basic', // ✅
      },

      // =====================================================
      // ASSIGNED TO - zobrazit v kartě!
      // =====================================================


      // =====================================================
      // VALUE - zobrazit v kartě!
      // =====================================================
      {
        key: 'value',
        label: 'Hodnota',
        type: 'currency',
        editable: true,
        showInCard: true,
        showInForm: true,
        placeholder: '50000',
        helpText: 'Odhadovaná hodnota obchodu',
        formSection: 'value', // ✅
        formatValue: (value) => {
          if (!value || value === 0) return '—';
          return `${value.toLocaleString('cs-CZ')} Kč`;
        },
      },

      // =====================================================
      // FIRMA
      // =====================================================
      {
        key: 'company_id',
        label: 'Firma (z databáze)',
        type: 'async-select',
        editable: true,
        showInCard: false,
        showInForm: true,
        endpoint: '/api/v1/companies',
        optionValue: 'id',
        optionLabel: 'name',
        queryParamKey: 'name',
        placeholder: 'Vyberte firmu...',
        formSection: 'company', // ✅
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
        label: 'Název firmy',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'ACME s.r.o.',
        formSection: 'company', // ✅
      },

      // =====================================================
      // KONTAKT
      // =====================================================
      {
        key: 'contact_person',
        label: 'Kontaktní osoba',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Jan Novák',
        formSection: 'company', // ✅
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'jan.novak@firma.cz',
        formSection: 'company', // ✅
      },
      {
        key: 'phone',
        label: 'Telefon',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: '+420 123 456 789',
        formSection: 'company', // ✅
      },

      // =====================================================
      // HODNOTA A PRAVDĚPODOBNOST
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
        formSection: 'value', // ✅
      },
      {
        key: 'probability',
        label: 'Pravděpodobnost (%)',
        type: 'number',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: '0-100',
        formSection: 'value', // ✅
      },

      // =====================================================
      // ZDROJ
      // =====================================================
      {
        key: 'source',
        label: 'Zdroj',
        type: 'select',
        editable: true,
        showInCard: false,
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
        formSection: 'source', // ✅
      },
      {
        key: 'source_details',
        label: 'Detaily zdroje',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'např. Google Ads - Kampaň ABC',
        formSection: 'source', // ✅
      },
      {
        key: 'campaign',
        label: 'Kampaň',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Název kampaně',
        formSection: 'source', // ✅
      },

      // =====================================================
      // ČASOVÁ OSA
      // =====================================================
      {
        key: 'expected_close_date',
        label: 'Očekávané uzavření',
        type: 'date',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'timeline', // ✅
      },
      {
        key: 'next_action_date',
        label: 'Datum další akce',
        type: 'date',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'timeline', // ✅
      },
      {
        key: 'next_action',
        label: 'Další akce',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Co udělat příště',
        formSection: 'timeline', // ✅
      },

      // =====================================================
      // KVALIFIKACE
      // =====================================================
      {
        key: 'is_qualified',
        label: 'Kvalifikován',
        type: 'boolean',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'qualification', // ✅
      },
      {
        key: 'qualification_score',
        label: 'Skóre kvalifikace',
        type: 'number',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'qualification', // ✅
      },
      {
        key: 'has_budget',
        label: '💰 Má rozpočet',
        type: 'boolean',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'qualification', // ✅
      },
      {
        key: 'has_authority',
        label: '👔 Má rozhodovací pravomoc',
        type: 'boolean',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'qualification', // ✅
      },
      {
        key: 'has_need',
        label: '🎯 Má potřebu',
        type: 'boolean',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'qualification', // ✅
      },
      {
        key: 'has_timeline',
        label: '📅 Má časový plán',
        type: 'boolean',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'qualification', // ✅
      },

      // =====================================================
      // ZTRÁTA
      // =====================================================
      {
        key: 'lost_reason',
        label: 'Důvod ztráty',
        type: 'text',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Proč byl lead ztracen',
        formSection: 'notes', // ✅
      },

      // =====================================================
      // POZNÁMKY
      // =====================================================
      {
        key: 'notes',
        label: 'Poznámky',
        type: 'textarea',
        editable: true,
        showInCard: false,
        showInForm: true,
        placeholder: 'Poznámky k leadu...',
        formSection: 'notes', // ✅
      },
      {
        key: 'tags',
        label: 'Štítky',
        type: 'tags',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'notes', // ✅
      },

      // =====================================================
      // STAV
      // =====================================================
      {
        key: 'is_active',
        label: 'Aktivní',
        type: 'boolean',
        editable: true,
        showInCard: false,
        showInForm: true,
        formSection: 'basic', // ✅
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
        key: 'converted_at',
        label: 'Konvertováno',
        type: 'datetime',
        editable: false,
        showInCard: false,
        showInForm: false,
      },
    ],

    filters: [
      {
        key: 'is_active',
        label: 'Aktivní',
        type: 'boolean'
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
        key: 'has_budget',
        label: 'Má rozpočet',
        type: 'boolean',
      },
      {
        key: 'title',
        label: 'Název',
        type: 'text',
        placeholder: 'Hledat v názvu...',
      },
    ],

    defaultFilters: DEFAULT_FILTERS,
    currentFilters,
    onApplyFilters: applyFilters,

    cardConfig: {
      // ⭐ Pole zobrazená v kartě: title, assigned_to, value
      displayFields: ['title', 'assigned_to', 'value'],
      
      // Barva karty podle hodnoty
      cardColor: (item) => {
        if (!item.value || item.value === 0) return 'gray';
        if (item.value >= 100000) return 'green';
        if (item.value >= 50000) return 'blue';
        return 'yellow';
      },
      
      // Ikona podle statusu
      cardIcon: (item) => {
        switch (item.status) {
          case 'new': return HiCurrencyDollar;
          case 'contacted': return HiPhone;
          case 'qualified': return HiUserCircle;
          case 'proposal': return HiDocument;
          case 'negotiation': return HiOfficeBuilding;
          case 'won': return HiCurrencyDollar;
          case 'lost': return HiBan;
          default: return HiCurrencyDollar;
        }
      },
      
      // Avatar - zobrazit inicály assigned_to
      showAvatar: true,
      avatarInitials: (item) => {
        // Pokud máme enriched data
        if (item.assigned_to_data?.client_id) {
          const name = item.assigned_to_data.client_id;
          return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        }
        // Fallback na ID
        if (item.assigned_to) {
          return String(item.assigned_to).substring(0, 2).toUpperCase();
        }
        return '?';
      },
      avatarLabel: (item) => {
        if (item.assigned_to_data?.client_id) {
          return item.assigned_to_data.client_id;
        }
        return item.assigned_to || 'Nepřiřazeno';
      },
      
      // Badges
      cardBadges: [
        {
          field: 'is_qualified',
          getColor: (value) => value ? 'success' : 'gray',
          formatValue: (value) => value ? '✅ Kvalifikováno' : '',
        },
        {
          field: 'is_active',
          getColor: (value) => value ? 'success' : 'failure',
          formatValue: (value) => value ? 'Aktivní' : 'Neaktivní',
        },
      ],
    },

    data: leads,

    // ✅ Context akce
    contextActions: [
      {
        label: 'Zneplatnit',
        icon: HiBan,
        onClick: handleDeactivate,
        color: 'red',
      },
      {
        label: 'Duplikovat',
        icon: HiDocument,
        onClick: handleDuplicate,
      },
    ],

    endpoints: {
      create: '/api/v1/leads',
      update: '/api/v1/leads',
      delete: '/api/v1/leads',
      updateStatus: '/api/v1/leads',
    },
    
    actions: {
      create: true,
      edit: true,
      delete: true,
      export: true,
    },
    
    statusField: 'status',
    onDataChange: fetchLeads,
  }), [leads, currentFilters, applyFilters, fetchLeads, handleDeactivate, handleDuplicate]);

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám leads...</span>
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
    <div className="h-full flex flex-col">
      <KanbanBoard config={kanbanConfig} />
    </div>
  );
};