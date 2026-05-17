import { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { inputCls } from '@/styles/tokens';
import { useCan } from '@/app/permissions';

export function CatalogManager({ collection, label, items, fields, store }) {
  const canEdit = useCan('catalogo:edit');
  const empty = useMemo(() => {
    const o = {};
    fields.forEach(f => { o[f.key] = f.default !== undefined ? f.default : (f.type === 'boolean' ? true : ''); });
    return o;
  }, [fields]);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const startNew = () => { setForm(empty); setEditing('new'); };
  const startEdit = (item) => { setForm({ ...item }); setEditing(item.id); };
  const save = () => {
    if (!form[fields[0].key]) return alert(`${fields[0].label} requerido`);
    store.upsert(collection, form);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-stone-800 font-serif">{label} <span className="text-stone-500 text-sm font-normal font-sans">({items.length})</span></h3>
        {canEdit && (
          <button onClick={startNew} className="px-3 py-1.5 text-sm rounded-lg bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nuevo
          </button>
        )}
      </div>

      {editing && (
        <div className="bg-white border border-teal-300 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.filter(f => f.type !== 'boolean').map(f => (
              <Field key={f.key} label={f.label}>
                {f.type === 'select' ? (
                  <select value={form[f.key] || ''} onChange={e => set(f.key, e.target.value || null)} className={inputCls}>
                    <option value="">—</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'color' ? (
                  <div className="flex gap-2">
                    <input type="color" value={form[f.key] || '#14b8a6'} onChange={e => set(f.key, e.target.value)} className="w-12 h-10 rounded cursor-pointer bg-white border border-stone-200" />
                    <input value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} className={inputCls} />
                  </div>
                ) : f.type === 'number' ? (
                  <input type="number" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value === '' ? '' : parseInt(e.target.value, 10))} className={inputCls} />
                ) : (
                  <input value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} className={inputCls} />
                )}
              </Field>
            ))}
          </div>
          {fields.some(f => f.type === 'boolean') && (
            <div className="flex flex-wrap gap-3">
              {fields.filter(f => f.type === 'boolean').map(f => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" checked={!!form[f.key]} onChange={e => set(f.key, e.target.checked)} />
                  {f.label}
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">Cancelar</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm">Guardar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wider">
            <tr>
              {fields.filter(f => f.showInTable !== false).map(f => (
                <th key={f.key} className="px-3 py-2 text-left whitespace-nowrap">{f.label}</th>
              ))}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={fields.length + 1} className="text-center py-6 text-stone-400 italic">Sin registros</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-t border-stone-100 hover:bg-stone-50">
                {fields.filter(f => f.showInTable !== false).map(f => (
                  <td key={f.key} className="px-3 py-2 whitespace-nowrap">
                    {f.render ? f.render(item) :
                      f.type === 'color' ? (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded border border-stone-200" style={{ backgroundColor: item[f.key] }} />
                          <span className="font-mono text-xs text-stone-500">{item[f.key]}</span>
                        </div>
                      ) : f.type === 'boolean' ? (
                        <span className={`text-xs px-2 py-0.5 rounded ${item[f.key] ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-500'}`}>
                          {item[f.key] ? 'Sí' : 'No'}
                        </span>
                      ) : (
                        <span className="text-stone-800">{item[f.key] ?? '—'}</span>
                      )}
                  </td>
                ))}
                <td className="px-3 py-2">
                  {canEdit ? (
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(item)} className="p-1.5 rounded hover:bg-stone-100 text-stone-500"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm('¿Eliminar?')) store.remove(collection, item.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
