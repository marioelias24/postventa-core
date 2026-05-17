import { useState } from 'react';
import {
  ListChecks, Plus, Edit2, Trash2, X, CheckCircle2, ChevronDown, ChevronUp, Package,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { inputCls } from '@/styles/tokens';
import { storage } from '@/services/storage';

function newItem(texto = '', orden = 0) {
  return { _key: Math.random().toString(36).slice(2), texto, orden };
}

function newProducto(nombre = '') {
  return { _key: Math.random().toString(36).slice(2), nombre, cantidad: 1, unidad: '' };
}

export function PlantillasChecklist({ data, onRefresh }) {
  const plantillas = data?.plantillas || [];
  const tipos = data?.tipos || [];
  const [editing, setEditing] = useState(null); // null | plantilla object | 'new'
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  const handleEdit = (p) => setEditing({ ...p, items: (p.items || []).map(it => ({ ...it, _key: String(it.id) })), productos: (p.productos || []).map(pr => ({ ...pr, _key: String(pr.id) })) });
  const handleNew = () => setEditing({ nombre: '', tipoId: null, activo: true, items: [], productos: [] });
  const handleClose = () => { setEditing(null); setError(null); };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla? Esta acción no se puede deshacer.')) return;
    try {
      await storage.removePlantilla(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleSave = async (form) => {
    setError(null);
    try {
      await storage.upsertPlantilla({
        ...(form.id ? { id: form.id } : {}),
        nombre: form.nombre,
        tipoId: form.tipoId || null,
        activo: form.activo,
        items: form.items.map((it, i) => ({ texto: it.texto, orden: i })),
        productos: form.productos.map(p => ({ nombre: p.nombre, cantidad: Number(p.cantidad) || 1, unidad: p.unidad || null })),
      });
      if (onRefresh) onRefresh();
      handleClose();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 font-serif">Plantillas de checklist</h1>
          <p className="text-sm text-stone-500">
            Define los ítems y materiales preconfigurados por tipo de servicio. Al crear una OT, se cargan automáticamente.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {plantillas.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-400 italic">
          No hay plantillas configuradas. Crea una para pre-cargar el checklist al generar OTs.
        </div>
      ) : (
        <div className="space-y-3">
          {plantillas.map(p => {
            const tipoNombre = tipos.find(t => t.id === p.tipoId)?.nombre;
            return (
              <div key={p.id} className="bg-white border border-stone-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="font-semibold text-stone-800">{p.nombre}</span>
                      {!p.activo && <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">Inactiva</span>}
                    </div>
                    {tipoNombre && (
                      <span className="text-xs text-stone-500">Tipo: <span className="text-stone-700">{tipoNombre}</span></span>
                    )}
                    <div className="text-xs text-stone-400">
                      {(p.items || []).length} ítems · {(p.productos || []).length} productos
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleEdit(p)} className="p-1.5 rounded hover:bg-stone-100 text-stone-500" title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {(p.items?.length > 0) && (
                  <ul className="mt-3 space-y-1">
                    {p.items.slice(0, 4).map(it => (
                      <li key={it.id} className="text-xs text-stone-600 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm border border-stone-300 flex-shrink-0" />
                        {it.texto}
                      </li>
                    ))}
                    {p.items.length > 4 && (
                      <li className="text-xs text-stone-400 italic">… y {p.items.length - 4} más</li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing !== null && (
        <PlantillaModal
          plantilla={editing}
          tipos={tipos}
          error={error}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function PlantillaModal({ plantilla, tipos, error, onClose, onSave }) {
  const [form, setForm] = useState({
    id: plantilla.id,
    nombre: plantilla.nombre || '',
    tipoId: plantilla.tipoId || '',
    activo: plantilla.activo !== false,
    items: plantilla.items || [],
    productos: plantilla.productos || [],
  });
  const [saving, setSaving] = useState(false);
  const [showProductos, setShowProductos] = useState((plantilla.productos || []).length > 0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Items
  const addItem = () => set('items', [...form.items, newItem('', form.items.length)]);
  const updateItem = (key, v) => set('items', form.items.map(it => it._key === key ? { ...it, texto: v } : it));
  const removeItem = (key) => set('items', form.items.filter(it => it._key !== key));
  const moveItem = (key, dir) => {
    const idx = form.items.findIndex(it => it._key === key);
    if ((dir < 0 && idx === 0) || (dir > 0 && idx === form.items.length - 1)) return;
    const arr = [...form.items];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    set('items', arr);
  };

  // Productos
  const addProducto = () => set('productos', [...form.productos, newProducto()]);
  const updateProducto = (key, field, v) => set('productos', form.productos.map(p => p._key === key ? { ...p, [field]: v } : p));
  const removeProducto = (key) => set('productos', form.productos.filter(p => p._key !== key));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    await onSave({ ...form, tipoId: form.tipoId ? Number(form.tipoId) : null });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-800 font-serif flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-teal-600" />
            {form.id ? 'Editar plantilla' : 'Nueva plantilla'}
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre *">
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inputCls} required placeholder="Ej: Mantenimiento preventivo" />
            </Field>
            <Field label="Tipo de servicio (opcional)">
              <select value={form.tipoId || ''} onChange={e => set('tipoId', e.target.value)} className={inputCls}>
                <option value="">— Sin tipo —</option>
                {tipos.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
            Plantilla activa
          </label>

          {/* Ítems del checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-teal-600" /> Ítems del checklist
              </span>
              <button type="button" onClick={addItem} className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            {form.items.length === 0 && (
              <p className="text-xs text-stone-400 italic">Sin ítems. Agrégalos con el botón de arriba.</p>
            )}
            <div className="space-y-1.5">
              {form.items.map((it, idx) => (
                <div key={it._key} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs text-stone-400 w-5 text-center select-none">{idx + 1}</span>
                  <input
                    value={it.texto}
                    onChange={e => updateItem(it._key, e.target.value)}
                    className="flex-1 text-sm bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400"
                    placeholder="Descripción del ítem..."
                  />
                  <button type="button" onClick={() => moveItem(it._key, -1)} disabled={idx === 0} className="p-0.5 text-stone-400 hover:text-stone-600 disabled:opacity-20">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moveItem(it._key, 1)} disabled={idx === form.items.length - 1} className="p-0.5 text-stone-400 hover:text-stone-600 disabled:opacity-20">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => removeItem(it._key)} className="p-0.5 text-stone-300 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Productos / materiales */}
          <div>
            <button
              type="button"
              onClick={() => setShowProductos(v => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2"
            >
              <Package className="w-4 h-4 text-teal-600" />
              Materiales preconfigurados
              {showProductos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showProductos && (
              <div className="space-y-2">
                {form.productos.length === 0 && (
                  <p className="text-xs text-stone-400 italic">Sin materiales.</p>
                )}
                {form.productos.map(p => (
                  <div key={p._key} className="flex items-center gap-2">
                    <input
                      value={p.nombre}
                      onChange={e => updateProducto(p._key, 'nombre', e.target.value)}
                      className={inputCls + ' flex-1 text-xs py-1.5'}
                      placeholder="Nombre del material"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.cantidad}
                      onChange={e => updateProducto(p._key, 'cantidad', e.target.value)}
                      className={inputCls + ' w-20 text-xs py-1.5'}
                    />
                    <input
                      value={p.unidad || ''}
                      onChange={e => updateProducto(p._key, 'unidad', e.target.value)}
                      className={inputCls + ' w-20 text-xs py-1.5'}
                      placeholder="u, kg…"
                    />
                    <button type="button" onClick={() => removeProducto(p._key)} className="p-1 text-stone-300 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addProducto} className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Agregar material
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <div className="p-4 border-t border-stone-200 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !form.nombre.trim()} className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium flex items-center justify-center gap-2">
            {saving ? 'Guardando…' : <><CheckCircle2 className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      </form>
    </div>
  );
}
