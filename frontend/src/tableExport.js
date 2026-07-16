import * as XLSX from 'xlsx';

function normalizeFilename(filename) {
  return filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
}

export function exportTableToXlsx({ filename, columns, rows, sheetName = 'Export' }) {
  const exportRows = rows.map(row => Object.fromEntries(
    columns.map(column => [
      column.header,
      column.value ? column.value(row) : row[column.key],
    ])
  ));
  const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: columns.map(column => column.header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, normalizeFilename(filename), { bookType: 'xlsx' });
}

export function todayExportFilename(prefix) {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('-');
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${prefix}-${stamp}-${time}.xlsx`;
}
