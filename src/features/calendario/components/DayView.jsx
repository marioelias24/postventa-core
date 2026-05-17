import { useMemo } from 'react';
import { Calendar as CalIcon, Plus, Users } from 'lucide-react';
import { fmt } from '@/shared/lib/dates';
import { tecnicoIdsOf } from '@/shared/lib/orders';

// Tablero de planificación del día: eje de horas en horizontal, una fila por
// técnico, las órdenes como bloques ubicados según hora de inicio y duración.
const START_HOUR = 7;
const END_HOUR = 18;
const SPAN = END_HOUR - START_HOUR;            // horas visibles
const HOURS = Array.from({ length: SPAN }, (_, i) => START_HOUR + i);
const LANE_H = 56;                              // alto de un bloque (px)
const LANE_GAP = 4;
const TRACK_PAD = 4;                            // relleno vertical de cada fila

// Paleta determinística para el avatar de cada técnico.
const TEC_COLORS = ['#0ea5e9', '#f97316', '#a855f7', '#22c55e', '#ec4899', '#eab308', '#06b6d4', '#ef4444', '#84cc16'];
const colorForTecnico = (id) => (id == null ? '#475569' : TEC_COLORS[Math.abs(Number(id) || 0) % TEC_COLORS.length]);
const initialOf = (name) => (name ? name.trim().charAt(0).toUpperCase() : '?');

const parseHora = (s) => {
  const [h, m] = String(s || '08:00').split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
};
const hhmm = (h) => `${String(Math.trunc(h)).padStart(2, '0')}:${String(Math.round((h - Math.trunc(h)) * 60)).padStart(2, '0')}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Asigna a cada orden un "carril" para que las que se solapan no queden encima.
function packLanes(orders) {
  const laneEnds = []; // fin (en horas) del último bloque de cada carril
  return orders.map((o) => {
    let lane = laneEnds.findIndex((end) => end <= o._start + 1e-6);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(o._end); }
    else laneEnds[lane] = o._end;
    return lane;
  });
}

export function DayView({ refDate, ordersByDay, tipoMap, cliMap, tecMap, estadoMap, prioMap, tecnicos, tecnicoFilter, onSelectOrder, onOpenForm }) {
  const key = fmt(refDate);
  const dayOrders = useMemo(() => ordersByDay[key] || [], [ordersByDay, key]);
  const siblingIds = useMemo(() => dayOrders.map((x) => x.id), [dayOrders]);

  // Filas a mostrar: técnicos activos (los que tienen trabajo primero) + "Sin
  // asignar" si hay órdenes sin técnico. Si hay filtro de técnico, solo esa fila.
  const rows = useMemo(() => {
    const byTec = new Map();
    let sinAsignar = [];
    for (const o of dayOrders) {
      const ids = tecnicoIdsOf(o);
      if (ids.length === 0) sinAsignar.push(o);
      else for (const id of ids) {
        if (!byTec.has(id)) byTec.set(id, []);
        byTec.get(id).push(o);
      }
    }
    let list;
    if (tecnicoFilter === 'sin') {
      list = [{ id: null, nombre: 'Sin asignar', orders: sinAsignar }];
    } else if (tecnicoFilter !== 'todos') {
      const t = tecMap[tecnicoFilter];
      list = [{ id: tecnicoFilter, nombre: t?.nombre || `Técnico #${tecnicoFilter}`, orders: byTec.get(tecnicoFilter) || [] }];
    } else {
      list = (tecnicos || [])
        .map((t) => ({ id: t.id, nombre: t.nombre, orders: byTec.get(t.id) || [] }))
        .sort((a, b) => (b.orders.length - a.orders.length) || a.nombre.localeCompare(b.nombre));
      if (sinAsignar.length) list.push({ id: null, nombre: 'Sin asignar', orders: sinAsignar });
    }
    // Pre-cálculo de posición/carril por fila.
    return list.map((r) => {
      const ords = [...r.orders]
        .map((o) => {
          const start = parseHora(o.horaInicio);
          const dur = Math.max(0.25, Number(o.duracionEstimada) || 1);
          return { ...o, _start: start, _end: start + dur };
        })
        .sort((a, b) => a._start - b._start || a._end - b._end);
      const lanes = packLanes(ords);
      const laneCount = ords.length ? Math.max(0, ...lanes) + 1 : 1;
      return { ...r, ords: ords.map((o, i) => ({ ...o, _lane: lanes[i] })), laneCount };
    });
  }, [dayOrders, tecnicos, tecnicoFilter, tecMap]);

  // Indicador "ahora" si la fecha de referencia es hoy y la hora cae en el rango.
  const now = new Date();
  const nowFrac = (fmt(now) === key) ? (now.getHours() + now.getMinutes() / 60 - START_HOUR) / SPAN : null;
  const showNow = nowFrac != null && nowFrac >= 0 && nowFrac <= 1;

  const totalHoras = dayOrders.reduce((s, o) => s + (Number(o.duracionEstimada) || 0), 0);
  const tecnicosActivos = (tecnicos || []).length;
  const tecnicosConTrabajo = rows.filter((r) => r.id != null && r.ords.length > 0).length;

  const hourFromClickX = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return 8;
    const frac = (e.clientX - rect.left) / rect.width;
    return clamp(Math.round(START_HOUR + frac * SPAN), START_HOUR, END_HOUR - 1);
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
        <CalIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-stone-500 text-sm mb-4">No hay técnicos activos para mostrar en el tablero.</p>
        <button onClick={() => onOpenForm()} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Crear orden
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dayOrders.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2">
          <CalIcon className="w-3.5 h-3.5 text-stone-400" />
          Sin órdenes programadas para este día. Haz clic en una franja de horario de un técnico para crear una.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <div className="min-w-[820px]">
          {/* Cabecera con las horas */}
          <div className="flex border-b border-stone-200 bg-stone-50">
            <div className="w-48 flex-shrink-0 sticky left-0 z-20 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-500 border-r border-stone-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Técnicos
            </div>
            <div className="flex-1 flex">
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-[11px] text-stone-400 px-1.5 py-2 border-l border-stone-100 first:border-l-0 tabular-nums">
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Filas de técnicos */}
          <div className="relative">
            {showNow && (
              <div
                className="absolute top-0 bottom-0 w-px bg-rose-500 z-10 pointer-events-none"
                style={{ left: `calc(12rem + (100% - 12rem) * ${nowFrac})` }}
              >
                <span className="absolute -top-px -left-1 w-2 h-2 rounded-full bg-rose-500" />
              </div>
            )}
            {rows.map((r, ri) => {
              const rowH = r.laneCount * LANE_H + (r.laneCount - 1) * LANE_GAP + TRACK_PAD * 2;
              const avatarColor = colorForTecnico(r.id);
              const horasFila = r.ords.reduce((s, o) => s + (Number(o.duracionEstimada) || 0), 0);
              return (
                <div key={r.id ?? 'sin'} className={`flex ${ri % 2 ? 'bg-stone-50/40' : ''}`}>
                  {/* Columna del técnico (fija al hacer scroll horizontal) */}
                  <div className="w-48 flex-shrink-0 sticky left-0 z-10 bg-white border-r border-t border-stone-100 px-3 py-2 flex items-center gap-2" style={{ minHeight: rowH }}>
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {r.id == null ? '?' : initialOf(r.nombre)}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${r.id == null ? 'text-stone-400 italic' : 'text-stone-800'}`}>{r.nombre}</div>
                      <div className="text-[11px] text-stone-500">
                        {r.ords.length ? `${r.ords.length} ${r.ords.length === 1 ? 'orden' : 'órdenes'} · ${horasFila % 1 === 0 ? horasFila : horasFila.toFixed(1)}h` : 'Libre'}
                      </div>
                    </div>
                  </div>

                  {/* Pista con los bloques */}
                  <div
                    className="relative flex-1 border-t border-stone-100 cursor-copy"
                    style={{
                      minHeight: rowH,
                      backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent calc(100%/${SPAN} - 1px), rgba(120,113,108,0.10) calc(100%/${SPAN} - 1px), rgba(120,113,108,0.10) calc(100%/${SPAN}))`,
                    }}
                    onClick={(e) => {
                      const h = hourFromClickX(e);
                      const defaults = { horaInicio: `${String(h).padStart(2, '0')}:00` };
                      if (r.id != null) defaults.tecnicoIds = [r.id];
                      onOpenForm(refDate, defaults);
                    }}
                    title="Clic para crear una orden en este horario"
                  >
                    {r.ords.map((o) => {
                      const vStart = clamp(o._start, START_HOUR, END_HOUR);
                      const vEnd = clamp(o._end, START_HOUR, END_HOUR);
                      const outside = vEnd - vStart < 0.1;
                      const left = ((outside ? clamp(o._start, START_HOUR, END_HOUR - 0.5) : vStart) - START_HOUR) / SPAN * 100;
                      const width = (outside ? 0.5 : (vEnd - vStart)) / SPAN * 100;
                      const tipo = tipoMap[o.tipoId];
                      const estado = estadoMap[o.estadoId];
                      const cli = cliMap[o.clienteId];
                      const prio = prioMap[o.prioridadId];
                      const bg = tipo?.color || '#475569';
                      const numLabel = o.numero || `#${o.id}`;
                      const tecNames = tecnicoIdsOf(o).map((id) => tecMap[id]?.nombre).filter(Boolean);
                      return (
                        <button
                          key={o.id}
                          onClick={(e) => { e.stopPropagation(); onSelectOrder(o.id, siblingIds); }}
                          className="absolute rounded-md text-left text-white overflow-hidden hover:ring-2 hover:ring-white/50 transition-shadow shadow-sm"
                          style={{
                            left: `${left}%`,
                            width: `max(56px, ${width}%)`,
                            top: TRACK_PAD + o._lane * (LANE_H + LANE_GAP),
                            height: LANE_H,
                            backgroundColor: bg,
                            borderLeft: `3px solid ${estado?.color || 'rgba(255,255,255,0.5)'}`,
                          }}
                          title={`${numLabel} · ${hhmm(o._start)}–${hhmm(o._end)} · ${cli?.nombre || 'sin cliente'} · ${o.equipo}${tecNames.length ? ' · ' + tecNames.join(', ') : ''}${estado ? ' · ' + estado.nombre : ''}${prio ? ' · ' + prio.nombre : ''}`}
                        >
                          <div className="px-1.5 py-1 leading-tight h-full flex flex-col justify-center">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[11px] font-bold truncate">{numLabel}</span>
                              <span className="text-[10px] opacity-90 tabular-nums flex-shrink-0">{hhmm(o._start).slice(0, 5)}</span>
                            </div>
                            <div className="text-[11px] opacity-95 truncate">{cli?.nombre || o.equipo || '—'}</div>
                            {estado && <div className="text-[10px] opacity-90 truncate">{estado.nombre}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumen del día + leyenda de estados */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="text-stone-700 font-medium">
          {dayOrders.length} {dayOrders.length === 1 ? 'orden' : 'órdenes'} · {totalHoras % 1 === 0 ? totalHoras : totalHoras.toFixed(1)}h
        </span>
        {tecnicoFilter === 'todos' && tecnicosActivos > 0 && (
          <span>{tecnicosConTrabajo}/{tecnicosActivos} técnicos con trabajo</span>
        )}
        {Object.values(estadoMap).filter((s) => s?.activo).length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-stone-400">Estados:</span>
            {Object.values(estadoMap).filter((s) => s?.activo).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map((s) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-3 rounded-sm" style={{ backgroundColor: s.color }} />{s.nombre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
