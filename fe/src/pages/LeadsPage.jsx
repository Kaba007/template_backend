// src/pages/LeadsPage.jsx
import { Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { DataTable } from '../components/DataTable/DataTable';

export const LeadsPage = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  // Načtení dat z API
  useEffect(() => {
    fetchLeads();
  }, [searchParams]);

const fetchLeads = async (filters) => {
  try {
    setLoading(true);

    console.log('📡 Fetching leads with filters:', filters); // ✅ Debug log

    // Sestavit query string z filtrů
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const url = `/api/v1/leads${queryString ? `?${queryString}` : ''}`;

    console.log('🌐 Fetching URL:', url); // ✅ Debug log

    const response = await api.get(url);
    setLeads(response.data);
  } catch (err) {
    setError(err.message);
    console.error('Error fetching leads:', err);
  } finally {
    setLoading(false);
  }
};

  const tableConfig = {
    title: 'Správa Leadů',

    columns: [
      {
        key: 'lead_id',
        label: 'Lead ID',
        type: 'number',
        sortable: true,
        editable: false,
        showInTable: true,
      },
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'ajax',
        sortable: true,
        required: false,
        editable: true,
        endpoint: '/api/v1/users', // Endpoint pro načtení dat
        optionValue: 'client_id',                // Klíč pro value z API odpovědi
        optionLabel: 'client_id',              // Klíč pro label z API odpovědi
        showInTable: true,
      },
      {
        key: 'title',
        label: 'Název',
        type: 'text',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        placeholder: 'např. Nový projekt',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        sortable: true,
        required: true,
        editable: true,
        showInTable: true,
        options: [
          { value: 'new', label: 'Nový' },
          { value: 'contacted', label: 'Kontaktován' },
          { value: 'qualified', label: 'Kvalifikován' },
          { value: 'lost', label: 'Ztracen' },
        ],
        defaultValue: 'new',
      },
      {
        key: 'value',
        label: 'Hodnota',
        type: 'currency',
        sortable: true,
        required: false,
        editable: true,
        showInTable: true,
      },
      {
        key: 'description',
        label: 'Popis',
        type: 'textarea',
        sortable: false,
        required: false,
        editable: true,
        showInTable: false,
      },
      {
        key: 'created_at',
        label: 'Vytvořeno',
        type: 'datetime',
        sortable: true,
        editable: false,
        showInTable: true,
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
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Všechny' },
          { value: 'new', label: 'Nový' },
          { value: 'contacted', label: 'Kontaktován' },
          { value: 'qualified', label: 'Kvalifikován' },
          { value: 'lost', label: 'Ztracen' },
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

    onDataChange: () => {
      fetchLeads();
    },
  };

  if (loading) {
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
