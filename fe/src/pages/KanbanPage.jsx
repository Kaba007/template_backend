import { Spinner } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiBan,
  HiCurrencyDollar,
  HiDocument,
  HiMail,
  HiPhone,
  HiUser
} from 'react-icons/hi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { KanbanBoard } from '../components/Kanban/KanbanBoard';
import { useToast } from '../contexts/ToastContext';
// Definice klíčů filtrů - na jednom místě
const FILTER_KEYS = ['is_active', 'source', 'company', 'user_id', 'min_value', 'max_value'];

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
      console.log('✅ Lead deactivated:', lead.id);
      // Refresh dat
      showToast('success', 'Lead byl úspěšně zneplatněn');
      await fetchLeads();
    } catch (err) {
      console.error('Error deactivating lead:', err);
      alert('Chyba při zneplatnění leadu');
      showToast('error', 'Error při zneplatnění leadu');
    }
  }, [fetchLeads]);

  // ✅ Duplikovat lead
  const handleDuplicate = useCallback(async (lead) => {
    try {
      // 1. Načti aktuální data leadu z DB
      const response = await api.get(`/api/v1/leads/${lead.id}`);
      const originalLead = response.data;

      // 2. Připrav data pro nový lead (odstraň ID a upravené timestamps)
      const { id, created_at, updated_at, converted_at, ...leadData } = originalLead;

      // 3. Přidej [DUPLICITA] k názvu
      const newLead = {
        ...leadData,
        title: `[KOPIE] ${leadData.title}`,
        status: 'new', // Nový lead začíná vždy jako "new"
      };

      // 4. Vytvoř nový lead
      await api.post('/api/v1/leads', newLead);
      console.log('✅ Lead duplicated:', lead.id);
      showToast('success', 'Lead byl úspěšně duplikován');
      // 5. Refresh dat
      await fetchLeads();
    } catch (err) {
      console.error('Error duplicating lead:', err);
      alert('Chyba při duplikování leadu');
      showToast('error', 'Error při duplikování leadu');
    }
  }, [fetchLeads]);

  // Načtení dat při změně URL (filtrů)
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Konfigurace Kanbanu
  const kanbanConfig = useMemo(() => ({
    title: 'Sales Pipeline - Leads',

    columns: [
      { key: 'new', label: 'Nové Leady', color: 'blue' },
      { key: 'contacted', label: 'Kontaktováno', color: 'yellow' },
      { key: 'proposal', label: 'Nabídka', color: 'pink' },
      { key: 'won', label: 'Vyhráno', color: 'green' },
      { key: 'lost', label: 'Ztraceno', color: 'red' },
    ],

    fields: [
      {
        key: 'id',
        label: 'Lead ID',
        type: 'number',
        editable: false,
        showInCard: false,
      },
      {
        key: 'title',
        label: 'Název',
        type: 'text',
        required: true,
        editable: true,
        showInCard: true,
        placeholder: 'např. Nový projekt',
      },
      {
        key: 'description',
        label: 'Popis',
        type: 'textarea',
        required: false,
        editable: true,
        showInCard: true,
        placeholder: 'Popis leadu...',
      },
      {
        key: 'company',
        label: 'Firma',
        type: 'text',
        required: false,
        editable: true,
        showInCard: true,
        placeholder: 'např. ACME Corp.',
      },
      {
        key: 'user_id',
        label: 'Uživatel',
        type: 'ajax',
        sortable: true,
        required: false,
        editable: true,
        endpoint: '/api/v1/users',
        optionValue: 'id',
        optionLabel: 'client_id',
        queryParamKey: 'client_id',
        showInTable: true,
        enrich: {
          endpoint: '/api/v1/users',
          foreignKey: 'id',
          displayField: 'client_id',
          showAsBadge: false,
        },
    },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        required: false,
        editable: true,
        showInCard: true,
        placeholder: 'jan.novak@acme.cz',
      },
      {
        key: 'phone',
        label: 'Telefon',
        type: 'text',
        required: false,
        editable: true,
        showInCard: true,
        placeholder: '+420 123 456 789',
      },
      {
        key: 'status',
        label: 'Fáze',
        type: 'select',
        required: true,
        editable: true,
        showInCard: false,
        options: [
          { value: 'new', label: 'Nové' },
          { value: 'contacted', label: 'Kontaktováno' },
          { value: 'proposal', label: 'Nabídka' },
          { value: 'won', label: 'Vyhráno' },
          { value: 'lost', label: 'Ztraceno' },
        ],
        defaultValue: 'new',
      },
      {
        key: 'value',
        label: 'Hodnota',
        type: 'currency',
        required: false,
        editable: true,
        showInCard: true,
        placeholder: '50000',
        helpText: 'Odhadovaná hodnota obchodu v Kč',
        formatValue: (value) => value ? `${value.toLocaleString('cs-CZ')} Kč` : '0 Kč',
      },
      {
        key: 'source',
        label: 'Zdroj leadu',
        type: 'select',
        required: false,
        editable: true,
        showInCard: true,
        options: [
          { value: 'website', label: '🌐 Web' },
          { value: 'referral', label: '👥 Doporučení' },
          { value: 'linkedin', label: '💼 LinkedIn' },
          { value: 'cold_call', label: '📞 Cold Call' },
          { value: 'event', label: '🎪 Událost' },
          { value: 'other', label: '📋 Jiné' },
        ],
      },
      {
        key: 'is_active',
        label: 'Aktivní',
        type: 'boolean',
        required: false,
        editable: true,
        showInCard: true,
      },
      {
        key: 'created_at',
        label: 'Vytvořeno',
        type: 'datetime',
        editable: false,
        showInCard: false,
      },
      {
        key: 'updated_at',
        label: 'Aktualizováno',
        type: 'datetime',
        editable: false,
        showInCard: false,
      },
      {
        key: 'converted_at',
        label: 'Konvertováno',
        type: 'datetime',
        editable: false,
        showInCard: false,
      },
    ],

    filters: [
      { key: 'is_active', label: 'Aktivní', type: 'boolean' },
      { key: 'company', label: 'Firma', type: 'text', placeholder: 'Hledat podle firmy...' },
      {
        key: 'user_id',
        label: 'Vlastník',
        type: 'async-select',
        endpoint: '/api/v1/users',
        valueKey: 'id',
        labelKey: 'client_id',
        queryParamKey: 'client_id',           // Nebo 'name', podle tvého API
        placeholder: 'Začněte psát jméno klienta...',
        minChars: 2,
      },
    ],

    defaultFilters: DEFAULT_FILTERS,
    currentFilters,
    onApplyFilters: applyFilters,

    cardConfig: {
      displayFields: ['title', 'company', 'client_id', 'email', 'phone', 'value', 'source'],
      cardColor: (item) => {
        if (!item.value) return 'gray';
        if (item.value >= 100000) return 'green';
        if (item.value >= 50000) return 'blue';
        return 'yellow';
      },
      cardIcon: (item) => {
        switch (item.source) {
          case 'website': return HiMail;
          case 'referral': return HiUser;
          case 'linkedin': return HiUser;
          case 'cold_call': return HiPhone;
          default: return HiCurrencyDollar;
        }
      },
      showAvatar: true,
      avatarInitials: (item) => {
        if (!item.client_id) return null;
        return item.client_id.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      },
      avatarLabel: (item) => item.client_id,
      cardBadges: [
        {
          field: 'is_active',
          getColor: (value) => value ? 'success' : 'failure',
          formatValue: (value) => value ? 'Aktivní' : 'Neaktivní',
        },
      ],
    },

    data: leads,

    // ✅ Context akce pro pravý panel
    contextActions: [
      {
        label: 'Zneplatnit',
        icon: HiBan,
        onClick: handleDeactivate,
        color: 'red', // volitelné - pro styling
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
