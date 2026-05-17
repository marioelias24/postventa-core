import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, User } from 'lucide-react';
import { fmt } from '@/shared/lib/dates';
import { inputCls } from '@/styles/tokens';
import { useUI } from '@/app/UIContext';
import { useCan } from '@/app/permissions';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { BRAND } from '@/config/branding';
import { MonthGrid } from './MonthGrid';
import { WeekGrid } from './WeekGrid';
import { DayView } from './DayView';

// Paleta determinística para asignar un color a cada técnico (avatar de inicial).
const TEC_COLORS = ['#0ea5e9', '#f97316', '#a855f7', '#22c55e', '#ec4899', '#eab308', '#06b6d4', '#ef4444', '#84cc16'];
function colorForTecnico(id) {
  if (id == null) return '#475569'; // gris para "sin asignar"
  return TEC_COLORS[Math.abs(Number(id) || 0) % TEC_COLORS.length];
}
function initialOf(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export function CalendarView({ data, onSelectDate, onSelectOrder, onOpenForm }) {
  // La vista (mes/semana/día) y la fecha de referencia viven en UIContext para
  // que sobrevivan a entrar y salir de una orden.
  const { calendarView: viewMode, setCalendarView: setViewMode, calendarRefDate: refDate, setCalendarRefDate: setRefDate } = useUI();
  const [filters, setFilters] = useState({ tecnicoId: 'todos', clienteId: 'todos' });
  const canCreate = useCan('orden:create');

  const ordersByDay = useMemo(() => {
    const filtered = data.ordenes.filter(o => {
      if (filters.tecnicoId !== 'todos') {
        const tecIds = tecnicoIdsOf(o);
        if (filters.tecnicoId === 'sin') {
          if (tecIds.length) return false;
        } else if (!tecIds.includes(filters.tecnicoId)) return false;
      }
      if (filters.clienteId !== 'todos' && o.clienteId !== filters.clienteId) return false;
      return true;
    });
    const map = {};
    filtered.forEach(o => { (map[o.fechaProgramada] = map[o.fechaProgramada] || []).push(o); });
    Object.values(map).forEach(a => a.sort((x, y) => x.horaInicio.localeCompare(y.horaInicio)));
    return map;
  }, [data.ordenes, filters]);

  const tipoMap   = useMemo(() => Object.fromEntries(data.tipos.map(t => [t.id, t])), [data.tipos]);
  const cliMap    = useMemo(() => Object.fromEntries(data.clientes.map(c => [c.id, c])), [data.clientes]);
  const tecMap    = useMemo(() => Object.fromEntries(data.tecnicos.map(t => [t.id, t])), [data.tecnicos]);
  const estadoMap = useMemo(() => Object.fromEntries(data.estados.map(s => [s.id, s])), [data.estados]);
  const prioMap   = useMemo(() => Object.fromEntries(data.prioridades.map(p => [p.id, p])), [data.prioridades]);
  const today = fmt(new Date());

  const navigate = (delta) => {
    const d = new Date(refDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + delta);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7 * delta);
    else d.setDate(d.getDate() + delta);
    setRefDate(d);
  };
  const goToday = () => setRefDate(new Date());

  const headerLabel = useMemo(() => {
    const d = refDate instanceof Date ? refDate : new Date(refDate);
    if (viewMode === 'day') {
      return d.toLocaleDateString(BRAND.locale, { weekday: 'long', day: 'numeric', month: 'long' });
    }
    if (viewMode === 'week') {
      const start = new Date(d); start.setDate(start.getDate() - start.getDay());
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const fmtShort = (x) => `${x.getDate()} ${x.toLocaleDateString(BRAND.locale, { month: 'short' })}`;
      return `${fmtShort(start)} – ${fmtShort(end)} ${end.getFullYear()}`;
    }
    return d.toLocaleDateString(BRAND.locale, { month: 'long', year: 'numeric' });
  }, [viewMode, refDate]);

  const cardOrder = (o) => {
    const tipo = tipoMap[o.tipoId];
    const cli = cliMap[o.clienteId];
    const tecObjs = tecnicoIdsOf(o).map(id => tecMap[id]).filter(Boolean);
    const firstTec = tecObjs[0];
    const tecColor = colorForTecnico(firstTec?.id);
    const tecText = tecObjs.length ? tecObjs.map(t => t.nombre).join(', ') : 'Sin asignar';
    const numLabel = o.numero || `#${o.id}`;
    const siblingIds = (ordersByDay[o.fechaProgramada] || []).map(x => x.id);
    return (
      <button key={o.id} onClick={(e) => { e.stopPropagation(); onSelectOrder(o.id, siblingIds); }}
        className="w-full text-left rounded-md px-2 py-1.5 text-white leading-tight hover:opacity-90 transition-opacity"
        style={{ backgroundColor: tipo?.color || '#64748b' }}
        title={`${numLabel} · ${o.horaInicio} · ${cli?.nombre || ''} · ${tecText} · ${o.equipo}`}>
        <div className="truncate text-xs sm:text-sm font-bold">{numLabel}</div>
        <div className="flex items-center gap-1.5 text-[11px] opacity-95 mt-0.5">
          <span className="font-semibold">{o.horaInicio.slice(0, 5)}</span>
          <span className="truncate">{cli?.nombre || '—'}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white flex-shrink-0 ring-1 ring-white/40"
            style={{ backgroundColor: tecColor }}
            aria-label={tecText}
          >
            {firstTec ? initialOf(firstTec.nombre) : '?'}
          </span>
          <span className="truncate text-[11px] font-semibold">{tecText}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg bg-white p-0.5 border border-stone-200">
            {[{ k: 'day', label: 'Día' }, { k: 'week', label: 'Semana' }, { k: 'month', label: 'Mes' }].map(v => (
              <button key={v.k}
                onClick={() => { setViewMode(v.k); if (v.k === 'day') setRefDate(new Date()); }}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${viewMode === v.k ? 'bg-teal-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-stone-800 capitalize min-w-[200px] text-center font-serif">{headerLabel}</h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-600">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-600">Hoy</button>
        </div>
        {canCreate && (
          <button onClick={() => onOpenForm()} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Nueva orden
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-stone-500 flex items-center gap-1"><User className="w-3 h-3" /> Filtros:</span>
        <select
          value={filters.tecnicoId}
          onChange={e => {
            const v = e.target.value;
            setFilters(f => ({ ...f, tecnicoId: (v === 'todos' || v === 'sin') ? v : Number(v) }));
          }}
          className={inputCls + ' w-auto text-xs py-1.5'}
        >
          <option value="todos">Todos los técnicos</option>
          <option value="sin">Sin asignar</option>
          {data.tecnicos.filter(t => t.activo).map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
        <select
          value={filters.clienteId}
          onChange={e => {
            const v = e.target.value;
            setFilters(f => ({ ...f, clienteId: v === 'todos' ? 'todos' : Number(v) }));
          }}
          className={inputCls + ' w-auto text-xs py-1.5'}
        >
          <option value="todos">Todos los clientes</option>
          {data.clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {(filters.tecnicoId !== 'todos' || filters.clienteId !== 'todos') && (
          <button
            onClick={() => setFilters({ tecnicoId: 'todos', clienteId: 'todos' })}
            className="text-xs text-teal-700 hover:text-teal-800"
          >
            Limpiar
          </button>
        )}
      </div>

      {viewMode === 'month' && (
        <MonthGrid refDate={refDate} ordersByDay={ordersByDay} today={today} onSelectDate={onSelectDate} cardOrder={cardOrder} />
      )}
      {viewMode === 'week' && (
        <WeekGrid refDate={refDate} ordersByDay={ordersByDay} today={today} onSelectDate={onSelectDate} cardOrder={cardOrder} />
      )}
      {viewMode === 'day' && (
        <DayView
          refDate={refDate}
          ordersByDay={ordersByDay}
          tipoMap={tipoMap} cliMap={cliMap} tecMap={tecMap} estadoMap={estadoMap} prioMap={prioMap}
          tecnicos={data.tecnicos.filter(t => t.activo)}
          tecnicoFilter={filters.tecnicoId}
          onSelectOrder={onSelectOrder}
          onOpenForm={onOpenForm}
        />
      )}

      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
        <div className="flex flex-wrap gap-3">
          <span className="text-stone-400">Tipos:</span>
          {data.tipos.filter(t => t.activo).map(t => (
            <div key={t.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
              {t.nombre}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
