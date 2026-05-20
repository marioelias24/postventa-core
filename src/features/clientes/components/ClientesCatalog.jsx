import { Fragment, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, User, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react';
import { ListSearchPanel } from '@/shared/ui/ListSearchPanel';
import { useCan } from '@/app/permissions';

const CONTRACT_FILTERS = [
  { value: 'activos', label: 'Contrato activo' },
  { value: 'inactivos', label: 'Sin contrato activo' },
];

const QUICK_FILTERS = [
  { value: 'sinEmail', label: 'Sin email' },
  { value: 'sinTelefono', label: 'Sin teléfono' },
  { value: 'sinDireccion', label: 'Sin dirección' },
];

export function ClientesCatalog({ store }) {
  const { data, remove } = store;
  const [filters, setFilters] = useState({ search: '', contrato: 'todos', quick: 'todos' });
  const [groupBy, setGroupBy] = useState('none');
  const navigate = useNavigate();
  const canCreate = useCan('cliente:create');
  const canDelete = useCan('cliente:delete');
  const canBulk = useCan('cliente:bulk');

  const groupLabelFor = useCallback((c) => {
    if (groupBy === 'contrato') return c.contratoActivo !== false ? 'Contrato activo' : 'Sin contrato activo';
    if (groupBy === 'ubicacion') return c.direccion ? 'Con dirección' : 'Sin dirección';
    return '';
  }, [groupBy]);

  const filtered = useMemo(() => data.clientes.filter(c => {
    if (filters.contrato === 'activos' && c.contratoActivo === false) return false;
    if (filters.contrato === 'inactivos' && c.contratoActivo !== false) return false;
    if (filters.quick === 'sinEmail' && c.email) return false;
    if (filters.quick === 'sinTelefono' && c.telefono) return false;
    if (filters.quick === 'sinDireccion' && c.direccion) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (`${c.nombre} ${c.contacto || ''} ${c.direccion || ''} ${c.telefono || ''} ${c.email || ''}`).toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (groupBy !== 'none') {
      const byGroup = groupLabelFor(a).localeCompare(groupLabelFor(b));
      if (byGroup !== 0) return byGroup;
    }
    return a.nombre.localeCompare(b.nombre);
  }), [data.clientes, filters, groupBy, groupLabelFor]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const activeFilters = [
    filters.contrato !== 'todos' && {
      label: CONTRACT_FILTERS.find(item => item.value === filters.contrato)?.label || filters.contrato,
      onRemove: () => setFilter('contrato', 'todos'),
    },
    filters.quick !== 'todos' && {
      label: QUICK_FILTERS.find(item => item.value === filters.quick)?.label || filters.quick,
      onRemove: () => setFilter('quick', 'todos'),
    },
  ].filter(Boolean);
  const clearFilters = () => setFilters(f => ({ ...f, contrato: 'todos', quick: 'todos' }));

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    remove('clientes', id);
  };

  return (
    <div className="space-y-4">
      <ListSearchPanel
        search={filters.search}
        onSearchChange={value => setFilter('search', value)}
        placeholder="Buscar cliente..."
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        filters={[
          {
            label: 'Contrato',
            items: [
              { label: 'Todos los clientes', active: filters.contrato === 'todos', onClick: () => setFilter('contrato', 'todos') },
              ...CONTRACT_FILTERS.map(item => ({
                label: item.label,
                active: filters.contrato === item.value,
                onClick: () => setFilter('contrato', item.value),
              })),
            ],
          },
        ]}
        quickFilters={QUICK_FILTERS.map(item => ({
          label: item.label,
          active: filters.quick === item.value,
          onClick: () => setFilter('quick', filters.quick === item.value ? 'todos' : item.value),
        }))}
        groupOptions={[
          { value: 'none', label: 'Sin agrupación' },
          { value: 'contrato', label: 'Estado de contrato' },
          { value: 'ubicacion', label: 'Ubicación' },
        ]}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        favorites={[
          { label: 'Clientes activos', active: filters.contrato === 'activos', onClick: () => setFilter('contrato', 'activos') },
          { label: 'Pendientes de email', active: filters.quick === 'sinEmail', onClick: () => setFilter('quick', 'sinEmail') },
          { label: 'Pendientes de dirección', active: filters.quick === 'sinDireccion', onClick: () => setFilter('quick', 'sinDireccion') },
        ]}
        actions={(
          <>
            {canBulk && (
              <button
                onClick={() => navigate('importar')}
                className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg font-medium flex items-center gap-2"
                title="Importar clientes desde CSV/Excel"
              >
                <Upload className="w-4 h-4" /> Importar
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => navigate('nuevo')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nuevo cliente
              </button>
            )}
          </>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c, index) => {
          const groupLabel = groupBy !== 'none' ? groupLabelFor(c) : null;
          const prevGroupLabel = index > 0 ? groupLabelFor(filtered[index - 1]) : null;
          return (
            <Fragment key={c.id}>
              {groupLabel && groupLabel !== prevGroupLabel && (
                <div className="col-span-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700">
                  {groupLabel}
                </div>
              )}
              <div className="bg-white border border-stone-200 rounded-xl p-4 hover:border-teal-400 hover:shadow-sm transition-all flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-stone-900 truncate">{c.nombre}</h3>
                  </div>
                  {c.contratoActivo === false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Inactivo</span>}
                </div>
                <div className="space-y-1 text-xs text-stone-500 mb-3 flex-1">
                  {c.contacto && <div className="flex items-center gap-1.5"><User className="w-3 h-3 flex-shrink-0" />{c.contacto}</div>}
                  {c.telefono && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 flex-shrink-0" />{c.telefono}</div>}
                  {c.email && <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</div>}
                  {c.direccion && <div className="flex items-start gap-1.5"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{c.direccion}</span></div>}
                </div>
                <div className="flex gap-1 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => navigate(`${c.id}`)}
                    className="flex-1 py-1.5 text-xs rounded bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-2 py-1.5 text-xs rounded bg-red-50 hover:bg-red-100 text-red-700"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-stone-400 text-sm italic">Sin clientes registrados</div>}
      </div>
    </div>
  );
}
