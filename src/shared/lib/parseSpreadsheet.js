// Lee un archivo CSV o XLSX y devuelve { headers, rows }.
// rows[i] es un objeto con claves = headers, valores = celdas (string|number).
// Las libs se cargan dinámicamente: el bundle inicial no las incluye.

export async function parseSpreadsheet(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return parseCsv(file);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXlsx(file);
  }
  throw new Error('Formato no soportado. Usa CSV o Excel (.xlsx).');
}

async function parseCsv(file) {
  const { default: Papa } = await import('papaparse');
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors && result.errors.length) {
          // Errores son no fatales (e.g. filas con menos columnas) → solo loggear.
          console.warn('[parseCsv] warnings:', result.errors);
        }
        const headers = result.meta.fields || [];
        const rows = result.data;
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}

async function parseXlsx(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error('El archivo no contiene hojas');
  const sheet = wb.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rows.length === 0) return { headers: [], rows: [] };

  // Cabeceras: usar la unión de claves de TODAS las filas para no perder columnas
  // que solo aparecen en filas posteriores.
  const headerSet = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
  const headers = Array.from(headerSet);

  return { headers, rows };
}
