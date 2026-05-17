import { useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { inputCls } from '@/styles/tokens';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { useCan } from '@/app/permissions';

// "todos" significa sin filtro; cualquier otro valor es un id numérico.
const parseFilter = (v) => (v === 'todos' ? 'todos' : Number(v));
const PAGE_SIZE = 60;

export function OrdersListView({ data, onEdit, onDelete, onAdd }) {
  const canCreate = useCan('orden:create');
  const canDelete = useCan('orden:delete');
  const [filters, setFilters] = useState({ estadoId: 'todos', tipoId: 'todos', tecnicoId: 'todos', search: '' });
  const [page, setPage] = useState(0);

  // Al cambiar cualquier filtro, volver a la primera página. (Patrón recomendado
  // de React: ajustar estado en render en vez de dentro de un useEffect.)
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setPage(0);
  }

  const cliMap = Object.fromEntries(data.clientes.map(c => [c.id, c]));
  const tcMap  = Object.fromEntries(data.tecnicos.map(t => [t.id, t]));
  const tiMap  = Object.fromEntries(data.tipos.map(t => [t.id, t]));
  const stMap  = Object.fromEntries(data.estados.map(s => [s.id, s]));

  const filtered = useMemo(() => {
    return data.ordenes.filter(o => {
      if (filters.estadoId !== 'todos' && o.estadoId !== filters.estadoId) return false;
      if (filters.tipoId !== 'todos' && o.tipoId !== filters.tipoId) return false;
      if (filters.tecnicoId !== 'todos' && !tecnicoIdsOf(o).includes(filters.tecnicoId)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const cli = cliMap[o.clienteId];
        const hay = `${cli?.nombre || ''} ${o.numero || ''} ${o.equipo || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const fa = a.fechaProgramada || '';
      const fb = b.fechaProgramada || '';
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fb.localeCompare(fa) || (a.horaInicio || '').localeCompare(b.horaInicio || '');
    });
  }, [data.ordenes, filters, cliMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min(filtered.length, safePage * PAGE_SIZE + PAGE_SIZE);
  // Ids de la lista filtrada actual: al abrir una orden se pasan como "hermanos"
  // para que los botones ‹ › del detalle recorran exactamente estos registros.
  const siblingIds = filtered.map(o => o.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Buscar cliente, OS, equipo..." className={inputCls + ' pl-9'} />
        </div>
        <select value={filters.estadoId} onChange={e => setFilters(f => ({ ...f, estadoId: parseFilter(e.target.value) }))} className={inputCls + ' w-auto'}>
          <option value="todos">Todos los estados</option>
          {data.estados.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={filters.tipoId} onChange={e => setFilters(f => ({ ...f, tipoId: parseFilter(e.target.value) }))} className={inputCls + ' w-auto'}>
          <option value="todos">Todos los tipos</option>
          {data.tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={filters.tecnicoId} onChange={e => setFilters(f => ({ ...f, tecnicoId: parseFilter(e.target.value) }))} className={inputCls + ' w-auto'}>
          <option value="todos">Todos los técnicos</option>
          {data.tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        {canCreate && (
          <button onClick={onAdd} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva</button>
        )}
      </div>

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
              ) : pageItems.map(o => {
                const cli = cliMap[o.clienteId];
                const ti = tiMap[o.tipoId];
                const st = stMap[o.estadoId];
                const tecNames = tecnicoIdsOf(o).map(id => tcMap[id]?.nombre).filter(Boolean);
                return (
                  <tr key={o.id} onClick={() => onEdit(o, siblingIds)} className="border-t border-stone-100 hover:bg-stone-50 cursor-pointer">
                    <td className="px-3 py-2 font-mono text-xs text-stone-500">{o.numero || `#${o.id}`}</td>
                    <td className="px-3 py-2 text-stone-900">
                      <div className="font-medium">{cli?.nombre || '—'}</div>
                      <div className="text-xs text-stone-500 truncate max-w-[200px]">{o.equipo}</div>
                    </td>
                    <td className="px-3 py-2 text-stone-700 whitespace-nowrap">{o.fechaProgramada || '—'}<div className="text-xs text-stone-500">{o.horaInicio || ''}</div></td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ backgroundColor: ti?.color || '#64748b' }}>{ti?.nombre || '—'}</span></td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: (st?.color || '#64748b') + '22', color: st?.color || '#64748b' }}>{st?.nombre || '—'}</span></td>
                    <td className="px-3 py-2 text-stone-700 text-xs">{tecNames.length ? tecNames.join(', ') : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(o, siblingIds); }} className="p-1.5 rounded hover:bg-stone-100 text-stone-500" title="Abrir"><Edit2 className="w-3.5 h-3.5" /></button>
                        {canDelete && (
                          <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar?')) onDelete(o.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
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
