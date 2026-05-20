import { X, Clock, User, MapPin, Edit2, Plus } from 'lucide-react';
import { fmt } from '@/shared/lib/dates';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { getOrderStatusMeta } from '@/shared/lib/orderStatus';
import { BRAND } from '@/config/branding';

export function DayDetailModal({ date, data, onClose, onEdit, onAdd }) {
  if (!date) return null;
  const key = fmt(date);
  const dayOrders = data.ordenes.filter(o => o.fechaProgramada === key).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const label = date.toLocaleDateString(BRAND.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const cliMap = Object.fromEntries(data.clientes.map(c => [c.id, c]));
  const tcMap  = Object.fromEntries(data.tecnicos.map(t => [t.id, t]));
  const tiMap  = Object.fromEntries(data.tipos.map(t => [t.id, t]));

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <div>
            <h3 className="text-lg font-semibold text-stone-800 capitalize font-serif">{label}</h3>
            <p className="text-xs text-stone-500">{dayOrders.length} órdenes programadas</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {dayOrders.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm italic">Sin órdenes programadas para este día</div>
          ) : dayOrders.map(o => {
            const cli = cliMap[o.clienteId];
            const tecNames = tecnicoIdsOf(o).map(id => tcMap[id]?.nombre).filter(Boolean);
            const ti  = tiMap[o.tipoId];
            const st  = getOrderStatusMeta(o, data.estados);
            return (
              <div key={o.id} className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ backgroundColor: ti?.color || '#64748b' }}>{ti?.nombre || '—'}</span>
                    <span className="text-xs text-stone-500 font-mono">{o.numero || `#${o.id}`}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: st.color + '22', color: st.color }}>{st.label}</span>
                </div>
                <div className="text-sm text-stone-900 font-semibold mb-0.5">{cli?.nombre || '—'}</div>
                <div className="text-xs text-stone-500 mb-2">{o.equipo}</div>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-stone-500">
                  <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{o.horaInicio} ({o.duracionEstimada}h)</div>
                  <div className="flex items-center gap-1.5 min-w-0"><User className="w-3 h-3 flex-shrink-0" /><span className="truncate">{tecNames.length ? tecNames.join(', ') : '—'}</span></div>
                  {cli?.direccion && (
                    <div className="flex items-center gap-1.5 col-span-2 truncate"><MapPin className="w-3 h-3" />{cli.direccion}</div>
                  )}
                </div>
                <div className="flex gap-2 mt-3 pt-2 border-t border-stone-200">
                  <button onClick={() => { onEdit(o, dayOrders.map(x => x.id)); onClose(); }} className="flex-1 py-1.5 text-xs rounded bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" /> Abrir</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-stone-200">
          <button onClick={() => { onAdd(date); onClose(); }} className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Nueva orden este día</button>
        </div>
      </div>
    </div>
  );
}
