import { useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { inputCls } from '@/styles/tokens';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { useCan } from '@/app/permissions';

const parseFilter = (v) => (v === 'todos' ? 'todos' : Number(v));

function BacklogGroup({ prioridad, items, cliMap, tcMap, tiMap, stMap, canDelete, onEdit, onDelete, siblingIds }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-stone-50 hover:bg-stone-100 border-b border-stone-200 text-left"
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
        }
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: prioridad?.color || '#a8a29e' }}
        />
        <span className="text-sm font-semibold text-stone-700">
          {prioridad?.nombre ?? 'Sin prioridad'}
        </span>
        <span className="text-xs text-stone-400 font-normal ml-1">({items.length})</span>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-stone-500 uppercase tracking-wider border-b border-stone-100">
              <tr>
                <th className="px-3 py-2 text-left">OS</th>
                <th className="px-3 py-2 text-left">Cliente / Equipo</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Técnico</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map(o => {
                const cli = cliMap[o.clienteId];
                const ti = tiMap[o.tipoId];
                const st = stMap[o.estadoId];
                const tecNames = tecnicoIdsOf(o).map(id => tcMap[id]?.nombre).filter(Boolean);
                return (
                  <tr
                    key={o.id}
                    onClick={() => onEdit(o, siblingIds)}
                    className="border-t border-stone-100 hover:bg-stone-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-stone-500 whitespace-nowrap">
                      {o.numero || `#${o.id}`}
                    </td>
                    <td className="px-3 py-2 text-stone-900">
                      <div className="font-medium">{cli?.nombre || '—'}</div>
                      <div className="text-xs text-stone-500 truncate max-w-[200px]">{o.equipo}</div>
                    </td>
                    <td className="px-3 py-2">
                      {ti
                        ? <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ backgroundColor: ti.color }}>{ti.nombre}</span>
                        : <span className="text-stone-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      {st
                        ? <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: st.color + '22', color: st.color }}>{st.nombre}</span>
                        : <span className="text-stone-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {tecNames.length
                        ? <span className="text-stone-700">{tecNames.join(', ')}</span>
                        : <span className="text-amber-600 font-medium">Sin asignar</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(o, siblingIds); }}
                          className="p-1.5 rounded hover:bg-stone-100 text-stone-500"
                          title="Abrir"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar esta orden?')) onDelete(o.id); }}
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
      )}
    </div>
  );
}

export function BacklogView({ data, onEdit, onDelete, onAdd }) {
  const canCreate = useCan('orden:create');
  const canDelete = useCan('orden:delete');
  const [filters, setFilters] = useState({ search: '', tipoId: 'todos', estadoId: 'todos', sinAsignar: false });

  const cliMap = Object.fromEntries(data.clientes.map(c => [c.id, c]));
  const tcMap  = Object.fromEntries(data.tecnicos.map(t => [t.id, t]));
  const tiMap  = Object.fromEntries(data.tipos.map(t => [t.id, t]));
  const stMap  = Object.fromEntries(data.estados.map(s => [s.id, s]));

  const backlogOrdenes = useMemo(
    () => data.ordenes.filter(o => !o.fechaProgramada),
    [data.ordenes],
  );

  const sinAsignarCount = useMemo(
    () => backlogOrdenes.filter(o => tecnicoIdsOf(o).length === 0).length,
    [backlogOrdenes],
  );

  const filtered = useMemo(() => {
    return backlogOrdenes.filter(o => {
      if (filters.tipoId !== 'todos' && o.tipoId !== filters.tipoId) return false;
      if (filters.estadoId !== 'todos' && o.estadoId !== filters.estadoId) return false;
      if (filters.sinAsignar && tecnicoIdsOf(o).length > 0) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const cli = cliMap[o.clienteId];
        const hay = `${cli?.nombre || ''} ${o.numero || ''} ${o.equipo || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [backlogOrdenes, filters, cliMap]);

  const prioridades = useMemo(
    () => [...data.prioridades].sort((a, b) => a.nivel - b.nivel),
    [data.prioridades],
  );

  const groups = useMemo(() => {
    const result = [];
    for (const p of prioridades) {
      const items = filtered.filter(o => o.prioridadId === p.id);
      if (items.length > 0) result.push({ prioridad: p, items });
    }
    const sinPrioridad = filtered.filter(o => !o.prioridadId);
    if (sinPrioridad.length > 0) result.push({ prioridad: null, items: sinPrioridad });
    return result;
  }, [filtered, prioridades]);

  const siblingIds = filtered.map(o => o.id);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
          <p className="text-xs text-stone-500">En backlog</p>
          <p className="text-2xl font-bold text-stone-800">{backlogOrdenes.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
          <p className="text-xs text-stone-500">Sin asignar</p>
          <p className="text-2xl font-bold text-amber-600">{sinAsignarCount}</p>
        </div>
        {prioridades.map(p => {
          const count = backlogOrdenes.filter(o => o.prioridadId === p.id).length;
          if (!count) return null;
          return (
            <div key={p.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex-1 min-w-[100px]">
              <p className="text-xs" style={{ color: p.color }}>{p.nombre}</p>
              <p className="text-2xl font-bold" style={{ color: p.color }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar cliente, OS, equipo..."
            className={inputCls + ' pl-9'}
          />
        </div>
        <select
          value={filters.estadoId}
          onChange={e => setFilters(f => ({ ...f, estadoId: parseFilter(e.target.value) }))}
          className={inputCls + ' w-auto'}
        >
          <option value="todos">Todos los estados</option>
          {data.estados.filter(s => s.activo).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select
          value={filters.tipoId}
          onChange={e => setFilters(f => ({ ...f, tipoId: parseFilter(e.target.value) }))}
          className={inputCls + ' w-auto'}
        >
          <option value="todos">Todos los tipos</option>
          {data.tipos.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <button
          onClick={() => setFilters(f => ({ ...f, sinAsignar: !f.sinAsignar }))}
          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            filters.sinAsignar
              ? 'bg-amber-100 border-amber-300 text-amber-700'
              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          Sin asignar
        </button>
        {canCreate && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva
          </button>
        )}
      </div>

      {/* Empty state */}
      {backlogOrdenes.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 py-16 text-center space-y-1">
          <p className="text-stone-500 text-sm">El backlog está vacío</p>
          <p className="text-stone-400 text-xs">Las órdenes sin fecha programada aparecen aquí</p>
          {canCreate && (
            <button
              onClick={onAdd}
              className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Agregar al backlog
            </button>
          )}
        </div>
      )}

      {backlogOrdenes.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 py-8 text-center">
          <p className="text-stone-400 text-sm">Sin resultados con los filtros actuales</p>
        </div>
      )}

      {groups.map(({ prioridad, items }) => (
        <BacklogGroup
          key={prioridad?.id ?? 'sin'}
          prioridad={prioridad}
          items={items}
          cliMap={cliMap}
          tcMap={tcMap}
          tiMap={tiMap}
          stMap={stMap}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
          siblingIds={siblingIds}
        />
      ))}

      {filtered.length > 0 && (
        <p className="text-xs text-stone-400 text-right">
          {filtered.length} {filtered.length === 1 ? 'orden' : 'órdenes'}
          {filtered.length !== backlogOrdenes.length && ` (filtradas de ${backlogOrdenes.length})`}
        </p>
      )}
    </div>
  );
}
