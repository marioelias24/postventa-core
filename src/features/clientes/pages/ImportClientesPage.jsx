import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Upload, FileText, Download, CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useStoreContext } from '@/store/StoreContext';
import { Section } from '@/shared/ui/Section';
import { Field } from '@/shared/ui/Field';
import { inputCls } from '@/styles/tokens';
import { parseSpreadsheet } from '@/shared/lib/parseSpreadsheet';

// Campos del modelo Cliente que el usuario puede mapear a columnas del archivo.
// Orden = el que se muestra en la UI.
const CLIENT_FIELDS = [
  { key: 'nombre',         label: 'Nombre (Razón social)', required: true },
  { key: 'contacto',       label: 'Contacto' },
  { key: 'telefono',       label: 'Teléfono' },
  { key: 'email',          label: 'Email' },
  { key: 'direccion',      label: 'Dirección' },
  { key: 'lat',            label: 'Latitud' },
  { key: 'lng',            label: 'Longitud' },
  { key: 'contratoActivo', label: 'Contrato activo (sí/no)' },
  { key: 'notas',          label: 'Notas' },
];
const IGNORE_VALUE = '__ignore__';
const PREVIEW_ROWS = 5;

// Detecta de forma automática el mapeo más probable comparando el nombre de la columna del archivo
// con cada campo. Coincidencia tolerante a tildes, espacios y mayúsculas.
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
const FIELD_HINTS = {
  nombre:         ['nombre', 'razonsocial', 'cliente', 'empresa'],
  contacto:       ['contacto', 'contact', 'responsable', 'persona'],
  telefono:       ['telefono', 'tel', 'phone', 'movil', 'celular'],
  email:          ['email', 'correo', 'mail'],
  direccion:      ['direccion', 'address', 'domicilio', 'ubicacion'],
  lat:            ['lat', 'latitud', 'latitude'],
  lng:            ['lng', 'lon', 'long', 'longitud', 'longitude'],
  contratoActivo: ['contratoactivo', 'activo', 'estado', 'status'],
  notas:          ['notas', 'comentarios', 'observaciones', 'nota'],
};
function autoMap(headers) {
  const mapping = {};
  for (const h of headers) {
    const n = normalize(h);
    const match = CLIENT_FIELDS.find(f => FIELD_HINTS[f.key].some(hint => n === hint || n.includes(hint)));
    mapping[h] = match ? match.key : IGNORE_VALUE;
  }
  return mapping;
}

// Convierte una celda al tipo que espera el campo del modelo.
function coerce(value, fieldKey) {
  if (value == null || value === '') return null;
  if (fieldKey === 'lat' || fieldKey === 'lng') {
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (fieldKey === 'contratoActivo') {
    const s = String(value).trim().toLowerCase();
    if (['no', 'false', '0', 'inactivo'].includes(s)) return false;
    return true;
  }
  return String(value);
}

function applyMapping(rows, mapping) {
  return rows.map(r => {
    const out = {};
    for (const [header, fieldKey] of Object.entries(mapping)) {
      if (fieldKey === IGNORE_VALUE) continue;
      out[fieldKey] = coerce(r[header], fieldKey);
    }
    return out;
  });
}

export function ImportClientesPage() {
  const { refresh } = useStoreContext();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const mappedFieldKeys = useMemo(() => new Set(Object.values(mapping).filter(v => v !== IGNORE_VALUE)), [mapping]);
  const missingRequired = CLIENT_FIELDS.filter(f => f.required && !mappedFieldKeys.has(f.key));
  const previewMapped = useMemo(() => applyMapping(rawRows.slice(0, PREVIEW_ROWS), mapping), [rawRows, mapping]);

  const handleFile = async (e) => {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      const { headers, rows } = await parseSpreadsheet(f);
      if (rows.length === 0) {
        setError('El archivo no contiene filas con datos.');
        return;
      }
      setHeaders(headers);
      setRawRows(rows);
      setMapping(autoMap(headers));
      setStep(2);
    } catch (err) {
      setError(err.message || 'No se pudo leer el archivo.');
      setFile(null);
    }
  };

  const setFieldFor = (header, fieldKey) => {
    setMapping(prev => {
      // Si el campo elegido ya estaba asignado a otra columna, lo quito de ahí (un campo = una columna).
      const next = { ...prev };
      if (fieldKey !== IGNORE_VALUE) {
        for (const [h, v] of Object.entries(next)) {
          if (h !== header && v === fieldKey) next[h] = IGNORE_VALUE;
        }
      }
      next[header] = fieldKey;
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const allMapped = applyMapping(rawRows, mapping);
      const res = await fetch('/api/clientes/bulk', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: allMapped }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setStep(3);
      // Recargar el store para que el catálogo y otras vistas reflejen los nuevos clientes.
      refresh().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      'nombre,contacto,telefono,email,direccion,lat,lng,contratoActivo,notas',
      'Cliente ejemplo,Juan Pérez,200-0000,juan@ejemplo.com,Dirección 123,0,0,sí,',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-clientes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('..')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <div className="text-center flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-serif">Importar clientes</h2>
          <p className="text-xs text-stone-500">Paso {step} de 3 · CSV o Excel</p>
        </div>
        <div className="w-9" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {step === 1 && (
        <Section title="1. Subir archivo" icon={Upload}>
          <p className="text-sm text-stone-500">
            Selecciona un archivo <strong>.csv</strong> o <strong>.xlsx</strong> con tus clientes. La primera fila debe contener los nombres de las columnas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <label className="flex-1 w-full">
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="block w-full text-sm text-stone-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:font-medium hover:file:bg-teal-500 file:cursor-pointer" />
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="px-3 py-2 text-sm rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Descargar plantilla
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Campos reconocidos: nombre, contacto, teléfono, email, dirección, lat, lng, contratoActivo, notas.
            Después podrás ajustar el mapeo si los nombres de tus columnas son distintos.
          </p>
        </Section>
      )}

      {step === 2 && (
        <>
          <Section title="2. Mapear columnas" icon={FileText}>
            <p className="text-sm text-stone-500">
              Indica qué campo del cliente corresponde a cada columna del archivo. Las que dejes en <em>"No importar"</em> se omiten.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-stone-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left py-2 pr-3">Columna del archivo</th>
                    <th className="text-left py-2">Campo del cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map(h => (
                    <tr key={h} className="border-t border-stone-100">
                      <td className="py-2 pr-3 text-stone-800 font-medium">{h}</td>
                      <td className="py-2">
                        <select
                          value={mapping[h] || IGNORE_VALUE}
                          onChange={e => setFieldFor(h, e.target.value)}
                          className={inputCls + ' max-w-xs'}
                        >
                          <option value={IGNORE_VALUE}>— No importar —</option>
                          {CLIENT_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>
                              {f.label}{f.required ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {missingRequired.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Falta mapear el campo obligatorio: <strong>{missingRequired.map(f => f.label).join(', ')}</strong>
              </div>
            )}
          </Section>

          <Section title={`Vista previa (primeras ${Math.min(PREVIEW_ROWS, rawRows.length)} filas de ${rawRows.length})`} icon={FileText}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-stone-500 uppercase tracking-wider">
                  <tr>
                    {CLIENT_FIELDS.filter(f => mappedFieldKeys.has(f.key)).map(f => (
                      <th key={f.key} className="px-2 py-1 text-left whitespace-nowrap">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewMapped.map((row, i) => (
                    <tr key={i} className="border-t border-stone-100">
                      {CLIENT_FIELDS.filter(f => mappedFieldKeys.has(f.key)).map(f => (
                        <td key={f.key} className="px-2 py-1 text-stone-700 whitespace-nowrap">
                          {row[f.key] == null || row[f.key] === '' ? <span className="text-stone-300">—</span> : String(row[f.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setStep(1); setFile(null); setHeaders([]); setRawRows([]); setMapping({}); }}
                className="px-4 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm"
              >
                Volver a subir
              </button>
              <button
                onClick={submit}
                disabled={submitting || missingRequired.length > 0}
                className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-medium flex items-center gap-2"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                Importar {rawRows.length} registros
              </button>
            </div>
          </Section>
        </>
      )}

      {step === 3 && result && (
        <Section title="3. Resultado" icon={CheckCircle2}>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="text-xs text-emerald-700 mb-1">Creados</div>
              <div className="text-3xl font-bold text-emerald-700 font-serif">{result.created}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-xs text-amber-700 mb-1">Omitidos</div>
              <div className="text-3xl font-bold text-amber-700 font-serif">{result.skipped?.length || 0}</div>
            </div>
          </div>

          {result.skipped?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-stone-700 mb-2">Filas omitidas</h4>
              <div className="overflow-x-auto bg-white rounded-lg border border-stone-200">
                <table className="w-full text-xs">
                  <thead className="text-stone-500 uppercase tracking-wider bg-stone-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Fila</th>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skipped.map((s, i) => (
                      <tr key={i} className="border-t border-stone-100">
                        <td className="px-3 py-2 text-stone-500">{s.row}</td>
                        <td className="px-3 py-2 text-stone-800">{s.nombre || '—'}</td>
                        <td className="px-3 py-2 text-stone-500">{s.email || '—'}</td>
                        <td className="px-3 py-2 text-amber-700">{s.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => navigate('..')}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium"
            >
              Ir al catálogo
            </button>
            <button
              onClick={() => { setStep(1); setFile(null); setHeaders([]); setRawRows([]); setMapping({}); setResult(null); }}
              className="px-4 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm"
            >
              Importar otro archivo
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}
