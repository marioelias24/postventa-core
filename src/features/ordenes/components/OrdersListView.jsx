import { Fragment, useMemo, useState } from 'react';
import { Plus, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ListSearchPanel } from '@/shared/ui/ListSearchPanel';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { getOrderStatusMeta, normalizeOrderStatus, OS_STATUS_STEPS } from '@/shared/lib/orderStatus';
import { useCan } from '@/app/permissions';

const PAGE_SIZE = 60;

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function OrdersListView({ data, onEdit, onAdd }) {
  const canCreate = useCan('orden:create');
  const [filters, setFilters] = useState({ estado: 'todos', tipoId: 'todos', tecnicoId: 'todos', quick: 'todos', search: '' });
  const [groupBy, setGroupBy] = useState('none');
  const [page, setPage] = useState(0);

  // Al cambiar cualquier filtro, volver a la primera página. (Patrón recomendado
  // de React: ajustar estado en render en vez de dentro de un useEffect.)
  const [prevFilters, setPrevFilters] = useState(filters);
  const [prevGroupBy, setPrevGroupBy] = useState(groupBy);
  if (filters !== prevFilters || groupBy !== prevGroupBy) {
    setPrevFilters(filters);
    setPrevGroupBy(groupBy);
    setPage(0);
  }

  const cliMap = Object.fromEntries(data.clientes.map(c => [c.id, c]));
  const tcMap  = Object.fromEntries(data.tecnicos.map(t => [t.id, t]));
  const tiMap  = Object.fromEntries(data.tipos.map(t => [t.id, t]));
  const otsByOrden = useMemo(() => new Set((data.ordenesTrabajo || []).map(ot => ot.ordenId)), [data.ordenesTrabajo]);
  const today = dateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateKey(tomorrowDate);

  const filtered = useMemo(() => {
    const groupLabel = (o) => {
      if (groupBy === 'estado') return getOrderStatusMeta(o, data.estados).label;
      if (groupBy === 'tipo') return tiMap[o.tipoId]?.nombre || 'Sin tipo';
      if (groupBy === 'tecnico') {
        const names = tecnicoIdsOf(o).map(id => tcMap[id]?.nombre).filter(Boolean);
        return names[0] || 'Sin técnico';
      }
      if (groupBy === 'cliente') return cliMap[o.clienteId]?.nombre || 'Sin cliente';
      if (groupBy === 'fecha') return o.fechaProgramada || 'Sin fecha';
      return '';
    };

    return data.ordenes.filter(o => {
      if (filters.estado !== 'todos' && normalizeOrderStatus(o, data.estados) !== filters.estado) return false;
      if (filters.tipoId !== 'todos' && o.tipoId !== filters.tipoId) return false;
      if (filters.tecnicoId !== 'todos' && !tecnicoIdsOf(o).includes(filters.tecnicoId)) return false;
      if (filters.quick === 'hoy' && o.fechaProgramada !== today) return false;
      if (filters.quick === 'manana' && o.fechaProgramada !== tomorrow) return false;
      if (filters.quick === 'sinOT' && otsByOrden.has(o.id)) return false;
      if (filters.quick === 'conOT' && !otsByOrden.has(o.id)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const cli = cliMap[o.clienteId];
        const hay = `${cli?.nombre || ''} ${o.numero || ''} ${o.equipo || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (groupBy !== 'none') {
        const byGroup = groupLabel(a).localeCompare(groupLabel(b));
        if (byGroup !== 0) return byGroup;
      }
      return b.fechaProgramada.localeCompare(a.fechaProgramada) || a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [data.ordenes, data.estados, filters, groupBy, cliMap, tiMap, tcMap, today, tomorrow, otsByOrden]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min(filtered.length, safePage * PAGE_SIZE + PAGE_SIZE);
  // Ids de la lista filtrada actual: al abrir una orden se pasan como "hermanos"
  // para que los botones ‹ › del detalle recorran exactamente estos registros.
  const siblingIds = filtered.map(o => o.id);
  const groupLabelFor = (o) => {
    if (groupBy === 'estado') return getOrderStatusMeta(o, data.estados).label;
    if (groupBy === 'tipo') return tiMap[o.tipoId]?.nombre || 'Sin tipo';
    if (groupBy === 'tecnico') {
      const names = tecnicoIdsOf(o).map(id => tcMap[id]?.nombre).filter(Boolean);
      return names[0] || 'Sin técnico';
    }
    if (groupBy === 'cliente') return cliMap[o.clienteId]?.nombre || 'Sin cliente';
    if (groupBy === 'fecha') return o.fechaProgramada || 'Sin fecha';
    return '';
  };
  const quickLabels = { hoy: 'Fecha: hoy', manana: 'Fecha: mañana', sinOT: 'Sin OT', conOT: 'Tiene OT' };
  const activeFilters = [
    filters.estado !== 'todos' && {
      label: `Estado: ${getOrderStatusMeta(filters.estado).label}`,
      onRemove: () => setFilters(f => ({ ...f, estado: 'todos' })),
    },
    filters.tipoId !== 'todos' && {
      label: `Tipo: ${tiMap[filters.tipoId]?.nombre || filters.tipoId}`,
      onRemove: () => setFilters(f => ({ ...f, tipoId: 'todos' })),
    },
    filters.tecnicoId !== 'todos' && {
      label: `Técnico: ${tcMap[filters.tecnicoId]?.nombre || filters.tecnicoId}`,
      onRemove: () => setFilters(f => ({ ...f, tecnicoId: 'todos' })),
    },
    filters.quick !== 'todos' && {
      label: quickLabels[filters.quick],
      onRemove: () => setFilters(f => ({ ...f, quick: 'todos' })),
    },
  ].filter(Boolean);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const clearFilters = () => setFilters(f => ({ ...f, estado: 'todos', tipoId: 'todos', tecnicoId: 'todos', quick: 'todos' }));

  return (
    <div className="space-y-4">
      <ListSearchPanel
        search={filters.search}
        onSearchChange={value => setFilter('search', value)}
        placeholder="Buscar cliente, OS, equipo..."
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        filters={[
          {
            label: 'Estado',
            items: [
              { label: 'Todos los estados', active: filters.estado === 'todos', onClick: () => setFilter('estado', 'todos') },
              ...OS_STATUS_STEPS.map(status => ({ label: status.label, active: filters.estado === status.key, onClick: () => setFilter('estado', status.key) })),
            ],
          },
          {
            label: 'Tipo',
            items: [
              { label: 'Todos los tipos', active: filters.tipoId === 'todos', onClick: () => setFilter('tipoId', 'todos') },
              ...data.tipos.map(t => ({ label: t.nombre, active: filters.tipoId === t.id, onClick: () => setFilter('tipoId', t.id) })),
            ],
          },
          {
            label: 'Técnico',
            items: [
              { label: 'Todos los técnicos', active: filters.tecnicoId === 'todos', onClick: () => setFilter('tecnicoId', 'todos') },
              ...data.tecnicos.map(t => ({ label: t.nombre, active: filters.tecnicoId === t.id, onClick: () => setFilter('tecnicoId', t.id) })),
            ],
          },
        ]}
        quickFilters={[
          { label: 'Fecha programada: hoy', active: filters.quick === 'hoy', onClick: () => setFilter('quick', filters.quick === 'hoy' ? 'todos' : 'hoy') },
          { label: 'Fecha programada: mañana', active: filters.quick === 'manana', onClick: () => setFilter('quick', filters.quick === 'manana' ? 'todos' : 'manana') },
          { label: 'Sin OT', active: filters.quick === 'sinOT', onClick: () => setFilter('quick', filters.quick === 'sinOT' ? 'todos' : 'sinOT') },
          { label: 'Tiene OT', active: filters.quick === 'conOT', onClick: () => setFilter('quick', filters.quick === 'conOT' ? 'todos' : 'conOT') },
        ]}
        groupOptions={[
          { value: 'none', label: 'Sin agrupación' },
          { value: 'estado', label: 'Estado' },
          { value: 'tipo', label: 'Tipo de servicio' },
          { value: 'tecnico', label: 'Técnico' },
          { value: 'cliente', label: 'Cliente' },
          { value: 'fecha', label: 'Fecha programada' },
        ]}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        favorites={[
          { label: 'Fecha de servicio hoy', onClick: () => setFilters(f => ({ ...f, quick: 'hoy' })) },
          { label: 'Sin orden de trabajo', active: filters.quick === 'sinOT', onClick: () => setFilter('quick', 'sinOT') },
          { label: 'Con orden de trabajo', active: filters.quick === 'conOT', onClick: () => setFilter('quick', 'conOT') },
        ]}
        actions={canCreate && (
          <button onClick={onAdd} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva</button>
        )}
      />

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">OS</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Técnico</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-stone-400 italic">Sin resultados</td></tr>
              ) : pageItems.map((o, index) => {
                const cli = cliMap[o.clienteId];
                const ti = tiMap[o.tipoId];
                const st = getOrderStatusMeta(o, data.estados);
                const tecNames = tecnicoIdsOf(o).map(id => tcMap[id]?.nombre).filter(Boolean);
                const groupLabel = groupBy !== 'none' ? groupLabelFor(o) : null;
                const prevGroupLabel = index > 0 ? groupLabelFor(pageItems[index - 1]) : null;
                return (
                  <Fragment key={o.id}>
                    {groupLabel && groupLabel !== prevGroupLabel && (
                      <tr className="border-t border-stone-200 bg-stone-50/80">
                        <td colSpan="7" className="px-3 py-2 text-xs font-semibold text-stone-700">{groupLabel}</td>
                      </tr>
                    )}
                    <tr onClick={() => onEdit(o, siblingIds)} className="border-t border-stone-100 hover:bg-stone-50 cursor-pointer">
                      <td className="px-3 py-2 font-mono text-xs text-stone-500">{o.numero || `#${o.id}`}</td>
                      <td className="px-3 py-2 text-stone-900">
                        <div className="font-medium">{cli?.nombre || '—'}</div>
                        <div className="text-xs text-stone-500 truncate max-w-[200px]">{o.equipo}</div>
                      </td>
                      <td className="px-3 py-2 text-stone-700 whitespace-nowrap">{o.fechaProgramada}<div className="text-xs text-stone-500">{o.horaInicio}</div></td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ backgroundColor: ti?.color || '#64748b' }}>{ti?.nombre || '—'}</span></td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: st.color + '22', color: st.color }}>{st.label}</span></td>
                      <td className="px-3 py-2 text-stone-700 text-xs">{tecNames.length ? tecNames.join(', ') : '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); onEdit(o, siblingIds); }} className="p-1.5 rounded hover:bg-stone-100 text-stone-500" title="Abrir"><Edit2 className="w-3.5 h-3.5" /></button>
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span>
          Mostrando {from}–{to} de {filtered.length} {filtered.length === 1 ? 'orden' : 'órdenes'}
          {filtered.length !== data.ordenes.length && ` (filtradas de ${data.ordenes.length})`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
              className="px-2 py-1 rounded bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 disabled:opacity-30 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="px-2 text-stone-500">Página {safePage + 1} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
              className="px-2 py-1 rounded bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 disabled:opacity-30 flex items-center gap-1">
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
