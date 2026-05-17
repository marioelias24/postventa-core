import { useEffect, useState } from 'react';
import {
  Hash, Edit2, RefreshCw, CheckCircle2, X, Calendar, Power,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { inputCls } from '@/styles/tokens';
import { fetchSequences, updateSequenceApi } from '@/services/sequences';

const RESET_LABELS = {
  never:   'Nunca',
  yearly:  'Anual (1 de enero)',
  monthly: 'Mensual (día 1)',
};

// Genera un preview del próximo número con la config actual (usando la fecha
// de hoy para los placeholders). Es una aproximación — el backend hace lo
// mismo pero también aplica reset cíclico si toca.
function previewNumber({ prefix = '', suffix = '', padding = 0, nextNumber = 1 }) {
  const d = new Date();
  const year  = String(d.getFullYear());
  const year2 = year.slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  const expand = (s) => s
    .replaceAll('{year}', year)
    .replaceAll('{year2}', year2)
    .replaceAll('{month}', month)
    .replaceAll('{day}', day);
  const padded = String(nextNumber).padStart(padding || 0, '0');
  return `${expand(prefix)}${padded}${expand(suffix)}`;
}

export function SequenciasView() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const refresh = () => {
    setLoading(true);
    fetchSequences()
      .then((data) => setSequences(data.sequences || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount.
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 font-serif">Secuencias</h1>
        <p className="text-sm text-stone-500">
          Plantillas para autogenerar identificadores numéricos (equivalente a <code className="text-xs bg-stone-100 px-1 rounded">ir.sequence</code> de Odoo). El sistema toma de aquí el formato del próximo número cuando un campo así lo requiere — por ejemplo, el número de orden de servicio.
        </p>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700">
        <strong className="text-stone-900">Placeholders soportados</strong> en prefix/suffix:
        <code className="ml-2 text-[11px] bg-white px-1.5 py-0.5 rounded border border-stone-200">{'{year}'}</code> 2026,{' '}
        <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-stone-200">{'{year2}'}</code> 26,{' '}
        <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-stone-200">{'{month}'}</code> 05,{' '}
        <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-stone-200">{'{day}'}</code> 17.
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Próximo número</th>
                <th className="px-4 py-2 text-left">Reset</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-stone-400">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Cargando…
                </td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="py-8 text-center text-red-600">{error}</td></tr>
              ) : sequences.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-stone-400 italic">Sin secuencias configuradas</td></tr>
              ) : sequences.map((s) => (
                <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-2">
                    <code className="text-xs bg-stone-100 px-1.5 py-0.5 rounded">{s.code}</code>
                  </td>
                  <td className="px-4 py-2 text-stone-900">{s.name}</td>
                  <td className="px-4 py-2 text-stone-700">
                    <div className="font-mono text-sm">{previewNumber(s)}</div>
                    <div className="text-[11px] text-stone-400">#{s.nextNumber}</div>
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-500">
                    <Calendar className="w-3 h-3 inline mr-1 text-stone-400" />
                    {RESET_LABELS[s.resetCycle] || s.resetCycle}
                  </td>
                  <td className="px-4 py-2">
                    {s.active ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Activa</span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">Inactiva</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="p-1.5 rounded hover:bg-stone-100 text-stone-500"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditSequenceModal
          sequence={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setSequences((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditSequenceModal({ sequence, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: sequence.name,
    prefix: sequence.prefix || '',
    suffix: sequence.suffix || '',
    padding: sequence.padding,
    nextNumber: sequence.nextNumber,
    increment: sequence.increment,
    resetCycle: sequence.resetCycle,
    active: sequence.active,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const preview = previewNumber(form);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { sequence: updated } = await updateSequenceApi(sequence.id, form);
      setDone(true);
      setTimeout(() => onSaved?.(updated), 800);
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-stone-800 font-serif flex items-center gap-2">
              <Hash className="w-4 h-4 text-teal-600" /> Editar secuencia
            </h3>
            <code className="text-[11px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">{sequence.code}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {done ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Guardado
            </div>
          ) : (
            <>
              <Field label="Nombre">
                <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} required />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Prefijo">
                  <input value={form.prefix} onChange={(e) => set('prefix', e.target.value)} className={inputCls} placeholder="OS-{year}-" />
                </Field>
                <Field label="Sufijo">
                  <input value={form.suffix} onChange={(e) => set('suffix', e.target.value)} className={inputCls} placeholder="(opcional)" />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Padding">
                  <input type="number" min="0" max="20" value={form.padding} onChange={(e) => set('padding', parseInt(e.target.value, 10) || 0)} className={inputCls} />
                </Field>
                <Field label="Próximo nº">
                  <input type="number" min="1" value={form.nextNumber} onChange={(e) => set('nextNumber', parseInt(e.target.value, 10) || 1)} className={inputCls} />
                </Field>
                <Field label="Incremento">
                  <input type="number" min="1" value={form.increment} onChange={(e) => set('increment', parseInt(e.target.value, 10) || 1)} className={inputCls} />
                </Field>
              </div>

              <Field label="Reset automático">
                <select value={form.resetCycle} onChange={(e) => set('resetCycle', e.target.value)} className={inputCls}>
                  {Object.entries(RESET_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>

              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                <Power className="w-3.5 h-3.5 text-stone-400" /> Activa
              </label>

              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-1">Vista previa del próximo número</div>
                <div className="font-mono text-base text-stone-900">{preview}</div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Calculado con la fecha de hoy. Si el reset cae entre ahora y el próximo uso, el número podría volver a 1.
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="p-4 border-t border-stone-200 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
