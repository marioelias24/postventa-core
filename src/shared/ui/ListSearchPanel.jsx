import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, Filter, Layers3, Search, Star, Trash2, X,
} from 'lucide-react';
import { inputCls } from '@/styles/tokens';

export function ListSearchPanel({
  search,
  onSearchChange,
  placeholder = 'Buscar...',
  filters = [],
  quickFilters = [],
  activeFilters = [],
  onClearFilters,
  groupOptions = [],
  groupBy = 'none',
  onGroupByChange,
  favorites = [],
  actions,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const activeGroupLabel = groupOptions.find(option => option.value === groupBy)?.label;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const hasActiveFilters = activeFilters.length > 0 || groupBy !== 'none';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className={inputCls + ' pl-9 pr-10'}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              title="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
              hasActiveFilters
                ? 'border-teal-300 bg-teal-50 text-teal-800'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            <ChevronDown className="h-4 w-4" />
          </button>

          {open && (
            <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,720px)] rounded-lg border border-stone-200 bg-white p-4 shadow-xl">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <PanelColumn icon={Filter} title="Filtros">
                  {filters.map(group => (
                    <div key={group.label} className="space-y-1 border-b border-stone-100 pb-2 last:border-b-0">
                      <div className="text-[11px] font-medium uppercase text-stone-400">{group.label}</div>
                      {group.items.map(item => (
                        <MenuItem key={item.label} active={item.active} onClick={item.onClick}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </div>
                  ))}
                  {quickFilters.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {quickFilters.map(item => (
                        <MenuItem key={item.label} active={item.active} onClick={item.onClick}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </div>
                  )}
                </PanelColumn>

                <PanelColumn icon={Layers3} title="Agrupar por">
                  {groupOptions.map(option => (
                    <MenuItem
                      key={option.value}
                      active={groupBy === option.value}
                      onClick={() => onGroupByChange?.(option.value)}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </PanelColumn>

                <PanelColumn icon={Star} title="Favoritos">
                  {favorites.length > 0 ? favorites.map(fav => (
                    <div key={fav.label} className="flex items-center justify-between gap-2">
                      <MenuItem active={fav.active} onClick={fav.onClick}>{fav.label}</MenuItem>
                      {fav.onDelete && (
                        <button type="button" onClick={fav.onDelete} className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )) : (
                    <div className="text-xs text-stone-400">Sin favoritos guardados.</div>
                  )}
                </PanelColumn>
              </div>
            </div>
          )}
        </div>

        {actions}
      </div>

      {(activeFilters.length > 0 || groupBy !== 'none') && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map(filter => (
            <button
              key={filter.label}
              type="button"
              onClick={filter.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100"
            >
              {filter.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {groupBy !== 'none' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600">
              Agrupado: {activeGroupLabel || groupBy}
            </span>
          )}
          {activeFilters.length > 0 && (
            <button type="button" onClick={onClearFilters} className="text-xs text-stone-500 hover:text-stone-800">
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PanelColumn({ icon: Icon, title, children }) {
  return (
    <div className="min-w-0 space-y-2 border-stone-200 md:border-r md:pr-4 md:last:border-r-0">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
        <Icon className="h-4 w-4 text-teal-700" />
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function MenuItem({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
        active ? 'bg-teal-50 font-medium text-teal-800' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
      }`}
    >
      <span className="truncate">{children}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />}
    </button>
  );
}
