import { Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import {
  HiCurrencyDollar,
  HiDocument,
  HiMail,
  HiPhone,
  HiUser
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { KanbanBoard } from '../components/Kanban/KanbanBoard';

export const LeadsKanbanPage = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Načtení dat z API
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/leads');
      setLeads(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Konfigurace Kanbanu pro Leads
  const kanbanConfig = {
    title: 'Sales Pipeline - Leads',

    // ========================================
    // DEFINICE SLOUPCŮ (FÁZE PRODEJE)
    // ========================================
    columns: [
      {
        key: 'new',
        label: 'Nové Leady',
        color: 'blue',
        description: 'Nově příchozí leady',
      },
      {
        key: 'contacted',
        label: 'Kontaktováno',
        color: 'yellow',
      },
      {
        key: 'proposal',
        label: 'Nabídka',
        color: 'pink',
      },

      {
        key: 'won',
        label: 'Vyhráno',
        color: 'green',
      },
      {
        key: 'lost',
        label: 'Ztraceno',
        color: 'red',
      },
    ],

    // ========================================
    // DEFINICE POLÍ
    // ========================================
    fields: [
      {
        key: 'lead_id',
        label: 'Lead ID',
        type: 'number',
        editable: false,
        showInCard: false,
      },
      {
        key: 'company_name',
        label: 'Název firmy',
        type: 'text',
        required: true,
        editable: true,
        showInCard: true,
        placeholder: 'např. ACME Corp.',
      },
      {
        key: 'contact_person',
        label: 'Kontaktní osoba',
        type: 'text',
        required: true,
        editable: true,
        showInCard: true,
        placeholder: 'Jan Novák',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        required: true,
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
          { value: 'qualified', label: 'Kvalifikováno' },
          { value: 'proposal', label: 'Nabídka' },
          { value: 'negotiation', label: 'Vyjednávání' },
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
      },
      {
        key: 'probability',
        label: 'Pravděpodobnost uzavření',
        type: 'percentage',
        required: false,
        editable: true,
        showInCard: true,
        placeholder: '60',
        helpText: 'Pravděpodobnost úspěšného uzavření (%)',
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
        key: 'assigned_to_id',
        label: 'Přiřazeno (ID)',
        type: 'ajax',
        required: false,
        editable: true,
        showInCard: false,
        endpoint: '/api/v1/users',
        optionValue: 'user_id',
        optionLabel: 'email',
      },
      {
        key: 'assigned_to',
        label: 'Obchodník',
        type: 'text',
        editable: false,
        showInCard: true,
      },
      {
        key: 'notes',
        label: 'Poznámky',
        type: 'textarea',
        required: false,
        editable: true,
        showInCard: false,
        placeholder: 'Interní poznámky k leadu...',
      },
      {
        key: 'expected_close_date',
        label: 'Očekávané uzavření',
        type: 'date',
        required: false,
        editable: true,
        showInCard: true,
      },
      {
        key: 'last_contact',
        label: 'Poslední kontakt',
        type: 'date',
        required: false,
        editable: true,
        showInCard: false,
      },
      {
        key: 'created_at',
        label: 'Vytvořeno',
        type: 'datetime',
        editable: false,
        showInCard: false,
      },
    ],

    // ========================================
    // KONFIGURACE VZHLEDU KARET
    // ========================================
    cardConfig: {
      displayFields: [
        'company_name',
        'contact_person',
        'email',
        'phone',
        'value',
        'probability',
        'source',
        'assigned_to',
        'expected_close_date',
      ],

      // Barva podle hodnoty obchodu
      cardColor: (item) => {
        if (!item.value) return 'gray';
        if (item.value >= 100000) return 'green';
        if (item.value >= 50000) return 'blue';
        return 'yellow';
      },

      // Ikona podle zdroje
      cardIcon: (item) => {
        switch (item.source) {
          case 'website': return HiMail;
          case 'referral': return HiUser;
          case 'linkedin': return HiUser;
          case 'cold_call': return HiPhone;
          default: return HiCurrencyDollar;
        }
      },

      // Avatar obchodníka
      showAvatar: true,
      avatarInitials: (item) => {
        if (!item.assigned_to) return null;
        return item.assigned_to
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
      },
      avatarLabel: (item) => item.assigned_to,

      // Extra badges
      cardBadges: [
        {
          field: 'probability',
          getColor: (value) => {
            if (value >= 75) return 'success';
            if (value >= 50) return 'warning';
            return 'failure';
          },
          formatValue: (value) => value ? `${value}% šance` : null,
        },
      ],
    },

    // ========================================
    // DATA A ENDPOINTY
    // ========================================
    data: leads,
    contextActions: [
      {
        label: 'Přiřadit mně',
        icon: HiUser,
        onClick: (task) => {
          // Tvoje logika
        },
      },
      {
        label: 'Duplikovat',
        icon: HiDocument,
        onClick: (task) => {
          navigate(`/tasks/create?duplicate=${task.id}`);
        },
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
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám leads...</span>
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
