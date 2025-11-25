import { Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import {
    HiOutlineDocumentAdd,
    HiOutlineViewList
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { DataTable } from '../components/DataTable/DataTable';
export const UsersPage = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  // Načtení dat z API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
  const navigate = useNavigate();
  // Konfigurace tabulky
  const tableConfig = {
    title: 'Správa uživatelů',

    // ========================================
    // DEFINICE SLOUPCŮ - Všechny typy polí
    // ========================================
    columns: [
      // -------------------- TEXT --------------------
      {
        key: 'user_id',
        label: 'User ID',
        type: 'number',
        sortable: true,
        editable: false, // Needitovatelné (např. auto-increment)
        showInTable:  true,
        helpText: 'Automaticky generované ID',
      },
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        sortable: true,
        required: true,
        editable: true,
        placeholder: 'např. user123',
        helpText: 'Unikátní identifikátor klienta',
        showInTable:  true,
        validate: (value) => {
          if (value && value.length < 3) {
            return 'Client ID musí mít alespoň 3 znaky';
          }
          return null;
        },
      },

      // -------------------- EMAIL --------------------
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        sortable: true,
        required: true,
        editable: true,
        placeholder: 'user@example.com',
        validate: (value) => {
          if (value && !value.includes('@')) {
            return 'Neplatný formát emailu';
          }
          return null;
        },
      },

      // -------------------- SELECT (statický) --------------------
      {
        key: 'role',
        label: 'Role',
        type: 'select',
        sortable: true,
        required: true,
        editable: true,
        showInTable:  false,
        options: [
          { value: 'admin', label: 'Administrátor' },
          { value: 'user', label: 'Uživatel' },
          { value: 'guest', label: 'Host' },
        ],
        defaultValue: 'user',
      },

      // -------------------- AJAX SELECT (dynamický) --------------------
      {
        key: 'department_id',
        label: 'Oddělení',
        type: 'ajax',
        sortable: true,
        required: false,
        editable: true,
        endpoint: '/api/v1/modules', // Endpoint pro načtení dat
        optionValue: 'id',                // Klíč pro value z API odpovědi
        optionLabel: 'name',              // Klíč pro label z API odpovědi
        helpText: 'Oddělení, ke kterému uživatel patří',
      },

      // -------------------- TEXTAREA --------------------
      {
        key: 'bio',
        showInTable:  false,
        label: 'Biografie',
        type: 'textarea',
        sortable: false,
        required: false,
        editable: true,
        placeholder: 'Napište něco o sobě...',
        helpText: 'Krátký popis uživatele (max 500 znaků)',
        validate: (value) => {
          if (value && value.length > 500) {
            return 'Biografie může mít maximálně 500 znaků';
          }
          return null;
        },
      },

      // -------------------- BOOLEAN (toggle) --------------------
      {
        key: 'is_active',
        label: 'Aktivní',
        type: 'boolean',
        sortable: true,
        editable: true,
        defaultValue: true

      },
      {
        key: 'valid',
        label: 'Ověřený',
        type: 'boolean',
        sortable: true,
        editable: true,
        defaultValue: false

      },
      {
        key: 'newsletter',
        label: 'Newsletter',
        type: 'boolean',
        sortable: true,
        editable: true,
        defaultValue: false

      },

      // -------------------- NUMBER --------------------
      {
        key: 'age',
        label: 'Věk',
        type: 'number',
        sortable: true,
        required: false,
        editable: true,
        placeholder: '18',
        helpText: 'Věk uživatele v letech',
        validate: (value) => {
          if (value && (value < 18 || value > 120)) {
            return 'Věk musí být mezi 18 a 120';
          }
          return null;
        },
      },

      // -------------------- CURRENCY --------------------
      {
        key: 'salary',
        label: 'Plat',
        type: 'currency',
        showInTable:  false,
        sortable: true,
        required: false,
        editable: true,
        placeholder: '30000',
        helpText: 'Hrubý měsíční plat v Kč',
        validate: (value) => {
          if (value && value < 0) {
            return 'Plat nemůže být záporný';
          }
          return null;
        },
      },

      // -------------------- PERCENTAGE --------------------
      {
        key: 'completion',
        showInTable:  false,
        label: 'Dokončení profilu',
        type: 'percentage',
        sortable: true,
        required: false,
        editable: true,
        placeholder: '75'

      },

      // -------------------- DATE --------------------
      {
        key: 'birth_date',
        label: 'Datum narození',
        type: 'date',
        sortable: true,
        required: false,
        editable: true

      },

      // -------------------- DATETIME --------------------
      {
        key: 'last_login',
        label: 'Poslední přihlášení',
        type: 'datetime-local',
        sortable: true,
        editable: false
      },
      {
        key: 'created_at',
        label: 'Vytvořeno',
        type: 'datetime',
        sortable: true,
        editable: false
      },
      {
        key: 'updated_at',
        label: 'Upraveno',
        type: 'datetime',
        sortable: true,
        editable: false
      },
    ],

    // ========================================
    // DATA
    // ========================================
    data: users,

    // ========================================
    // API ENDPOINTY
    // ========================================
    endpoints: {
      create: '/api/v1/users',              // POST - vytvoření nového záznamu
      update: '/api/v1/users',              // PUT - aktualizace záznamu
      delete: '/api/v1/users',              // DELETE - smazání záznamu
      bulkDelete: '/api/v1/users/bulk',     // POST - hromadné mazání
      export: '/api/v1/users/export',       // GET - export dat
    },

    // ========================================
    // FILTRY
    // ========================================
    filters: [
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'text',
      },
      {
        key: 'role',
        label: 'Role',
        type: 'select',
        options: [
          { value: '', label: 'Všechny' },
          { value: 'admin', label: 'Administrátor' },
          { value: 'user', label: 'Uživatel' },
          { value: 'guest', label: 'Host' },
        ],
      },
      {
        key: 'is_active',
        label: 'Aktivní',
        type: 'select',
        options: [
          { value: '', label: 'Všechny' },
          { value: 'true', label: 'Ano' },
          { value: 'false', label: 'Ne' },
        ],
      },
      {
        key: 'valid',
        label: 'Ověřený',
        type: 'select',
        options: [
          { value: '', label: 'Všechny' },
          { value: 'true', label: 'Ano' },
          { value: 'false', label: 'Ne' },
        ],
      },
      {
        key: 'age_from',
        label: 'Věk od',
        type: 'number',
      },
      {
        key: 'age_to',
        label: 'Věk do',
        type: 'number',
      },
      {
        key: 'created_from',
        label: 'Vytvořeno od',
        type: 'date',
      },
      {
        key: 'created_to',
        label: 'Vytvořeno do',
        type: 'date',
      },
    ],

    // ========================================
    // POVOLENÉ AKCE
    // ========================================
    actions: {
      create: true,      // Tlačítko "Přidat nový"
      edit: true,        // Tlačítko "Upravit" u každého řádku
      delete: true,      // Tlačítko "Smazat" u každého řádku
      bulkDelete: true,  // Hromadné mazání vybraných řádků
      export: true,      // Export do CSV/Excel
    },
    contextActions: [
    {
      label: 'Založ Lead',
      icon: HiOutlineDocumentAdd,
      color: 'blue',
      onClick: (user) => {
        navigate(`/leads/create?client_id=${user.client_id}`);
      },
    },
    {
      label: 'Založ Deal',
      icon: HiOutlineDocumentAdd,
      color: 'green',
      onClick: (user) => {
        navigate(`/deals/create?client_id=${user.client_id}`);
      },
    },
    {
      label: 'Otevři Leady klienta',
      icon: HiOutlineViewList,
      color: 'purple',
      onClick: (user) => {
        navigate(`/leads?client_id=${user.client_id}`);
      },
    },
    {
      label: 'Otevři Dealy klienta',
      icon: HiOutlineViewList,
      color: 'orange',
      onClick: (user) => {
        navigate(`/deals?client_id=${user.client_id}`);
      },
    },
  ],

    // ========================================
    // CALLBACK PO ZMĚNĚ DAT
    // ========================================
    onDataChange: () => {
      fetchUsers(); // Reload dat po vytvoření/úpravě/smazání
    },
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Načítám uživatele...</span>
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
            onClick={fetchUsers}
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
