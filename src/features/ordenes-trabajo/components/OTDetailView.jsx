import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Trash2, ClipboardList, Package, Paperclip,
  CheckSquare, Building2, Phone, MapPin, Navigation, FileCheck2,
  Plus, X, CheckCircle2, Upload, PenLine, Play, Flag, RotateCcw, Lock,
  Clock, TrendingUp, TrendingDown, Edit3,
} from 'lucide-react';
import { BRAND } from '@/config/branding';
import { Field } from '@/shared/ui/Field';
import { Section } from '@/shared/ui/Section';
import { Stepper } from '@/shared/ui/Stepper';
import {
  FormFooter, FormHeader, FormPage, FormTabs, FormToolbar, FormWorkflow,
  HeaderFact, SmartButton,
} from '@/shared/ui/FormView';
import { inputCls } from '@/styles/tokens';
import { useCan } from '@/app/permissions';
import { storage } from '@/services/storage';
import { getOrderStatusMeta } from '@/shared/lib/orderStatus';

// Estados del workflow nuevo de OT. El backend mapea automáticamente los
// estados viejos (borrador/en_progreso/completada) al renombrarlos.
const OT_STEPS = [
  { key: 'programada', label: 'Programada', color: '#5A7B2E' },
  { key: 'iniciada',   label: 'Iniciada',   color: '#B8741F' },
  { key: 'culminada',  label: 'Culminada',  color: '#2D6B45' },
];

function newItem(texto = '', orden = 0) {
  return { _key: Math.random().toString(36).slice(2), texto, completado: false, notas: '', orden };
}

function newMaterial(nombre = '', cantidad = 1, unidad = '') {
  return { _key: Math.random().toString(36).slice(2), nombre, cantidad, unidad };
}

// Formato corto para mostrar timestamps: "17/05/2026 14:23"
function fmtDateTime(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(BRAND.locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Formatea horas (con decimales) de forma legible: 1.5h, 0.25h.
function fmtHoras(h) {
  if (h == null) return '—';
  const n = Number(h);
  if (!Number.isFinite(n)) return '—';
  return `${(Math.round(n * 100) / 100).toString()}h`;
}

export function OTDetailView({ otId, ordenId: defaultOrdenId, data, onSave, onDelete, onBack, onRefresh }) {
  const canEditPerm = useCan('ot:edit');
  const canDelete = useCan('ot:delete');
  const canAdmin = useCan('users:manage'); // proxy para "es admin" (reabrir OT)
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [transitioning, setTransitioning] = useState(false);
  // Por default mostramos horasReales como readonly (lo calcula el backend al
  // culminar). Si el técnico se olvidó de marcar inicio/fin, admin puede
  // habilitar override manual con este toggle.
  const [horasManual, setHorasManual] = useState(false);

  const ot = otId ? (data.ordenesTrabajo || []).find(x => x.id === otId) : null;
  const orden = data.ordenes.find(o => o.id === (ot?.ordenId ?? defaultOrdenId));
  const cliente = data.clientes.find(c => c.id === orden?.clienteId);
  const tipo = data.tipos.find(t => t.id === orden?.tipoId);
  const estado = getOrderStatusMeta(orden, data.estados);
  const tecnicos = (orden?.tecnicoIds || (orden?.tecnicoId ? [orden.tecnicoId] : []))
    .map(id => data.tecnicos.find(t => t.id === id)).filter(Boolean);

  // Plantilla aplicable: la (única) activa que matchea el tipo de servicio
  // de la orden padre. Solo se usa al CREAR — una OT ya guardada conserva
  // los items/materiales que tenga en BD aunque la plantilla cambie después.
  const plantillaAplicable = !ot && orden?.tipoId
    ? (data.plantillas || []).find(p => p.activo && p.tipoId === orden.tipoId)
    : null;

  const [form, setForm] = useState(() => ({
    horasReales: ot?.horasReales ?? '',
    firmaCliente: ot?.firmaCliente ?? '',
    notas: ot?.notas ?? '',
    // Toda OT nueva arranca en 'programada'. Si viene una OT con estado viejo
    // (borrador/en_progreso/completada), el backend la habrá migrado en boot;
    // como fallback acá la normalizamos por si acaso.
    estado: ({ borrador: 'programada', en_progreso: 'iniciada', completada: 'culminada' })[ot?.estado] || ot?.estado || 'programada',
  }));
  // Edición bloqueada cuando la OT está culminada (read-only). Solo admin
  // puede reabrirla para volverla a iniciada.
  const isCulminada = form.estado === 'culminada';
  const canEdit = canEditPerm && !isCulminada;
  const [checklist, setChecklist] = useState(() => {
    if (ot?.checklist) return ot.checklist.map(it => ({ ...it, _key: String(it.id) }));
    if (plantillaAplicable?.items?.length) {
      return plantillaAplicable.items.map((it, i) => ({
        _key: `tpl-${it.id}`,
        texto: it.texto,
        orden: it.orden ?? i,
        completado: false,
        notas: '',
        _fromPlantilla: true,
      }));
    }
    return [];
  });
  const [materiales, setMateriales] = useState(() => {
    if (ot?.materiales) return ot.materiales.map(m => ({ ...m, _key: String(m.id) }));
    if (plantillaAplicable?.productos?.length) {
      return plantillaAplicable.productos.map(p => ({
        _key: `tpl-${p.id}`,
        nombre: p.nombre,
        cantidad: p.cantidad ?? 1,
        unidad: p.unidad ?? '',
        _fromPlantilla: true,
      }));
    }
    return [];
  });
  const [adjuntos, setAdjuntos] = useState(() => ot?.adjuntos || []);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('tiempos');

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

  // Avanzar al siguiente estado del workflow. `to` es el destino; backend
  // valida que sea legal desde el estado actual.
  const doTransition = async (payload, confirmMsg) => {
    if (!ot?.id) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Avanzar de todos modos? (se perderán los cambios)')) return;
    setTransitioning(true);
    try {
      const updated = await storage.transitionOT(ot.id, payload);
      setForm(f => ({ ...f, estado: updated.estado }));
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert(err.message || 'No se pudo cambiar el estado.');
    } finally {
      setTransitioning(false);
    }
  };
  const handleIniciar  = () => doTransition({ to: 'iniciada' });
  const handleCulminar = () => doTransition({ to: 'culminada' }, '¿Marcar esta OT como culminada? No se podrá editar después (solo admin podría reabrirla).');
  const handleReabrir  = () => doTransition({ reopen: true }, '¿Reabrir esta OT para correcciones? Volverá al estado "iniciada".');

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

  const completados = checklist.filter(it => it.completado).length;
  const total = checklist.length;
  const currentStep = OT_STEPS.find(s => s.key === form.estado) || OT_STEPS[0];
  const ordenLabel = orden?.numero || (orden ? `#${orden.id}` : 'Sin orden');
  const clienteLabel = cliente?.nombre || 'Sin cliente';
  const tecnicoLabel = tecnicos.length ? tecnicos.map(t => t.nombre).join(', ') : 'Sin técnicos';

  return (
    <FormPage>
      <FormToolbar
        navigation={(
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
        )}
        actions={(
          <>
            {canEdit && (
              <button
                onClick={save}
                disabled={!dirty && !isNew}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400"
              >
                <CheckCircle2 className="h-4 w-4" /> {isNew ? 'Crear OT' : 'Guardar'}
              </button>
            )}
            {!isNew && canDelete && (
              <button onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100" title="Eliminar OT">
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            )}
          </>
        )}
      />

      {!isNew && (
        <FormWorkflow currentLabel={currentStep.label} color={currentStep.color}>
          <Stepper steps={OT_STEPS} currentKey={form.estado} compact />
          <div className="flex flex-wrap items-center gap-2">
            {form.estado === 'programada' && canEditPerm && (
              <button
                type="button"
                onClick={handleIniciar}
                disabled={transitioning}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Iniciar trabajo
              </button>
            )}
            {form.estado === 'iniciada' && canEditPerm && (
              <button
                type="button"
                onClick={handleCulminar}
                disabled={transitioning}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Flag className="w-4 h-4" /> Culminar trabajo
              </button>
            )}
            {form.estado === 'culminada' && (
              <span className="text-xs text-stone-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Bloqueada para edición
              </span>
            )}
            {form.estado === 'culminada' && canAdmin && (
              <button
                type="button"
                onClick={handleReabrir}
                disabled={transitioning}
                className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1.5"
                title="Reabrir OT (admin)"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reabrir
              </button>
            )}
          </div>
        </FormWorkflow>
      )}

      <FormHeader
        eyebrow={(
          <span className="inline-flex items-center gap-1.5 font-medium uppercase">
            <FileCheck2 className="h-3.5 w-3.5 text-teal-600" />
            Orden de trabajo
          </span>
        )}
        title={title}
        badges={(
          <>
            {tipo && (
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: tipo.color + '22', color: tipo.color, border: `1px solid ${tipo.color}55` }}>
                {tipo.nombre}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: estado.color + '22', color: estado.color, border: `1px solid ${estado.color}55` }}>
              {estado.label}
            </span>
            {total > 0 && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${completados === total ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                Checklist: {completados}/{total}
              </span>
            )}
          </>
        )}
        smartButtons={(
          <>
            {orden && (
              <SmartButton
                icon={ClipboardList}
                count="1"
                label="Orden de servicio"
                onClick={() => navigate(`/mantenimiento/ordenes/${orden.id}`)}
              />
            )}
            <SmartButton
              icon={Paperclip}
              count={adjuntos.length}
              label="Adjuntos"
              onClick={() => setActiveTab('relacionados')}
            />
          </>
        )}
        facts={(
          <>
            <HeaderFact icon={ClipboardList} label="Orden" value={ordenLabel} detail={orden?.equipo || ''} />
            <HeaderFact icon={Building2} label="Cliente" value={clienteLabel} detail={cliente?.telefono || ''} />
            <HeaderFact icon={Clock} label="Tiempo real" value={fmtHoras(form.horasReales)} detail={isNew ? 'Pendiente de creación' : currentStep.label} />
            <HeaderFact icon={CheckSquare} label="Checklist" value={`${completados}/${total}`} detail={tecnicoLabel} />
          </>
        )}
      />

      <FormTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'tiempos', label: 'Tiempos', icon: Clock },
          { id: 'checklist', label: 'Checklist', icon: CheckSquare, badge: total || null },
          { id: 'materiales', label: 'Materiales', icon: Package, badge: materiales.length || null },
          { id: 'relacionados', label: 'Relacionados', icon: Paperclip, badge: adjuntos.length || null },
        ]}
      >
        {activeTab === 'tiempos' && (
          <Section title="Tiempos" icon={Clock}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-stone-500">Inicio real</div>
                <div className="text-sm text-stone-800 font-medium tabular-nums">{fmtDateTime(ot?.horaInicioReal)}</div>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-stone-500">Fin real</div>
                <div className="text-sm text-stone-800 font-medium tabular-nums">{fmtDateTime(ot?.horaFinReal)}</div>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-teal-700">Tiempo real</div>
                <div className="text-sm font-semibold text-teal-800 tabular-nums">{fmtHoras(form.horasReales)}</div>
              </div>
            </div>

            {/* Comparación con estimado de la orden padre */}
            {(() => {
              const estimado = Number(orden?.duracionEstimada);
              const real = Number(form.horasReales);
              if (!Number.isFinite(estimado) || estimado <= 0 || !Number.isFinite(real) || real <= 0) {
                return (
                  <div className="text-xs text-stone-500 mt-2">
                    Estimado de la orden: <strong>{fmtHoras(estimado)}</strong>. El tiempo real se calcula automáticamente al culminar.
                  </div>
                );
              }
              const diff = real - estimado;
              const pct = Math.round((diff / estimado) * 100);
              const overrun = diff > 0;
              return (
                <div className={`text-xs mt-2 px-3 py-2 rounded-lg border flex items-center gap-2 ${
                  overrun
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {overrun ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>
                    Estimado <strong>{fmtHoras(estimado)}</strong> · Real <strong>{fmtHoras(real)}</strong>{' '}
                    · {overrun ? '+' : ''}{fmtHoras(Math.abs(diff))} ({overrun ? '+' : '−'}{Math.abs(pct)}%)
                  </span>
                </div>
              );
            })()}

            {/* Override manual de horas (admin / casos donde el técnico olvidó marcar) */}
            {canEdit && (
              <Field label="Horas reales (manual)">
                {!horasManual ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={form.horasReales !== '' && form.horasReales != null ? `${form.horasReales}h (calculado)` : 'Se calculará al culminar'}
                      readOnly
                      className={inputCls + ' bg-stone-50 text-stone-500 italic cursor-not-allowed sm:max-w-[300px]'}
                    />
                    <button
                      type="button"
                      onClick={() => setHorasManual(true)}
                      className="px-3 py-2 text-xs rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Edit3 className="w-3 h-3" /> Override
                    </button>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.horasReales}
                    onChange={e => set('horasReales', e.target.value)}
                    className={inputCls + ' sm:max-w-[200px]'}
                    placeholder="0.0"
                    autoFocus
                  />
                )}
              </Field>
            )}

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
        )}

        {activeTab === 'checklist' && (
          <Section title={`Checklist${total > 0 ? ` (${completados}/${total})` : ''}`} icon={CheckSquare}>
            {plantillaAplicable && (
              <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
                <FileCheck2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Pre-cargado desde la plantilla <strong>{plantillaAplicable.nombre}</strong> (tipo: {tipo?.nombre}). Podés editar, agregar o quitar ítems antes de guardar.
                </span>
              </div>
            )}
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
        )}

        {activeTab === 'materiales' && (
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
        )}

        {activeTab === 'relacionados' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        )}
      </FormTabs>

      <FormFooter
        dirty={dirty}
        saved={savedAt}
        onClose={onBack}
        onSave={save}
        saveLabel={isNew ? 'Crear OT' : 'Guardar cambios'}
        canSave={canEdit}
        saveDisabled={!dirty && !isNew}
      />
    </FormPage>
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
