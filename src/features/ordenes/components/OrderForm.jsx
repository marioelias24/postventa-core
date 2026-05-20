import { useState } from 'react';
import { X, MapPin, Navigation, Edit3 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { EntityPicker } from '@/shared/ui/EntityPicker';
import { MultiEntityPicker } from '@/shared/ui/MultiEntityPicker';
import { inputCls } from '@/styles/tokens';
import { fmt } from '@/shared/lib/dates';
import { makeQuickCreate } from '@/shared/lib/catalogs';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { isOrderFinalized, normalizeOrderStatus, OS_STATUS } from '@/shared/lib/orderStatus';

export function OrderForm({ order, defaultDate, defaults, data, onSave, onClose }) {
  const isEdit = !!order?.id;
  // Sin valores por defecto en los campos de selección: arrancan vacíos.
  // `numero` se autogenera en el backend al crear (desde la Sequence
  // 'orden.numero'); el usuario puede overridearlo manualmente abriendo el
  // editor. `referenciaExterna` (ej. SAP) es siempre libre.
  // `defaults` permite pre-cargar campos al crear (p.ej. desde el tablero de
  // día: técnico + hora del espacio donde se hizo clic).
  const [form, setForm] = useState(() => order ? { ...order, tecnicoIds: tecnicoIdsOf(order) } : {
    numero: '',
    referenciaExterna: '',
    clienteId: null,
    tecnicoIds: [],
    tipoId: null,
    estadoId: null,
    estado: OS_STATUS.PROGRAMADO,
    prioridadId: null,
    fechaProgramada: defaultDate ? fmt(defaultDate) : fmt(new Date()),
    horaInicio: '08:00',
    duracionEstimada: 2,
    equipo: '', descripcion: '', notas: '', fechaCompletada: null,
    ...(defaults || {}),
  });
  // Al editar se permite cambiar el numero libremente; al crear el numero
  // se autogenera, pero ofrecemos un toggle para overrridear manualmente.
  const [numeroManual, setNumeroManual] = useState(isEdit);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cliente = data.clientes.find(c => c.id === form.clienteId);

  const prioridadesOpts = [...data.prioridades].sort((a, b) => a.nivel - b.nivel);
  const tiposOpts = data.tipos.filter(t => t.activo);
  const tecnicosOpts = data.tecnicos.filter(t => t.activo);

  const submit = () => {
    if (!form.equipo.trim()) return alert('Indica al menos el equipo / activo de la orden.');

    const payload = { ...form };
    const estado = normalizeOrderStatus(payload, data.estados);
    payload.estado = estado;
    payload.numero = (payload.numero || '').trim();
    payload.referenciaExterna = (payload.referenciaExterna || '').trim();
    if (isOrderFinalized(estado) && !payload.fechaCompletada) payload.fechaCompletada = fmt(new Date());
    if (!isOrderFinalized(estado)) payload.fechaCompletada = null;
    onSave('ordenes', payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-800 font-serif">{isEdit ? 'Editar orden' : 'Nueva orden'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Field label="Número de orden">
            {!isEdit && !numeroManual ? (
              <div className="flex items-center gap-2">
                <input
                  value="Se autogenerará al guardar"
                  readOnly
                  className={inputCls + ' bg-stone-50 text-stone-500 italic cursor-not-allowed'}
                />
                <button
                  type="button"
                  onClick={() => setNumeroManual(true)}
                  className="px-3 py-2 text-xs rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 whitespace-nowrap"
                  title="Asignar número manualmente"
                >
                  <Edit3 className="w-3 h-3" /> Manual
                </button>
              </div>
            ) : (
              <input value={form.numero || ''} onChange={e => set('numero', e.target.value)} className={inputCls} placeholder="Ej.: OS-2026-00042" />
            )}
          </Field>

          <Field label="Referencia externa (SAP, Odoo, etc.)">
            <input value={form.referenciaExterna || ''} onChange={e => set('referenciaExterna', e.target.value)} className={inputCls} placeholder="Opcional — número en el sistema externo" />
          </Field>

          <Field label="Tipo de servicio">
            <EntityPicker
              value={form.tipoId}
              items={tiposOpts}
              onChange={v => set('tipoId', v)}
              onCreate={makeQuickCreate(onSave, 'tipos')}
              placeholder="— Sin tipo —"
              emptyLabel="— Sin tipo —"
            />
          </Field>

          <Field label="Cliente">
            <EntityPicker
              value={form.clienteId}
              items={data.clientes}
              onChange={v => set('clienteId', v)}
              onCreate={makeQuickCreate(onSave, 'clientes')}
              placeholder="Buscar cliente…"
              emptyLabel="— Sin cliente —"
            />
          </Field>

          {cliente && cliente.lat != null && cliente.lng != null && (
            <div className="rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
              <div className="px-3 py-2 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center gap-1.5 text-xs text-stone-700">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span className="truncate">{cliente.direccion || 'Ubicación del cliente'}</span>
                </div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${cliente.lat},${cliente.lng}`} target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-800">
                  <Navigation className="w-3 h-3" /> Cómo llegar
                </a>
              </div>
              <iframe
                title="Ubicación cliente"
                src={`https://maps.google.com/maps?q=${cliente.lat},${cliente.lng}&z=16&output=embed`}
                className="w-full h-44"
                loading="lazy"
              />
            </div>
          )}
          {cliente && (cliente.lat == null || cliente.lng == null) && (
            <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              Este cliente no tiene ubicación registrada. Edítalo desde Catálogos → Clientes para agregar coordenadas.
            </div>
          )}

          <Field label="Equipo / activo *">
            <input value={form.equipo} onChange={e => set('equipo', e.target.value)} className={inputCls} placeholder="Equipo / activo a atender" />
          </Field>

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

          <div className="grid grid-cols-3 gap-3">
            <Field label="Fecha"><input type="date" value={form.fechaProgramada} onChange={e => set('fechaProgramada', e.target.value)} className={inputCls} /></Field>
            <Field label="Hora"><input type="time" value={form.horaInicio} onChange={e => set('horaInicio', e.target.value)} className={inputCls} /></Field>
            <Field label="Duración (h)"><input type="number" min="0.5" step="0.5" value={form.duracionEstimada} onChange={e => set('duracionEstimada', parseFloat(e.target.value) || 1)} className={inputCls} /></Field>
          </div>

          {/* El estado NO se elige al crear: queda null y se asigna después
              desde el stepper del detalle. Esto evita que el usuario marque
              "Completada" por error apenas se crea. */}
          <Field label="Prioridad">
            <EntityPicker
              value={form.prioridadId}
              items={prioridadesOpts}
              onChange={v => set('prioridadId', v)}
              onCreate={makeQuickCreate(onSave, 'prioridades')}
              placeholder="— Sin prioridad —"
              emptyLabel="— Sin prioridad —"
            />
          </Field>

          <Field label="Descripción del trabajo"><textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} className={inputCls + ' h-20'} /></Field>
          <Field label="Notas / observaciones"><textarea value={form.notas} onChange={e => set('notas', e.target.value)} className={inputCls + ' h-16'} /></Field>
        </div>
        <div className="p-4 border-t border-stone-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium">Cancelar</button>
          <button onClick={submit} className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium">{isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </div>
    </div>
  );
}
