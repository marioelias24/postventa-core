import { useEffect, useRef, useState } from 'react';
import { Search, Plus, X } from 'lucide-react';

/**
 * Selector múltiple estilo "tags" (varios valores como etiquetas removibles)
 * con búsqueda y opción de crear un valor nuevo. Pensado para "Técnicos
 * asignados" (más de un técnico por orden).
 *
 * Props:
 *  - values: array de ids seleccionados (en orden)
 *  - items: array de objetos { id, ...resto }; el texto visible se saca de labelKey
 *  - onChange(nextIds): nuevo array de ids
 *  - onCreate(nombre): opcional, async; devuelve el item creado (con id)
 *  - labelKey: clave del texto visible (por defecto 'nombre')
 *  - addLabel: texto del botón para abrir el buscador
 *  - emptyText: texto cuando no hay nada seleccionado
 *  - disabled
 */
export function MultiEntityPicker({
  values = [],
  items = [],
  onChange,
  onCreate,
  labelKey = 'nombre',
  addLabel = 'Agregar',
  emptyText = 'Ninguno asignado',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const labelOf = (i) => (i && i[labelKey] != null ? String(i[labelKey]) : '');
  const byId = new Map(items.map((i) => [i.id, i]));
  const selected = values.map((v) => byId.get(v)).filter(Boolean);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const q = query.trim().toLowerCase();
  const available = items.filter((i) => !values.includes(i.id));
  const matches = q ? available.filter((i) => labelOf(i).toLowerCase().includes(q)) : available;
  const exactMatch = items.some((i) => labelOf(i).trim().toLowerCase() === q);

  const add = (id) => {
    if (!values.includes(id)) onChange?.([...values, id]);
    setQuery('');
    if (inputRef.current) inputRef.current.focus();
  };
  const removeId = (id) => onChange?.(values.filter((v) => v !== id));

  const doCreate = async () => {
    const nombre = query.trim();
    if (!nombre || !onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(nombre);
      if (created && created.id != null) add(created.id);
    } catch {
      // onCreate ya avisa del error (alert).
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <div className="w-full min-h-[2.75rem] px-2.5 py-2 bg-white border border-stone-300 rounded-lg flex flex-wrap items-center gap-1.5 text-[15px]">
        {selected.length === 0 && <span className="text-stone-400 px-1">{emptyText}</span>}
        {selected.map((i) => (
          <span key={i.id} className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-full pl-2.5 pr-1 py-0.5 text-xs">
            {labelOf(i)}
            {!disabled && (
              <button type="button" onClick={() => removeId(i.id)} className="rounded-full hover:bg-teal-200 p-0.5" title="Quitar"><X className="w-3 h-3" /></button>
            )}
          </span>
        ))}
        {!disabled && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="ml-auto text-stone-500 hover:text-stone-800 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> {addLabel}
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-xl max-h-72 overflow-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-stone-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (matches.length === 1) add(matches[0].id);
                    else if (onCreate && q && !exactMatch) doCreate();
                  }
                }}
                placeholder="Buscar…"
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-white border border-stone-200 rounded text-stone-900 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {matches.map((i) => (
            <button key={i.id} type="button" onClick={() => add(i.id)} className="w-full text-left px-3 py-2 text-sm text-stone-800 hover:bg-stone-50 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" /> <span className="truncate">{labelOf(i)}</span>
            </button>
          ))}

          {matches.length === 0 && !(onCreate && q) && (
            <div className="px-3 py-3 text-sm text-stone-400 text-center">
              {available.length === 0 ? 'Todos ya están agregados' : 'Sin resultados'}
            </div>
          )}

          {onCreate && q && !exactMatch && (
            <button type="button" onClick={doCreate} disabled={creating} className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-stone-50 border-t border-stone-200 flex items-center gap-2 disabled:opacity-60">
              <Plus className="w-3.5 h-3.5" /> {creating ? 'Creando…' : <>Crear «{query.trim()}»</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
