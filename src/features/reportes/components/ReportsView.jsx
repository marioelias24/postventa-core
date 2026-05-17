import { useCallback, useMemo, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, LabelList,
} from 'recharts';
import {
  ClipboardList, BarChart3, ChevronLeft, ChevronRight,
  Zap, TrendingUp, Clock, Users, Wrench,
  Printer, CalendarRange, List,
} from 'lucide-react';
import { KPI } from '@/shared/ui/KPI';
import { ChartCard } from '@/shared/ui/ChartCard';
import { inputCls, tooltipStyle } from '@/styles/tokens';
import { fmt } from '@/shared/lib/dates';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { useEmpresa } from '@/app/EmpresaContext';
import { BRAND } from '@/config/branding';
import { RankingDetailModal } from './RankingDetailModal';

// Paleta estable por técnico (mismo criterio que DayView).
const TECH_PALETTE = ['#14b8a6', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#10b981', '#06b6d4', '#8b5cf6'];
const colorForTecnico = (id) => TECH_PALETTE[Math.abs(Number(id) || 0) % TECH_PALETTE.length];
const round1 = (n) => Math.round(n * 10) / 10;
const firstName = (s) => (s || '').split(' ')[0] || s || '—';

export function ReportsView({ data }) {
  const { nombre: empresaNombre, logo: empresaLogo } = useEmpresa();
  const [periodKind, setPeriodKind] = useState('mes_actual');
  const [periodOffset, setPeriodOffset] = useState(0);
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [customStart, setCustomStart] = useState(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(fmt(today));

  const range = useMemo(() => {
    if (periodKind === 'custom') {
      if (!customStart || !customEnd) return null;
      return { start: customStart, end: customEnd, label: `${customStart} a ${customEnd}` };
    }
    if (periodKind === 'todo') {
      return { start: null, end: null, label: 'Histórico completo' };
    }
    if (periodKind === 'dia') {
      const d = new Date(today); d.setDate(d.getDate() + periodOffset);
      return { start: fmt(d), end: fmt(d), label: d.toLocaleDateString(BRAND.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) };
    }
    if (periodKind === 'semana') {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay() + periodOffset * 7);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const fmtShort = d => d.toLocaleDateString(BRAND.locale, { day: 'numeric', month: 'short' });
      return { start: fmt(start), end: fmt(end), label: `Semana del ${fmtShort(start)} al ${fmtShort(end)} ${end.getFullYear()}` };
    }
    if (periodKind === 'mes_actual') {
      const m = today.getMonth() + periodOffset;
      const start = new Date(today.getFullYear(), m, 1);
      const end = new Date(today.getFullYear(), m + 1, 0);
      return { start: fmt(start), end: fmt(end), label: start.toLocaleDateString(BRAND.locale, { month: 'long', year: 'numeric' }) };
    }
    if (periodKind === 'ultimos_30') {
      const end = new Date(today); end.setDate(end.getDate() + periodOffset * 30);
      const start = new Date(end); start.setDate(start.getDate() - 29);
      return { start: fmt(start), end: fmt(end), label: `30 días: ${fmt(start)} a ${fmt(end)}` };
    }
    return null;
  }, [periodKind, periodOffset, customStart, customEnd, today]);

  const filtered = useMemo(() => {
    if (!range || range.start === null) return data.ordenes;
    return data.ordenes.filter(o => o.fechaProgramada >= range.start && o.fechaProgramada <= range.end);
  }, [data.ordenes, range]);

  // "Completada" = la orden está en un estado marcado como final (esFinal).
  const finalEstadoIds = useMemo(() => new Set(data.estados.filter(s => s.esFinal).map(s => s.id)), [data.estados]);
  const isCompletada = useCallback((o) => o.estadoId != null && finalEstadoIds.has(o.estadoId), [finalEstadoIds]);
  const emergenciaId = data.tipos.find(t => /emergenc/i.test(t.nombre || ''))?.id;

  // KPIs principales
  const total = filtered.length;
  const completadas = filtered.filter(isCompletada).length;
  const tasaCumplimiento = total ? Math.round((completadas / total) * 100) : 0;
  const horasTotales = round1(filtered.reduce((s, o) => s + (o.duracionEstimada || 0), 0));
  const emergencias = emergenciaId != null ? filtered.filter(o => o.tipoId === emergenciaId).length : 0;

  // Clientes y técnicos "activos" en el período = los que tienen al menos
  // una orden dentro del rango seleccionado.
  const clientesActivosIds = useMemo(() => {
    const ids = new Set();
    filtered.forEach(o => { if (o.clienteId != null) ids.add(o.clienteId); });
    return ids;
  }, [filtered]);
  const tecnicosActivosIds = useMemo(() => {
    const ids = new Set();
    filtered.forEach(o => tecnicoIdsOf(o).forEach(id => ids.add(id)));
    return ids;
  }, [filtered]);

  // Horas por técnico — asignadas + finalizadas. Multi-técnico cuenta las
  // horas completas para cada técnico asignado (carga / disponibilidad).
  const horasPorTecnico = useMemo(() => {
    const map = new Map();
    for (const t of data.tecnicos) {
      if (!tecnicosActivosIds.has(t.id)) continue;
      map.set(t.id, {
        name: firstName(t.nombre),
        fullName: t.nombre,
        asignadas: 0,
        finalizadas: 0,
        color: colorForTecnico(t.id),
      });
    }
    const sinAsig = { name: 'Sin asignar', fullName: 'Sin asignar', asignadas: 0, finalizadas: 0, color: '#475569' };
    filtered.forEach(o => {
      const ids = tecnicoIdsOf(o);
      const h = o.duracionEstimada || 0;
      const fin = isCompletada(o);
      if (ids.length === 0) {
        sinAsig.asignadas += h;
        if (fin) sinAsig.finalizadas += h;
      } else {
        ids.forEach(id => {
          const row = map.get(id);
          if (!row) return;
          row.asignadas += h;
          if (fin) row.finalizadas += h;
        });
      }
    });
    const rows = [...map.values()].map(r => ({
      ...r,
      asignadas: round1(r.asignadas),
      finalizadas: round1(r.finalizadas),
    }));
    if (sinAsig.asignadas > 0) {
      rows.push({ ...sinAsig, asignadas: round1(sinAsig.asignadas), finalizadas: round1(sinAsig.finalizadas) });
    }
    return rows.sort((a, b) => b.asignadas - a.asignadas);
  }, [filtered, data.tecnicos, tecnicosActivosIds, isCompletada]);

  // Órdenes por cliente — lista completa ordenada desc (fuente única).
  const ordenesPorClienteFull = useMemo(() => {
    const map = new Map();
    filtered.forEach(o => {
      const key = o.clienteId == null ? '__none__' : o.clienteId;
      map.set(key, (map.get(key) || 0) + 1);
    });
    const arr = [];
    for (const [k, v] of map.entries()) {
      const name = k === '__none__'
        ? 'Sin cliente'
        : (data.clientes.find(c => c.id === k)?.nombre || '—');
      arr.push({ name, value: v });
    }
    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [filtered, data.clientes]);
  // Top 10 + "Otros" para el gráfico (la lista completa va al modal de detalle).
  const ordenesPorCliente = useMemo(() => {
    if (ordenesPorClienteFull.length <= 10) return ordenesPorClienteFull;
    const top = ordenesPorClienteFull.slice(0, 9);
    const otros = ordenesPorClienteFull.slice(9).reduce((s, x) => s + x.value, 0);
    if (otros > 0) top.push({ name: 'Otros', value: otros });
    return top;
  }, [ordenesPorClienteFull]);

  // Distribución por estado (donut)
  const porEstado = useMemo(() => ([
    ...data.estados.map(s => ({ name: s.nombre, value: filtered.filter(o => o.estadoId === s.id).length, color: s.color })),
    { name: 'Sin estado', value: filtered.filter(o => o.estadoId == null).length, color: '#475569' },
  ].filter(x => x.value > 0)), [filtered, data.estados]);

  // Tendencia de horas-hombre por día (multi-técnico multiplica).
  const tendenciaHoras = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const ids = tecnicoIdsOf(o);
      const mult = ids.length === 0 ? 1 : ids.length;
      const h = (o.duracionEstimada || 0) * mult;
      map[o.fechaProgramada] = (map[o.fechaProgramada] || 0) + h;
    });
    return Object.entries(map)
      .map(([d, h]) => ({ name: d.slice(5), value: round1(h) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // Tabla resumen por técnico (horas + % cumplimiento por técnico)
  const resumenPorTecnico = useMemo(() => horasPorTecnico.map(r => ({
    ...r,
    cumplimiento: r.asignadas > 0 ? Math.round((r.finalizadas / r.asignadas) * 100) : 0,
  })), [horasPorTecnico]);

  // Detalle expandible (modal). null cuando está cerrado.
  // Posibles valores: 'horasAsignadas' | 'horasFinalizadas' | 'ordenesCliente'.
  const [detailKind, setDetailKind] = useState(null);
  const detalleHorasAsignadas = useMemo(() => horasPorTecnico
    .filter(r => r.asignadas > 0)
    .map(r => ({ name: r.fullName, value: r.asignadas, color: r.color })),
  [horasPorTecnico]);
  const detalleHorasFinalizadas = useMemo(() => horasPorTecnico
    .filter(r => r.finalizadas > 0)
    .map(r => ({ name: r.fullName, value: r.finalizadas, color: r.color }))
    .sort((a, b) => b.value - a.value),
  [horasPorTecnico]);

  const presets = [
    { k: 'dia',         label: 'Día' },
    { k: 'semana',      label: 'Semana' },
    { k: 'mes_actual',  label: 'Mes' },
    { k: 'ultimos_30',  label: '30 días' },
    { k: 'custom',      label: 'Rango' },
    { k: 'todo',        label: 'Todo' }
  ];
  const navegable = ['dia', 'semana', 'mes_actual', 'ultimos_30'].includes(periodKind);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4 print-report">
      <style>{`
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body { background: white !important; }
          header, footer, nav, .no-print { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          .print-report { color: #111 !important; }
          .print-report * { color: #111 !important; }
          .print-report .text-slate-400, .print-report .text-slate-500 { color: #555 !important; }
          .print-report [class*="bg-slate-"], .print-report [class*="bg-red-"], .print-report [class*="bg-emerald-"] { background: white !important; }
          .print-report [class*="border-slate-"], .print-report [class*="border-red-"] { border-color: #d1d5db !important; }
          .print-report .rounded-xl, .print-report .rounded-lg { box-shadow: none !important; }
          .print-only { display: block !important; }
          .recharts-wrapper, .recharts-surface { overflow: visible !important; }
          .grid { gap: 0.5cm !important; }
          .print-report h2, .print-report h3, .print-report h1 { color: #111 !important; }
          .print-page-break { page-break-after: always; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Encabezado solo para impresión */}
      <div className="print-only mb-4 pb-3 border-b-2 border-stone-300">
        <div className="flex items-center gap-3">
          <img src={empresaLogo} alt={empresaNombre} style={{ height: '50px', width: 'auto' }} />
          <div>
            <h1 className="text-xl font-bold m-0">Reporte de Servicios Post Venta</h1>
            <p className="text-sm m-0">{empresaNombre}</p>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span><strong>Período:</strong> {range?.label || '—'}</span>
          <span>Generado: {new Date().toLocaleString(BRAND.locale)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <h2 className="text-xl font-semibold text-stone-900 font-serif">Reportes y KPIs</h2>
        <button onClick={handlePrint} className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-2 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg bg-stone-50 p-0.5 border border-stone-200">
            {presets.map(p => (
              <button key={p.k}
                onClick={() => { setPeriodKind(p.k); setPeriodOffset(0); }}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${periodKind === p.k ? 'bg-teal-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {navegable && (
            <>
              <button onClick={() => setPeriodOffset(o => o - 1)} className="p-2 rounded-lg bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-600" title="Período anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPeriodOffset(o => o + 1)} className="p-2 rounded-lg bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-600" title="Período siguiente">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setPeriodOffset(0)} className="px-3 py-1.5 text-xs rounded-lg bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-600">Actual</button>
            </>
          )}
          {periodKind === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={inputCls + ' w-auto'} />
              <span className="text-stone-400 text-sm">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={inputCls + ' w-auto'} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-700 px-1">
          <CalendarRange className="w-4 h-4 text-teal-600" />
          <span className="capitalize">{range?.label || 'Selecciona un período'}</span>
          <span className="text-xs text-stone-500">· {total} {total === 1 ? 'orden' : 'órdenes'}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI label="Total órdenes" value={total} icon={ClipboardList} color="text-teal-600" />
        <KPI label="Horas consumidas" value={`${horasTotales}h`} icon={Clock} color="text-emerald-600" />
        <KPI label="Clientes activos" value={clientesActivosIds.size} icon={Users} color="text-blue-600" />
        <KPI label="Técnicos activos" value={tecnicosActivosIds.size} icon={Wrench} color="text-purple-600" />
        <KPI label="Cumplimiento" value={`${tasaCumplimiento}%`} icon={TrendingUp} color="text-amber-600" />
      </div>

      {emergencias > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
          <Zap className="w-4 h-4" /> {emergencias} {emergencias === 1 ? 'orden de emergencia' : 'órdenes de emergencia'} en este período
        </div>
      )}

      {total === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-500">
          <BarChart3 className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          Sin datos en este período
        </div>
      ) : (
        <>
          {/* Fila 1: 4 paneles principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ChartCard
              title="Horas consumidas por técnico"
              action={detalleHorasAsignadas.length > 0 && (
                <button
                  onClick={() => setDetailKind('horasAsignadas')}
                  className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 no-print"
                >
                  <List className="w-3.5 h-3.5" /> Ver detalle
                </button>
              )}
            >
              {horasPorTecnico.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-stone-400 text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={horasPorTecnico} margin={{ top: 16, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAEAE4" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}h`} />
                    <Bar dataKey="asignadas" radius={[6, 6, 0, 0]}>
                      {horasPorTecnico.map((r, i) => <Cell key={i} fill={r.color} />)}
                      <LabelList dataKey="asignadas" position="top" fill="#44403c" fontSize={11} formatter={(v) => `${v}h`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Horas finalizadas por técnico"
              action={detalleHorasFinalizadas.length > 0 && (
                <button
                  onClick={() => setDetailKind('horasFinalizadas')}
                  className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 no-print"
                >
                  <List className="w-3.5 h-3.5" /> Ver detalle
                </button>
              )}
            >
              {horasPorTecnico.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-stone-400 text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={horasPorTecnico} margin={{ top: 16, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAEAE4" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}h`} />
                    <Bar dataKey="finalizadas" radius={[6, 6, 0, 0]}>
                      {horasPorTecnico.map((r, i) => <Cell key={i} fill={r.color} />)}
                      <LabelList dataKey="finalizadas" position="top" fill="#44403c" fontSize={11} formatter={(v) => `${v}h`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Órdenes por cliente"
              action={ordenesPorClienteFull.length > 0 && (
                <button
                  onClick={() => setDetailKind('ordenesCliente')}
                  className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 no-print"
                >
                  <List className="w-3.5 h-3.5" /> Ver detalle ({ordenesPorClienteFull.length})
                </button>
              )}
            >
              {ordenesPorCliente.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-stone-400 text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ordenesPorCliente} layout="vertical" margin={{ top: 5, right: 24, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAEAE4" />
                    <XAxis type="number" stroke="#78716c" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#78716c" fontSize={10} width={110}
                      tickFormatter={(v) => (v && v.length > 16 ? v.slice(0, 15) + '…' : v)} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" fill="#44403c" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {porEstado.length > 0 && (
              <ChartCard title="Distribución por estado">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={porEstado} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {porEstado.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Fila 2: tendencia + tabla resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Tendencia de horas por día">
              {tendenciaHoras.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-stone-400 text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={tendenciaHoras} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAEAE4" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}h`} />
                    <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Resumen por técnico">
              {resumenPorTecnico.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-stone-400 text-sm">Sin datos</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-stone-500">
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-2 pr-2">Técnico</th>
                        <th className="text-right py-2 px-2">Asignadas</th>
                        <th className="text-right py-2 px-2">Finalizadas</th>
                        <th className="text-right py-2 pl-2">% Cumpl.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenPorTecnico.map((r) => (
                        <tr key={r.fullName} className="border-b border-stone-100 last:border-0">
                          <td className="py-2 pr-2 text-stone-800">
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                              {r.fullName}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-stone-700 tabular-nums">{r.asignadas}h</td>
                          <td className="py-2 px-2 text-right text-emerald-600 tabular-nums">{r.finalizadas}h</td>
                          <td className="py-2 pl-2 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${r.cumplimiento}%` }} />
                              </div>
                              <span className="text-xs text-stone-700 tabular-nums w-9 text-right">{r.cumplimiento}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {detailKind === 'horasAsignadas' && (
        <RankingDetailModal
          title="Horas consumidas por técnico"
          subtitle={range?.label}
          valueLabel="Horas"
          valueFormat={(v) => `${v}h`}
          rows={detalleHorasAsignadas}
          onClose={() => setDetailKind(null)}
        />
      )}
      {detailKind === 'horasFinalizadas' && (
        <RankingDetailModal
          title="Horas finalizadas por técnico"
          subtitle={range?.label}
          valueLabel="Horas"
          valueFormat={(v) => `${v}h`}
          rows={detalleHorasFinalizadas}
          onClose={() => setDetailKind(null)}
        />
      )}
      {detailKind === 'ordenesCliente' && (
        <RankingDetailModal
          title="Órdenes por cliente"
          subtitle={range?.label}
          valueLabel="Órdenes"
          rows={ordenesPorClienteFull}
          onClose={() => setDetailKind(null)}
        />
      )}

      {/* Tabla detallada solo en impresión */}
      <div className="print-only mt-4">
        <h3 className="text-base font-bold mb-2">Detalle de órdenes</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ textAlign: 'left', padding: '4px' }}>Número</th>
              <th style={{ textAlign: 'left', padding: '4px' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '4px' }}>Hora</th>
              <th style={{ textAlign: 'left', padding: '4px' }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: '4px' }}>Tipo</th>
              <th style={{ textAlign: 'left', padding: '4px' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: '4px' }}>Técnico</th>
            </tr>
          </thead>
          <tbody>
            {[...filtered].sort((a,b) => a.fechaProgramada.localeCompare(b.fechaProgramada) || a.horaInicio.localeCompare(b.horaInicio)).map(o => {
              const c = data.clientes.find(x => x.id === o.clienteId);
              const t = data.tipos.find(x => x.id === o.tipoId);
              const s = data.estados.find(x => x.id === o.estadoId);
              const tecNames = tecnicoIdsOf(o).map(id => data.tecnicos.find(x => x.id === id)?.nombre).filter(Boolean);
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '4px', fontFamily: 'monospace' }}>{o.numero || `#${o.id}`}</td>
                  <td style={{ padding: '4px' }}>{o.fechaProgramada}</td>
                  <td style={{ padding: '4px' }}>{o.horaInicio}</td>
                  <td style={{ padding: '4px' }}>{c?.nombre || '—'}</td>
                  <td style={{ padding: '4px' }}>{t?.nombre || '—'}</td>
                  <td style={{ padding: '4px' }}>{s?.nombre || '—'}</td>
                  <td style={{ padding: '4px' }}>{tecNames.length ? tecNames.join(', ') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
