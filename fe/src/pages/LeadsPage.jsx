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

    // Filtrování probíhá na backendu (API dostává query params)
    serverSideFiltering: true,

    columns: [
      {
        key: 'id',
        label: 'ID',
        type: 'number',
        sortable: true,
        editable: false,
        showInTable: true,
      },
      {
        key: 'user_id',
        label: 'Uživatel',
        type: 'async-select',
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
        key: 'user_id',
        label: 'Vlastník',
        type: 'async-select',
        endpoint: '/api/v1/users',
        valueKey: 'id',
        labelKey: 'client_id',
        queryParamKey: 'client_id',
        placeholder: 'Začněte psát jméno klienta...',
        minChars: 2,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'new', label: 'Nový' },
          { value: 'contacted', label: 'Kontaktován' },
          { value: 'qualified', label: 'Kvalifikován' },
          { value: 'lost', label: 'Ztracen' },
        ],
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

    // Refresh dat po změnách
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
