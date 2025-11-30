// utils/exportUtils.js
import * as XLSX from 'xlsx';

/**
 * Export dat do CSV formátu
 */
export const exportToCSV = (data, columns, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('Žádná data k exportu');
    return;
  }

  // Filtrujeme pouze viditelné sloupce
  const visibleColumns = columns.filter(col => col.showInTable !== false);

  // Vytvoříme header
  const headers = visibleColumns.map(col => col.label).join(',');

  // Vytvoříme řádky dat
  const rows = data.map(row => {
    return visibleColumns.map(col => {
      let value = row[col.key];

      // Formátování podle typu
      if (value === null || value === undefined) {
        value = '';
      } else if (col.type === 'boolean') {
        value = value ? 'Ano' : 'Ne';
      } else if (col.type === 'date' || col.type === 'datetime' || col.type === 'datetime-local') {
        value = value ? new Date(value).toLocaleString('cs-CZ') : '';
      } else if (col.type === 'currency') {
        value = value ? `${Number(value).toLocaleString('cs-CZ')} Kč` : '';
      } else if (col.type === 'percentage') {
        value = value ? `${value}%` : '';
      }

      // Escapování hodnot s čárkami nebo uvozovkami
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    }).join(',');
  });

  // Spojíme vše dohromady
  const csv = [headers, ...rows].join('\n');

  // Vytvoříme blob s UTF-8 BOM (pro správné zobrazení diakritiky v Excelu)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  // Stáhneme soubor
  downloadBlob(blob, filename);
};

/**
 * Export dat do Excel formátu
 */
export const exportToExcel = (data, columns, filename = 'export.xlsx') => {
  if (!data || data.length === 0) {
    alert('Žádná data k exportu');
    return;
  }

  // Filtrujeme pouze viditelné sloupce
  const visibleColumns = columns.filter(col => col.showInTable !== false);

  // Připravíme data pro Excel
  const excelData = data.map(row => {
    const excelRow = {};
    visibleColumns.forEach(col => {
      let value = row[col.key];

      // Formátování podle typu
      if (value === null || value === undefined) {
        value = '';
      } else if (col.type === 'boolean') {
        value = value ? 'Ano' : 'Ne';
      } else if (col.type === 'date' || col.type === 'datetime' || col.type === 'datetime-local') {
        value = value ? new Date(value).toLocaleString('cs-CZ') : '';
      } else if (col.type === 'currency') {
        value = value ? Number(value) : 0;
      } else if (col.type === 'percentage') {
        value = value ? `${value}%` : '';
      }

      excelRow[col.label] = value;
    });
    return excelRow;
  });

  // Vytvoříme worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Nastavíme šířky sloupců
  const columnWidths = visibleColumns.map(col => ({
    wch: Math.max(col.label.length, 15)
  }));
  worksheet['!cols'] = columnWidths;

  // Vytvoříme workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Vygenerujeme Excel soubor a stáhneme ho
  XLSX.writeFile(workbook, filename);
};

/**
 * Pomocná funkce pro stažení blobu
 */
const downloadBlob = (blob, filename) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
