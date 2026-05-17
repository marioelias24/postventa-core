import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Trash2, ClipboardList, Package, Paperclip,
  CheckSquare, Building2, Phone, MapPin, Navigation, FileCheck2,
  Plus, X, CheckCircle2, Upload, PenLine,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Section } from '@/shared/ui/Section';
import { inputCls } from '@/styles/tokens';
import { useCan } from '@/app/permissions';
import { storage } from '@/services/storage';

const ESTADO_OPTS = [
  { value: 'borrador',    label: 'Borrador' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completada',  label: 'Completada' },
];

const ESTADO_COLORS = {
  borrador:    'bg-stone-100 text-stone-600',
  en_progreso: 'bg-amber-50 text-amber-700 border border-amber-200',
  completada:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

function newItem(texto = '', orden = 0) {
  return { _key: Math.random().toString(36).slice(2), texto, completado: false, notas: '', orden };
}

function newMaterial(nombre = '', cantidad = 1, unidad = '') {
  return { _key: Math.random().toString(36).slice(2), nombre, cantidad, unidad };
}

export function OTDetailView({ otId, ordenId: defaultOrdenId, data, onSave, onDelete, onBack, onRefresh }) {
  const canEdit = useCan('ot:edit');
  const canDelete = useCan('ot:delete');
  const fileInputRef = useRef(null);

  const ot = otId ? (data.ordenesTrabajo || []).find(x => x.id === otId) : null;
  const orden = data.ordenes.find(o => o.id === (ot?.ordenId ?? defaultOrdenId));
  const cliente = data.clientes.find(c => c.id === orden?.clienteId);
  const tipo = data.tipos.find(t => t.id === orden?.tipoId);
  const estado = data.estados.find(s => s.id === orden?.estadoId);
  const tecnicos = (orden?.tecnicoIds || (orden?.tecnicoId ? [orden.tecnicoId] : []))
    .map(id => data.tecnicos.find(t => t.id === id)).filter(Boolean);

  const [form, setForm] = useState(() => ({
    horasReales: ot?.horasReales ?? '',
    firmaCliente: ot?.firmaCliente ?? '',
    notas: ot?.notas ?? '',
    estado: ot?.estado ?? 'borrador',
  }));
  const [checklist, setChecklist] = useState(() =>
    (ot?.checklist || []).map(it => ({ ...it, _key: String(it.id) }))
  );
  const [materiales, setMateriales] = useState(() =>
    (ot?.materiales || []).map(m => ({ ...m, _key: String(m.id) }))
  );
  const [adjuntos, setAdjuntos] = useState(() => ot?.adjuntos || []);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  // Checklist helpers
  const toggleItem = (key) => {
    setChecklist(list => list.map(it => it._key === key ? { ...it, completado: !it.completado } : it));
    setDirty(true);
  };
  const updateItem = (key, field, val) => {
    setChecklist(list => list.map(it => it._key === key ? { ...it, [field]: val } : it));
    setDirty(true);
  };
  const removeItem = (key) => { setChecklist(list => list.filter(it => it._key !== key)); setDirty(true); };
  const addItem = () => { setChecklist(list => [...list, newItem('', list.length)]); setDirty(true); };

  // Materiales helpers
  const updateMat = (key, field, val) => {
    setMateriales(list => list.map(m => m._key === key ? { ...m, [field]: val } : m));
    setDirty(true);
  };
  const removeMat = (key) => { setMateriales(list => list.filter(m => m._key !== key)); setDirty(true); };
  const addMat = () => { setMateriales(list => [...list, newMaterial()]); setDirty(true); };

  const save = async () => {
    const payload = {
      ...(ot?.id ? { id: ot.id } : { ordenId: orden?.id ?? defaultOrdenId }),
      ...form,
      horasReales: form.horasReales !== '' ? Number(form.horasReales) : null,
      checklist: checklist.map((it, i) => ({
        texto: it.texto,
        completado: Boolean(it.completado),
        notas: it.notas || null,
        orden: i,
      })),
      materiales: materiales.map(m => ({
        nombre: m.nombre,
        cantidad: Number(m.cantidad) || 1,
        unidad: m.unidad || null,
      })),
    };

    const saved = await onSave(payload);
    if (saved && saved.checklist) {
      setChecklist(saved.checklist.map(it => ({ ...it, _key: String(it.id) })));
    }
    if (saved && saved.materiales) {
      setMateriales(saved.materiales.map(m => ({ ...m, _key: String(m.id) })));
    }
    if (saved && saved.adjuntos) {
      setAdjuntos(saved.adjuntos);
    }
    setDirty(false);
    setSavedAt(new Date());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const handleDelete = () => {
    if (confirm(`¿Eliminar ${ot?.numero || 'esta OT'}? Esta acción no se puede deshacer.`)) {
      onDelete(ot.id);
    }
  };

  const handleFiles = async (files) => {
    if (!ot?.id || !files.length) return;
    setUploading(true);
    try {
      const res = await storage.uploadAdjunto(ot.id, Array.from(files));
      if (res?.adjuntos) setAdjuntos(res.adjuntos);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAdjunto = async (adj) => {
    if (!ot?.id) return;
    if (!confirm(`¿Eliminar "${adj.originalName}"?`)) return;
    try {
      await storage.removeAdjunto(ot.id, adj.id);
      setAdjuntos(prev => prev.filter(a => a.id !== adj.id));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Error al eliminar archivo');
    }
  };

  const isNew = !ot?.id;
  const title = ot?.numero || (isNew ? 'Nueva OT' : `OT #${ot?.id}`);
  const ec = ESTADO_COLORS[form.estado] || ESTADO_COLORS.borrador;
  const estadoLabel = ESTADO_OPTS.find(o => o.value === form.estado)?.label || form.estado;

  const completados = checklist.filter(it => it.completado).length;
  const total = checklist.length;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <div className="text-center flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 truncate font-serif">{title}</h2>
          <p className="text-xs text-stone-500">Orden de Trabajo</p>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && canDelete && (
            <button onClick={handleDelete} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200" title="Eliminar OT">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isNew && <div className="w-9" />}
        </div>
      </div>

      {/* Estado badge row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${ec}`}>{estadoLabel}</span>
        {tipo && (
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: tipo.color + '22', color: tipo.color, border: `1px solid ${tipo.color}55` }}>
            {tipo.nombre}
          </span>
        )}
        {estado && (
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: estado.color + '22', color: estado.color, border: `1px solid ${estado.color}55` }}>
            {estado.nombre}
          </span>
        )}
        {total > 0 && (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${completados === total ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
            Checklist: {completados}/{total}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info general */}
          <Section title="Información general" icon={FileCheck2}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Horas reales trabajadas">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.horasReales}
                  onChange={e => set('horasReales', e.target.value)}
                  className={inputCls}
                  placeholder="0.0"
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Estado">
                <select
                  value={form.estado}
                  onChange={e => set('estado', e.target.value)}
                  className={inputCls}
                  disabled={!canEdit}
                >
                  {ESTADO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notas / observaciones">
              <textarea
                value={form.notas}
                onChange={e => set('notas', e.target.value)}
                className={inputCls + ' h-24'}
                placeholder="Observaciones del trabajo realizado..."
                disabled={!canEdit}
              />
            </Field>
          </Section>

          {/* Checklist */}
          <Section title={`Checklist${total > 0 ? ` (${completados}/${total})` : ''}`} icon={CheckSquare}>
            {checklist.length === 0 && (
              <p className="text-sm text-stone-400 italic">Sin ítems en el checklist.</p>
            )}
            <div className="space-y-2">
              {checklist.map((it) => (
                <ChecklistItem
                  key={it._key}
                  item={it}
                  canEdit={canEdit}
                  onToggle={() => toggleItem(it._key)}
                  onChangeTexto={v => updateItem(it._key, 'texto', v)}
                  onChangeNotas={v => updateItem(it._key, 'notas', v)}
                  onRemove={() => removeItem(it._key)}
                />
              ))}
            </div>
            {canEdit && (
              <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 mt-1">
                <Plus className="w-4 h-4" /> Agregar ítem
              </button>
            )}
          </Section>

          {/* Materiales */}
          <Section title="Materiales utilizados" icon={Package}>
            {materiales.length === 0 && (
              <p className="text-sm text-stone-400 italic">Sin materiales registrados.</p>
            )}
            {materiales.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-stone-500 text-left">
                      <th className="pb-1 pr-3 font-medium">Material</th>
                      <th className="pb-1 pr-3 font-medium w-20">Cant.</th>
                      <th className="pb-1 pr-3 font-medium w-24">Unidad</th>
                      {canEdit && <th className="pb-1 w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {materiales.map(m => (
                      <tr key={m._key}>
                        <td className="py-1 pr-3">
                          <input
                            value={m.nombre}
                            onChange={e => updateMat(m._key, 'nombre', e.target.value)}
                            className={inputCls + ' text-xs py-1'}
                            placeholder="Nombre del material"
                            disabled={!canEdit}
                          />
                        </td>
                        <td className="py-1 pr-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={m.cantidad}
                            onChange={e => updateMat(m._key, 'cantidad', e.target.value)}
                            className={inputCls + ' text-xs py-1'}
                            disabled={!canEdit}
                          />
                        </td>
                        <td className="py-1 pr-3">
                          <input
                            value={m.unidad || ''}
                            onChange={e => updateMat(m._key, 'unidad', e.target.value)}
                            className={inputCls + ' text-xs py-1'}
                            placeholder="u, kg, m..."
                            disabled={!canEdit}
                          />
                        </td>
                        {canEdit && (
                          <td className="py-1">
                            <button onClick={() => removeMat(m._key)} className="p-1 rounded hover:bg-red-50 text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {canEdit && (
              <button onClick={addMat} className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 mt-1">
                <Plus className="w-4 h-4" /> Agregar material
              </button>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Orden de servicio info */}
          {orden && (
            <Section title="Orden de servicio" icon={ClipboardList}>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-xs">OS</span>
                  <Link
                    to={`/mantenimiento/ordenes/${orden.id}`}
                    className="font-mono text-xs text-teal-700 hover:underline"
                  >
                    {orden.numero || `#${orden.id}`}
                  </Link>
                </div>
                {orden.equipo && (
                  <div className="text-xs text-stone-600">
                    <span className="text-stone-400">Equipo:</span> {orden.equipo}
                  </div>
                )}
                {orden.fechaProgramada && (
                  <div className="text-xs text-stone-600">
                    <span className="text-stone-400">Fecha:</span> {orden.fechaProgramada} {orden.horaInicio}
                  </div>
                )}
                {tecnicos.length > 0 && (
                  <div className="text-xs text-stone-600">
                    <span className="text-stone-400">Técnicos:</span> {tecnicos.map(t => t.nombre).join(', ')}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Cliente */}
          {cliente && (
            <Section title="Cliente" icon={Building2}>
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-stone-800">{cliente.nombre}</div>
                {cliente.contacto && <div className="text-stone-500 text-xs">Contacto: {cliente.contacto}</div>}
                {cliente.telefono && (
                  <div className="flex items-center gap-2 text-stone-500 text-xs">
                    <Phone className="w-3 h-3" />
                    <a href={`tel:${cliente.telefono}`} className="hover:text-teal-700">{cliente.telefono}</a>
                  </div>
                )}
                {cliente.direccion && (
                  <div className="text-stone-500 text-xs flex items-start gap-1 mt-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {cliente.direccion}
                  </div>
                )}
              </div>
              {cliente.lat != null && cliente.lng != null && (
                <div className="rounded-lg overflow-hidden border border-stone-200 mt-2">
                  <iframe
                    title="Ubicación cliente"
                    src={`https://maps.google.com/maps?q=${cliente.lat},${cliente.lng}&z=16&output=embed`}
                    className="w-full h-44"
                    loading="lazy"
                  />
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${cliente.lat},${cliente.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-teal-700 hover:text-teal-800 bg-stone-50 border-t border-stone-200"
                  >
                    <Navigation className="w-3 h-3" /> Cómo llegar
                  </a>
                </div>
              )}
            </Section>
          )}

          {/* Firma cliente */}
          <Section title="Firma del cliente" icon={PenLine}>
            <Field label="Nombre del cliente + fecha">
              <textarea
                value={form.firmaCliente}
                onChange={e => set('firmaCliente', e.target.value)}
                className={inputCls + ' h-20'}
                placeholder="Ej: Juan Pérez — 17/05/2026"
                disabled={!canEdit}
              />
            </Field>
          </Section>

          {/* Adjuntos */}
          <Section title="Adjuntos" icon={Paperclip}>
            {isNew && (
              <p className="text-xs text-stone-400 italic">Guarda la OT primero para poder adjuntar archivos.</p>
            )}
            {!isNew && (
              <>
                {adjuntos.length === 0 && (
                  <p className="text-xs text-stone-400 italic">Sin adjuntos aún.</p>
                )}
                {adjuntos.length > 0 && (
                  <ul className="space-y-1">
                    {adjuntos.map(adj => (
                      <li key={adj.id} className="flex items-center justify-between gap-2 text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                        <a
                          href={`/uploads/${adj.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-700 hover:underline truncate flex-1"
                        >
                          {adj.originalName}
                        </a>
                        {canEdit && (
                          <button onClick={() => handleDeleteAdjunto(adj)} className="flex-shrink-0 text-red-500 hover:text-red-700">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 w-full py-2.5 border-2 border-dashed border-stone-300 hover:border-teal-400 rounded-lg text-sm text-stone-500 hover:text-teal-700 justify-center transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Subiendo…' : 'Seleccionar archivos'}
                    </button>
                  </>
                )}
              </>
            )}
          </Section>
        </div>
      </div>

      {/* Footer bar */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur border-t border-stone-200 z-20" style={{ background: 'rgba(247,247,244,0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            {savedAt && (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cambios guardados
              </span>
            )}
            {!savedAt && dirty && <span className="text-amber-600">Hay cambios sin guardar</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="px-4 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">Cerrar</button>
            {canEdit && (
              <button
                onClick={save}
                disabled={!dirty && !isNew}
                className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-medium"
              >
                {isNew ? 'Crear OT' : 'Guardar cambios'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-componente para un ítem del checklist
function ChecklistItem({ item, canEdit, onToggle, onChangeTexto, onChangeNotas, onRemove }) {
  const [showNotes, setShowNotes] = useState(!!(item.notas));

  return (
    <div className={`border rounded-lg p-2.5 transition-colors ${item.completado ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-stone-200'}`}>
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggle}
          disabled={!canEdit}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            item.completado
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-stone-300 hover:border-teal-400'
          } disabled:cursor-default`}
        >
          {item.completado && <CheckCircle2 className="w-3.5 h-3.5" />}
        </button>
        <input
          value={item.texto}
          onChange={e => onChangeTexto(e.target.value)}
          className={`flex-1 text-sm bg-transparent border-none outline-none ${item.completado ? 'line-through text-stone-400' : 'text-stone-800'}`}
          placeholder="Descripción del ítem..."
          disabled={!canEdit}
        />
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setShowNotes(v => !v)}
            className={`p-1 rounded text-xs ${showNotes ? 'text-teal-700 bg-teal-50' : 'text-stone-400 hover:text-stone-600'}`}
            title="Notas"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <button onClick={onRemove} className="p-1 rounded text-stone-300 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {showNotes && (
        <input
          value={item.notas || ''}
          onChange={e => onChangeNotas(e.target.value)}
          className="mt-2 ml-7 w-[calc(100%-1.75rem)] text-xs bg-white border border-stone-200 rounded px-2 py-1 outline-none focus:border-teal-400"
          placeholder="Notas del ítem..."
          disabled={!canEdit}
        />
      )}
    </div>
  );
}
