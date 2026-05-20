import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Plus, Check, X } from 'lucide-react';

/**
 * Selector con búsqueda, opción de dejar en blanco y opción de crear un valor nuevo.
 *
 * Props:
 *  - value: id seleccionado (número) o null
 *  - items: array de objetos con { id, ...resto }; el texto visible se saca de labelKey
 *  - onChange(idOrNull): se llama al elegir un item o al limpiar la selección
 *  - onCreate(nombre): opcional. async. Debe devolver el item creado (con id). Si se
 *    pasa, aparece la opción "Crear «texto»" cuando lo escrito no coincide con nada.
 *  - labelKey: clave del texto visible (por defecto 'nombre')
 *  - placeholder: texto cuando no hay nada seleccionado
 *  - emptyLabel: texto de la opción para limpiar (por defecto '— Sin seleccionar —')
 *  - allowEmpty: si false, no muestra la opción de limpiar (por defecto true)
 *  - disabled
 */
export function EntityPicker({
  value,
  items = [],
  onChange,
  onCreate,
  labelKey = 'nombre',
  placeholder = 'Seleccionar…',
  emptyLabel = '— Sin seleccionar —',
  allowEmpty = true,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const selected = items.find((i) => i.id === value) || null;
  const labelOf = (i) => (i && i[labelKey] != null ? String(i[labelKey]) : '');

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
  const matches = q ? items.filter((i) => labelOf(i).toLowerCase().includes(q)) : items;
  const exactMatch = items.some((i) => labelOf(i).trim().toLowerCase() === q);

  const close = () => { setOpen(false); setQuery(''); };
  const pick = (id) => { onChange?.(id); close(); };

  const doCreate = async () => {
    const nombre = query.trim();
    if (!nombre || !onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(nombre);
      if (created && created.id != null) pick(created.id);
      else close();
    } catch {
      // onCreate ya muestra su propio error (alert) en caso de fallo.
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-[15px] text-left flex items-center gap-2 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
      >
        <span className={`flex-1 truncate ${selected ? 'text-stone-900' : 'text-stone-400'}`}>
          {selected ? labelOf(selected) : placeholder}
        </span>
        {selected && allowEmpty && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange?.(null); }}
            className="text-stone-400 hover:text-stone-700"
            title="Quitar selección"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
      </button>

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
                    if (matches.length === 1) pick(matches[0].id);
                    else if (onCreate && q && !exactMatch) doCreate();
                  }
                }}
                placeholder="Buscar…"
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-white border border-stone-200 rounded text-stone-900 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {allowEmpty && (
            <button type="button" onClick={() => pick(null)} className="w-full text-left px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 flex items-center gap-2">
              {value == null && <Check className="w-3.5 h-3.5 text-teal-600" />}
              <span className={value == null ? '' : 'pl-[1.375rem]'}>{emptyLabel}</span>
            </button>
          )}

          {matches.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => pick(i.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2 ${i.id === value ? 'bg-teal-50 text-teal-800' : 'text-stone-800'}`}
            >
              {i.id === value ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <span className="w-3.5 h-3.5" />}
              <span className="truncate">{labelOf(i)}</span>
            </button>
          ))}

          {matches.length === 0 && !(onCreate && q) && (
            <div className="px-3 py-3 text-sm text-stone-400 text-center">Sin resultados</div>
          )}

          {onCreate && q && !exactMatch && (
            <button
              type="button"
              onClick={doCreate}
              disabled={creating}
              className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-stone-50 border-t border-stone-200 flex items-center gap-2 disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {creating ? 'Creando…' : <>Crear «{query.trim()}»</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
