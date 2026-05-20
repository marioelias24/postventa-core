import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ClipboardList, User, Building2,
  Phone, Mail, MapPin, Navigation, CheckCircle2, FileCheck2, Flag,
  CalendarDays, Clock3, Hash, Plus, Wrench, Play, Ban,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Section } from '@/shared/ui/Section';
import { EntityPicker } from '@/shared/ui/EntityPicker';
import { MultiEntityPicker } from '@/shared/ui/MultiEntityPicker';
import { Stepper } from '@/shared/ui/Stepper';
import {
  FormFooter, FormHeader, FormPage, FormTabs, FormToolbar, FormWorkflow,
  HeaderFact, SmartButton,
} from '@/shared/ui/FormView';
import { inputCls } from '@/styles/tokens';
import { fmt } from '@/shared/lib/dates';
import { makeQuickCreate } from '@/shared/lib/catalogs';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import {
  getOrderStatusMeta, isOrderClosed, isOrderFinalized, normalizeOrderStatus,
  OS_STATUS, OS_STATUS_STEPS,
} from '@/shared/lib/orderStatus';
import { useCan } from '@/app/permissions';

function ColorPill({ children, color = '#64748b', className = '' }) {
  const safeColor = color || '#64748b';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}
      style={{ backgroundColor: safeColor + '18', color: safeColor, borderColor: safeColor + '55' }}
    >
      {children}
    </span>
  );
}

export function OrderDetailView({ orderId, data, onSave, onBack, onNew, onPrev, onNext, pagerInfo }) {
  const canCreate = useCan('orden:create');
  const canEdit = useCan('orden:edit');
  const canOT = useCan('ot:create');
  const navigate = useNavigate();
  const order = data.ordenes.find(o => o.id === orderId);
  const existingOT = (data.ordenesTrabajo || []).find(ot => ot.ordenId === orderId);
  const [form, setForm] = useState(order ? { ...order, tecnicoIds: tecnicoIdsOf(order) } : null);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

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
  const prioridad = data.prioridades.find(p => p.id === form.prioridadId);
  const orderStatus = normalizeOrderStatus(form, data.estados);
  const statusMeta = getOrderStatusMeta(orderStatus);

  const guardOnLeave = (fn) => () => {
    if (!fn) return;
    if (dirty && !window.confirm('Hay cambios sin guardar en esta orden. ¿Salir de todos modos?')) return;
    fn();
  };

  const prioridadesOpts = [...data.prioridades].sort((a, b) => a.nivel - b.nivel);
  const tiposOpts = data.tipos.filter(t => t.activo);
  const tecnicosOpts = data.tecnicos.filter(t => t.activo);
  const labelOrden = form.numero || `Orden #${form.id}`;
  const fechaHora = [form.fechaProgramada, form.horaInicio].filter(Boolean).join(' · ') || 'Sin programar';
  const duracion = form.duracionEstimada ? `${form.duracionEstimada}h estimadas` : 'Sin duración';
  const tecnicoResumen = tecnicos.length ? tecnicos.map(t => t.nombre).join(', ') : 'Sin técnicos asignados';
  const clienteResumen = cliente?.nombre || 'Sin cliente asignado';
  const equipoResumen = form.equipo?.trim() || 'Sin equipo / activo';
  const currentEstadoColor = statusMeta.color;
  const currentEstadoLabel = statusMeta.label;
  const canChangeStatus = canEdit && !isOrderClosed(orderStatus);
  const showIniciar = canChangeStatus && orderStatus === OS_STATUS.PROGRAMADO;
  const showFinalizar = canChangeStatus && orderStatus !== OS_STATUS.PROGRAMADO;
  const showCancelar = canChangeStatus;
  const canUseOT = canOT && (existingOT || !isOrderClosed(orderStatus));

  const buildPayload = (source) => {
    const nextStatus = normalizeOrderStatus(source, data.estados);
    const payload = { ...source, estado: nextStatus };
    payload.numero = (payload.numero || '').trim();
    payload.referenciaExterna = (payload.referenciaExterna || '').trim();
    if (isOrderFinalized(nextStatus) && !payload.fechaCompletada) payload.fechaCompletada = fmt(new Date());
    if (!isOrderFinalized(nextStatus)) payload.fechaCompletada = null;
    return payload;
  };

  const save = () => {
    const payload = buildPayload(form);
    onSave('ordenes', payload);
    setForm(payload);
    setDirty(false);
    setSavedAt(new Date());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const changeStatus = (nextStatus) => {
    if (!canEdit || isOrderClosed(orderStatus)) return;
    if (nextStatus === OS_STATUS.CANCELADO && !window.confirm(`¿Cancelar la orden ${labelOrden}?`)) return;
    if (nextStatus === OS_STATUS.FINALIZADO && !window.confirm(`¿Finalizar la orden ${labelOrden}?`)) return;

    const payload = buildPayload({ ...form, estado: nextStatus });
    onSave('ordenes', payload);
    setForm(payload);
    setDirty(false);
    setSavedAt(new Date());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const handleNew = () => {
    if (!onNew) return;
    if (dirty && !window.confirm('Hay cambios sin guardar en esta orden. ¿Crear una orden nueva de todos modos?')) return;
    onNew();
  };

  const handleOrdenTrabajo = () => {
    if (!canUseOT) return;
    if (dirty && !window.confirm('Hay cambios sin guardar en esta orden. ¿Abrir la orden de trabajo de todos modos?')) return;
    navigate(existingOT
      ? `/mantenimiento/ordenes-trabajo/${existingOT.id}`
      : `/mantenimiento/ordenes-trabajo/new?ordenId=${orderId}`
    );
  };

  return (
    <FormPage>
      <FormWorkflow currentLabel={currentEstadoLabel} color={currentEstadoColor}>
        <Stepper
          compact
          steps={OS_STATUS_STEPS}
          currentKey={orderStatus}
        />
        {(showIniciar || showFinalizar || showCancelar) && (
          <div className="flex flex-wrap items-center gap-2">
            {showIniciar && (
              <button
                type="button"
                onClick={() => changeStatus(OS_STATUS.EN_PROGRESO)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
              >
                <Play className="h-3.5 w-3.5" /> Iniciar
              </button>
            )}
            {showFinalizar && (
              <button
                type="button"
                onClick={() => changeStatus(OS_STATUS.FINALIZADO)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Flag className="h-3.5 w-3.5" /> Finalizar
              </button>
            )}
            {showCancelar && (
              <button
                type="button"
                onClick={() => changeStatus(OS_STATUS.CANCELADO)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <Ban className="h-3.5 w-3.5" /> Cancelar
              </button>
            )}
          </div>
        )}
      </FormWorkflow>

      <FormToolbar
        navigation={(
          <>
            <button onClick={guardOnLeave(onBack)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <div className="flex items-center rounded-lg border border-stone-200 bg-white">
              <button onClick={guardOnLeave(onPrev)} disabled={!onPrev} title="Orden anterior"
                className="p-2 text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:hover:bg-transparent">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="border-x border-stone-100 px-3 text-xs tabular-nums text-stone-600 select-none">
                {pagerInfo ? `${pagerInfo.index + 1} / ${pagerInfo.total}` : `#${form.id}`}
              </span>
              <button onClick={guardOnLeave(onNext)} disabled={!onNext} title="Orden siguiente"
                className="p-2 text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:hover:bg-transparent">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
        trailing={canCreate && (
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        )}
      />

      <FormHeader
        eyebrow={(
          <>
            <span className="inline-flex items-center gap-1.5 font-medium uppercase">
              <Hash className="h-3.5 w-3.5 text-teal-600" />
              Orden de servicio
            </span>
            <span className="text-stone-300">·</span>
            <span>ID interno #{form.id}</span>
            {form.referenciaExterna && (
              <>
                <span className="text-stone-300">·</span>
                <span>Ref. externa {form.referenciaExterna}</span>
              </>
            )}
          </>
        )}
        title={labelOrden}
        badges={(
          <>
            {dirty && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Cambios sin guardar
              </span>
            )}
            {savedAt && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Guardada
              </span>
            )}
            {tipo && <ColorPill color={tipo.color}>{tipo.nombre}</ColorPill>}
            {prioridad && <ColorPill color={prioridad.color}>{prioridad.nombre}</ColorPill>}
            {form.fechaCompletada && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Completada {form.fechaCompletada}
              </span>
            )}
          </>
        )}
        smartButtons={canUseOT && (
          <SmartButton
            icon={FileCheck2}
            count={existingOT ? '1' : '+'}
            label="Orden de trabajo"
            onClick={handleOrdenTrabajo}
            title={existingOT ? 'Abrir orden de trabajo' : 'Crear orden de trabajo'}
          />
        )}
        facts={(
          <>
            <HeaderFact icon={Building2} label="Cliente" value={clienteResumen} detail={cliente?.contacto || cliente?.telefono} />
            <HeaderFact icon={Wrench} label="Equipo" value={equipoResumen} detail={tipo?.nombre} />
            <HeaderFact icon={CalendarDays} label="Programación" value={fechaHora} detail={duracion} />
            <HeaderFact icon={User} label="Técnicos" value={tecnicoResumen} detail={tecnicos.length > 1 ? `${tecnicos.length} asignados` : ''} />
          </>
        )}
      />

      <FormTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'general', label: 'General', icon: Hash },
          { id: 'trabajo', label: 'Trabajo', icon: ClipboardList },
          { id: 'asignacion', label: 'Asignación', icon: User, badge: tecnicos.length || null },
          { id: 'cliente', label: 'Cliente', icon: Building2 },
        ]}
      >
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Section title="Identificación" icon={Hash}>
              <Field label="Referencia externa (SAP, Odoo, etc.)">
                <input value={form.referenciaExterna || ''} onChange={e => set('referenciaExterna', e.target.value)} className={inputCls} placeholder="Opcional" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tipo de servicio">
                  <EntityPicker value={form.tipoId} items={tiposOpts} onChange={v => set('tipoId', v)} onCreate={makeQuickCreate(onSave, 'tipos')} placeholder="— Sin tipo —" emptyLabel="— Sin tipo —" />
                </Field>
                <Field label="Prioridad">
                  <EntityPicker value={form.prioridadId} items={prioridadesOpts} onChange={v => set('prioridadId', v)} onCreate={makeQuickCreate(onSave, 'prioridades')} placeholder="— Sin prioridad —" emptyLabel="— Sin prioridad —" />
                </Field>
              </div>
            </Section>

            <Section title="Programación" icon={Clock3}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Fecha"><input type="date" value={form.fechaProgramada} onChange={e => set('fechaProgramada', e.target.value)} className={inputCls} /></Field>
                <Field label="Hora"><input type="time" value={form.horaInicio} onChange={e => set('horaInicio', e.target.value)} className={inputCls} /></Field>
                <Field label="Duración (h)"><input type="number" min="0.5" step="0.5" value={form.duracionEstimada} onChange={e => set('duracionEstimada', parseFloat(e.target.value) || 1)} className={inputCls} /></Field>
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'trabajo' && (
          <Section title="Trabajo solicitado" icon={ClipboardList}>
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
        )}

        {activeTab === 'asignacion' && (
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
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
        )}

        {activeTab === 'cliente' && (
          <Section title="Cliente" icon={Building2}>
            <Field label="Cliente">
              <EntityPicker value={form.clienteId} items={data.clientes} onChange={v => set('clienteId', v)} onCreate={makeQuickCreate(onSave, 'clientes')} placeholder="Buscar cliente…" emptyLabel="— Sin cliente —" />
            </Field>
            {cliente && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                {cliente.lat != null && cliente.lng != null ? (
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
                ) : (
                  <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                    Sin coordenadas. Edita el cliente desde Catálogos.
                  </div>
                )}
              </div>
            )}
          </Section>
        )}
      </FormTabs>

      <FormFooter
        dirty={dirty}
        saved={savedAt}
        onClose={onBack}
        onSave={save}
        canSave={canEdit}
        saveDisabled={!dirty}
      />
    </FormPage>
  );
}
