import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { moduleById } from './modules';

// Tarjeta "tall" del bento: KPI de clientes + sparkline de altas en los
// últimos 12 meses + top 3 clientes con más órdenes en el período.
export function TallContactos({ data }) {
  const navigate = useNavigate();
  const m = moduleById('contactos');
  const Icon = m.icon;

  const { total, activos, sparkPoints, topClientes } = useMemo(() => {
    const clientes = data.clientes || [];
    const total = clientes.length;
    const activos = clientes.filter((c) => c?.contratoActivo !== false).length;

    // Sparkline: cantidad de clientes creados por mes (últimos 12 meses).
    // No tenemos createdAt en cliente, así que usamos un proxy: cuántas órdenes
    // por mes (un proxy de "actividad" del negocio).
    const today = new Date();
    today.setDate(1);
    today.setHours(0, 0, 0, 0);
    const months = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setMonth(today.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const cuenta = Object.fromEntries(months.map((k) => [k, 0]));
    (data.ordenes || []).forEach((o) => {
      const k = (o?.fechaProgramada || '').slice(0, 7);
      if (cuenta[k] != null) cuenta[k] += 1;
    });
    const sparkPoints = months.map((k) => cuenta[k]);

    // Top 3 clientes por nº de órdenes (histórico).
    const counts = new Map();
    (data.ordenes || []).forEach((o) => {
      if (o?.clienteId != null) counts.set(o.clienteId, (counts.get(o.clienteId) || 0) + 1);
    });
    const cliMap = Object.fromEntries(clientes.map((c) => [c.id, c]));
    const topClientes = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, n]) => ({ id, nombre: cliMap[id]?.nombre || `#${id}`, n }));

    return { total, activos, sparkPoints, topClientes };
  }, [data.clientes, data.ordenes]);

  const max = Math.max(...sparkPoints, 1);
  const min = Math.min(...sparkPoints);
  const path = sparkPoints
    .map((p, i) => {
      const x = (i / (sparkPoints.length - 1)) * 100;
      const y = max === min ? 50 : 100 - ((p - min) / (max - min)) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <button
      type="button"
      onClick={() => navigate(m.to)}
      className="m-tall p-5 rounded-2xl border bg-white text-left flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md group min-h-[280px] md:min-h-0"
      style={{ borderColor: '#EAEAE4' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 flex items-center justify-center flex-shrink-0"
            style={{ background: m.color, borderRadius: '22%' }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight text-stone-800">{m.name}</div>
            <div className="text-xs mt-0.5 text-stone-500 truncate">Cartera de clientes</div>
          </div>
        </div>
        <ArrowUpRight
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: m.color }}
        />
      </div>

      <div>
        <div className="tabular flex items-baseline gap-2">
          <span
            className="font-serif"
            style={{
              fontWeight: 400,
              fontSize: '44px',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: m.color,
            }}
          >
            {total}
          </span>
          <span className="text-sm text-stone-500">clientes</span>
        </div>
        <div className="text-xs mt-1 text-stone-500">
          <span className="font-medium tabular" style={{ color: m.color }}>{activos}</span>{' '}
          con contrato activo
        </div>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-10">
        <path
          d={path}
          fill="none"
          stroke={m.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path d={`${path} L 100 100 L 0 100 Z`} fill={m.color} opacity="0.08" />
      </svg>

      <div className="border-t pt-3 mt-auto" style={{ borderColor: '#F0EFE9' }}>
        <div
          className="text-[11px] uppercase tracking-wider mb-2 text-stone-400"
          style={{ letterSpacing: '0.08em' }}
        >
          Top clientes
        </div>
        <div className="space-y-1.5">
          {topClientes.length === 0 ? (
            <div className="text-xs text-stone-400 italic">Sin órdenes registradas</div>
          ) : (
            topClientes.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs gap-2">
                <span className="truncate text-stone-700">{c.nombre}</span>
                <span className="tabular font-medium flex-shrink-0 ml-2" style={{ color: m.color }}>
                  {c.n} {c.n === 1 ? 'OS' : 'OS'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </button>
  );
}
