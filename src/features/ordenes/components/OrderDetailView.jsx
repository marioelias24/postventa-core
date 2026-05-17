import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Trash2, ClipboardList, User, Building2,
  Phone, Mail, MapPin, Navigation, CheckCircle2,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Section } from '@/shared/ui/Section';
import { EntityPicker } from '@/shared/ui/EntityPicker';
import { MultiEntityPicker } from '@/shared/ui/MultiEntityPicker';
import { inputCls } from '@/styles/tokens';
import { fmt } from '@/shared/lib/dates';
import { makeQuickCreate } from '@/shared/lib/catalogs';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { useCan } from '@/app/permissions';

export function OrderDetailView({ orderId, data, onSave, onDelete, onBack, onPrev, onNext, pagerInfo }) {
  const canEdit = useCan('orden:edit');
  const canDelete = useCan('orden:delete');
  const order = data.ordenes.find(o => o.id === orderId);
  const [form, setForm] = useState(order ? { ...order, tecnicoIds: tecnicoIdsOf(order) } : null);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);

  if (!order || !form) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
        <p className="text-stone-500 text-sm mb-4">Orden no encontrada</p>
        <button onClick={onBack} className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-sm">Volver</button>
      </div>
    );
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const cliente = data.clientes.find(c => c.id === form.clienteId);
  const tecnicos = (form.tecnicoIds || []).map(id => data.tecnicos.find(t => t.id === id)).filter(Boolean);
  const tipo = data.tipos.find(t => t.id === form.tipoId);
  const estado = data.estados.find(s => s.id === form.estadoId);
  const prioridad = data.prioridades.find(p => p.id === form.prioridadId);

  const guardOnLeave = (fn) => () => {
    if (!fn) return;
    if (dirty && !window.confirm('Hay cambios sin guardar en esta orden. ¿Salir de todos modos?')) return;
    fn();
  };

  const estadosOpts = [...data.estados].filter(s => s.activo).sort((a, b) => a.orden - b.orden);
  const prioridadesOpts = [...data.prioridades].sort((a, b) => a.nivel - b.nivel);
  const tiposOpts = data.tipos.filter(t => t.activo);
  const tecnicosOpts = data.tecnicos.filter(t => t.activo);
  const labelOrden = form.numero || `Orden #${form.id}`;

  const save = () => {
    const estadoSel = data.estados.find(s => s.id === form.estadoId);
    const payload = { ...form };
    payload.numero = (payload.numero || '').trim();
    payload.referenciaExterna = (payload.referenciaExterna || '').trim();
    if (estadoSel?.esFinal && !payload.fechaCompletada) payload.fechaCompletada = fmt(new Date());
    if (!estadoSel?.esFinal) payload.fechaCompletada = null;
    onSave('ordenes', payload);
    setDirty(false);
    setSavedAt(new Date());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const handleDelete = () => {
    if (confirm(`¿Eliminar la orden ${labelOrden}? Esta acción no se puede deshacer.`)) {
      onDelete(form.id);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center bg-white border border-stone-200 rounded-lg">
            <button onClick={guardOnLeave(onPrev)} disabled={!onPrev} title="Orden anterior"
              className="p-2 rounded-l-lg hover:bg-stone-50 text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pagerInfo && (
              <span className="px-1.5 text-xs text-stone-500 tabular-nums select-none">{pagerInfo.index + 1} / {pagerInfo.total}</span>
            )}
            <button onClick={guardOnLeave(onNext)} disabled={!onNext} title="Orden siguiente"
              className="p-2 rounded-r-lg hover:bg-stone-50 text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-center flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 truncate font-serif">{labelOrden}</h2>
          <p className="text-xs text-stone-500">Detalle de la orden</p>
        </div>
        {canDelete ? (
          <button onClick={handleDelete} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : <div className="w-9" />}
      </div>

      <div className="flex flex-wrap gap-2">
        {tipo && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: tipo.color + '22', color: tipo.color, border: `1px solid ${tipo.color}55` }}>{tipo.nombre}</span>}
        {estado && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: estado.color + '22', color: estado.color, border: `1px solid ${estado.color}55` }}>{estado.nombre}</span>}
        {prioridad && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: prioridad.color + '22', color: prioridad.color, border: `1px solid ${prioridad.color}55` }}>{prioridad.nombre}</span>}
        {form.fechaCompletada && (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completada {form.fechaCompletada}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Datos de la orden" icon={ClipboardList}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Número de orden"><input value={form.numero || ''} onChange={e => set('numero', e.target.value)} className={inputCls} placeholder="Autogenerado" /></Field>
              <Field label="Referencia externa (SAP, Odoo, etc.)"><input value={form.referenciaExterna || ''} onChange={e => set('referenciaExterna', e.target.value)} className={inputCls} placeholder="Opcional" /></Field>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Tipo de servicio">
                <EntityPicker value={form.tipoId} items={tiposOpts} onChange={v => set('tipoId', v)} onCreate={makeQuickCreate(onSave, 'tipos')} placeholder="— Sin tipo —" emptyLabel="— Sin tipo —" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Estado">
                <EntityPicker value={form.estadoId} items={estadosOpts} onChange={v => set('estadoId', v)} onCreate={makeQuickCreate(onSave, 'estados')} placeholder="— Sin estado —" emptyLabel="— Sin estado —" />
              </Field>
              <Field label="Prioridad">
                <EntityPicker value={form.prioridadId} items={prioridadesOpts} onChange={v => set('prioridadId', v)} onCreate={makeQuickCreate(onSave, 'prioridades')} placeholder="— Sin prioridad —" emptyLabel="— Sin prioridad —" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Fecha"><input type="date" value={form.fechaProgramada} onChange={e => set('fechaProgramada', e.target.value)} className={inputCls} /></Field>
              <Field label="Hora"><input type="time" value={form.horaInicio} onChange={e => set('horaInicio', e.target.value)} className={inputCls} /></Field>
              <Field label="Duración (h)"><input type="number" min="0.5" step="0.5" value={form.duracionEstimada} onChange={e => set('duracionEstimada', parseFloat(e.target.value) || 1)} className={inputCls} /></Field>
            </div>
            <Field label="Equipo / activo">
              <input value={form.equipo} onChange={e => set('equipo', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Descripción del trabajo">
              <textarea value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} className={inputCls + ' h-24'} />
            </Field>
            <Field label="Notas / observaciones">
              <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} className={inputCls + ' h-20'} />
            </Field>
          </Section>

          <Section title="Asignación" icon={User}>
            <Field label="Técnicos asignados">
              <MultiEntityPicker
                values={form.tecnicoIds}
                items={tecnicosOpts}
                onChange={ids => set('tecnicoIds', ids)}
                onCreate={makeQuickCreate(onSave, 'tecnicos')}
                addLabel="Agregar técnico"
                emptyText="Sin técnicos asignados"
              />
            </Field>
            {tecnicos.length > 0 && (
              <div className="space-y-2">
                {tecnicos.map(t => (
                  <div key={t.id} className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm space-y-1.5">
                    <div className="flex items-center gap-2 text-stone-800 font-medium"><User className="w-3.5 h-3.5 text-teal-600" /> {t.nombre}</div>
                    {t.telefono && (
                      <div className="flex items-center gap-2 text-stone-500 text-xs">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${t.telefono}`} className="hover:text-teal-700">{t.telefono}</a>
                      </div>
                    )}
                    {t.email && (
                      <div className="flex items-center gap-2 text-stone-500 text-xs">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${t.email}`} className="hover:text-teal-700">{t.email}</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Cliente" icon={Building2}>
            <Field label="Cliente">
              <EntityPicker value={form.clienteId} items={data.clientes} onChange={v => set('clienteId', v)} onCreate={makeQuickCreate(onSave, 'clientes')} placeholder="Buscar cliente…" emptyLabel="— Sin cliente —" />
            </Field>
            {cliente && (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm space-y-1">
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
            )}
            {cliente && cliente.lat != null && cliente.lng != null ? (
              <div className="rounded-lg overflow-hidden border border-stone-200">
                <iframe
                  title="Ubicación cliente"
                  src={`https://maps.google.com/maps?q=${cliente.lat},${cliente.lng}&z=16&output=embed`}
                  className="w-full h-56"
                  loading="lazy"
                />
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${cliente.lat},${cliente.lng}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-teal-700 hover:text-teal-800 bg-stone-50 border-t border-stone-200">
                  <Navigation className="w-3 h-3" /> Cómo llegar
                </a>
              </div>
            ) : cliente && (
              <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                Sin coordenadas. Edita el cliente desde Catálogos.
              </div>
            )}
          </Section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur border-t border-stone-200 z-20" style={{ background: 'rgba(247,247,244,0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            {savedAt && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Cambios guardados</span>}
            {!savedAt && dirty && <span className="text-amber-600">Hay cambios sin guardar</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="px-4 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">Cerrar</button>
            {canEdit && (
              <button onClick={save} disabled={!dirty} className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-medium">Guardar cambios</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
