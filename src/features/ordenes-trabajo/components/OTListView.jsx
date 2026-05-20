import { Fragment, useCallback, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ListSearchPanel } from '@/shared/ui/ListSearchPanel';
import { useCan } from '@/app/permissions';

const LEGACY_ESTADOS = {
  borrador: 'programada',
  en_progreso: 'iniciada',
  completada: 'culminada',
};

const ESTADO_COLORS = {
  programada: { bg: 'bg-lime-50', text: 'text-lime-700', label: 'Programada' },
  iniciada:   { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Iniciada' },
  culminada:  { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Culminada' },
};

const ESTADO_OPTIONS = [
  { value: 'programada', label: 'Programada' },
  { value: 'iniciada', label: 'Iniciada' },
  { value: 'culminada', label: 'Culminada' },
];

function normalizeEstado(estado) {
  return LEGACY_ESTADOS[estado] || estado || 'programada';
}

function estadoMeta(estado) {
  return ESTADO_COLORS[normalizeEstado(estado)] || ESTADO_COLORS.programada;
}

export function OTListView({ data, onEdit, onDelete, onAdd }) {
  const canCreate = useCan('ot:create');
  const canDelete = useCan('ot:delete');
  const [filters, setFilters] = useState({ search: '', estado: 'todos' });
  const [groupBy, setGroupBy] = useState('none');

  const ordenes = useMemo(() => Object.fromEntries((data.ordenes || []).map(o => [o.id, o])), [data.ordenes]);
  const clientes = useMemo(() => Object.fromEntries((data.clientes || []).map(c => [c.id, c])), [data.clientes]);

  const groupLabelFor = useCallback((ot) => {
    const orden = ordenes[ot.ordenId];
    const cliente = clientes[orden?.clienteId];
    if (groupBy === 'estado') return estadoMeta(ot.estado).label;
    if (groupBy === 'cliente') return cliente?.nombre || 'Sin cliente';
    if (groupBy === 'orden') return orden?.numero || `OS #${ot.ordenId}`;
    return '';
  }, [clientes, groupBy, ordenes]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (data.ordenesTrabajo || []).filter(ot => {
      if (filters.estado !== 'todos' && normalizeEstado(ot.estado) !== filters.estado) return false;
      if (!q) return true;
      const orden = ordenes[ot.ordenId];
      const cliente = clientes[orden?.clienteId];
      const hay = `${ot.numero || ''} ${orden?.numero || ''} ${cliente?.nombre || ''} ${orden?.equipo || ''}`.toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => {
      if (groupBy !== 'none') {
        const byGroup = groupLabelFor(a).localeCompare(groupLabelFor(b));
        if (byGroup !== 0) return byGroup;
      }
      return b.id - a.id;
    });
  }, [data.ordenesTrabajo, filters, groupBy, ordenes, clientes, groupLabelFor]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const activeFilters = [
    filters.estado !== 'todos' && {
      label: `Estado: ${ESTADO_OPTIONS.find(opt => opt.value === filters.estado)?.label || filters.estado}`,
      onRemove: () => setFilter('estado', 'todos'),
    },
  ].filter(Boolean);
  const clearFilters = () => setFilters(f => ({ ...f, estado: 'todos' }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 font-serif">Órdenes de Trabajo</h1>
        <p className="text-sm text-stone-500">Órdenes de trabajo generadas a partir de órdenes de servicio.</p>
      </div>

      <ListSearchPanel
        search={filters.search}
        onSearchChange={value => setFilter('search', value)}
        placeholder="Buscar por OT, OS, cliente, equipo..."
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        filters={[
          {
            label: 'Estado',
            items: [
              { label: 'Todos los estados', active: filters.estado === 'todos', onClick: () => setFilter('estado', 'todos') },
              ...ESTADO_OPTIONS.map(option => ({
                label: option.label,
                active: filters.estado === option.value,
                onClick: () => setFilter('estado', option.value),
              })),
            ],
          },
        ]}
        groupOptions={[
          { value: 'none', label: 'Sin agrupación' },
          { value: 'estado', label: 'Estado' },
          { value: 'cliente', label: 'Cliente' },
          { value: 'orden', label: 'Orden de servicio' },
        ]}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        favorites={ESTADO_OPTIONS.map(option => ({
          label: option.label,
          active: filters.estado === option.value,
          onClick: () => setFilter('estado', option.value),
        }))}
        actions={canCreate && (
          <button onClick={onAdd} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva OT
          </button>
        )}
      />

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
              ) : filtered.map((ot, index) => {
                const orden = ordenes[ot.ordenId];
                const cliente = clientes[orden?.clienteId];
                const ec = estadoMeta(ot.estado);
                const groupLabel = groupBy !== 'none' ? groupLabelFor(ot) : null;
                const prevGroupLabel = index > 0 ? groupLabelFor(filtered[index - 1]) : null;
                return (
                  <Fragment key={ot.id}>
                    {groupLabel && groupLabel !== prevGroupLabel && (
                      <tr className="border-t border-stone-200 bg-stone-50/80">
                        <td colSpan="7" className="px-3 py-2 text-xs font-semibold text-stone-700">{groupLabel}</td>
                      </tr>
                    )}
                    <tr onClick={() => onEdit(ot)} className="border-t border-stone-100 hover:bg-stone-50 cursor-pointer">
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
                  </Fragment>
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
