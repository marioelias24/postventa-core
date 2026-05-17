import { useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { inputCls } from '@/styles/tokens';
import { useCan } from '@/app/permissions';

const ESTADO_COLORS = {
  borrador:    { bg: 'bg-stone-100',  text: 'text-stone-600',  label: 'Borrador' },
  en_progreso: { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'En progreso' },
  completada:  { bg: 'bg-emerald-50', text: 'text-emerald-700',label: 'Completada' },
};

export function OTListView({ data, onEdit, onDelete, onAdd }) {
  const canCreate = useCan('ot:create');
  const canDelete = useCan('ot:delete');
  const [search, setSearch] = useState('');

  const ordenes = useMemo(() => Object.fromEntries((data.ordenes || []).map(o => [o.id, o])), [data.ordenes]);
  const clientes = useMemo(() => Object.fromEntries((data.clientes || []).map(c => [c.id, c])), [data.clientes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.ordenesTrabajo || []).filter(ot => {
      if (!q) return true;
      const orden = ordenes[ot.ordenId];
      const cliente = clientes[orden?.clienteId];
      const hay = `${ot.numero || ''} ${orden?.numero || ''} ${cliente?.nombre || ''} ${orden?.equipo || ''}`.toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.id - a.id);
  }, [data.ordenesTrabajo, search, ordenes, clientes]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 font-serif">Órdenes de Trabajo</h1>
        <p className="text-sm text-stone-500">Órdenes de trabajo generadas a partir de órdenes de servicio.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por OT, OS, cliente, equipo..."
            className={inputCls + ' pl-9'}
          />
        </div>
        {canCreate && (
          <button onClick={onAdd} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva OT
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">OT</th>
                <th className="px-3 py-2 text-left">OS</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Equipo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-stone-400 italic">
                    {(data.ordenesTrabajo || []).length === 0 ? 'No hay órdenes de trabajo aún.' : 'Sin resultados para la búsqueda.'}
                  </td>
                </tr>
              ) : filtered.map(ot => {
                const orden = ordenes[ot.ordenId];
                const cliente = clientes[orden?.clienteId];
                const ec = ESTADO_COLORS[ot.estado] || ESTADO_COLORS.borrador;
                return (
                  <tr key={ot.id} onClick={() => onEdit(ot)} className="border-t border-stone-100 hover:bg-stone-50 cursor-pointer">
                    <td className="px-3 py-2 font-mono text-xs text-stone-600 font-medium">{ot.numero || `OT #${ot.id}`}</td>
                    <td className="px-3 py-2 font-mono text-xs text-stone-500">{orden?.numero || `OS #${ot.ordenId}`}</td>
                    <td className="px-3 py-2 text-stone-900">{cliente?.nombre || '—'}</td>
                    <td className="px-3 py-2 text-stone-600 text-xs">{orden?.equipo || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ec.bg} ${ec.text}`}>{ec.label}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-stone-500 whitespace-nowrap">
                      {ot.createdAt ? new Date(ot.createdAt).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); onEdit(ot); }} className="p-1.5 rounded hover:bg-stone-100 text-stone-500" title="Abrir">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar ${ot.numero || 'esta OT'}?`)) onDelete(ot.id); }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-stone-500">
        {filtered.length} {filtered.length === 1 ? 'orden de trabajo' : 'órdenes de trabajo'}
        {filtered.length !== (data.ordenesTrabajo || []).length && ` (filtradas de ${(data.ordenesTrabajo || []).length})`}
      </div>
    </div>
  );
}
