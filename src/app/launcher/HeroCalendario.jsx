import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { fmt } from '@/shared/lib/dates';
import { moduleById } from './modules';

// Hero del bento: gráfica de barras de los últimos 7 días + KPI de "esta semana".
export function HeroCalendario({ data }) {
  const navigate = useNavigate();
  const m = moduleById('mantenimiento');
  const Icon = m.icon;

  const { bars, totalSemana, hoy, deltaPct } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dias = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dias.push(fmt(d));
    }
    const cuenta = Object.fromEntries(dias.map((k) => [k, 0]));
    (data.ordenes || []).forEach((o) => {
      if (o?.fechaProgramada && cuenta[o.fechaProgramada] != null) {
        cuenta[o.fechaProgramada] += 1;
      }
    });
    const bars = dias.map((k) => cuenta[k]);
    const totalSemana = bars.reduce((a, b) => a + b, 0);
    const hoy = cuenta[fmt(today)] || 0;

    // Comparativo grueso vs semana anterior.
    const inicioSemAnt = new Date(today);
    inicioSemAnt.setDate(today.getDate() - 13);
    const finSemAnt = new Date(today);
    finSemAnt.setDate(today.getDate() - 7);
    const inicioK = fmt(inicioSemAnt);
    const finK = fmt(finSemAnt);
    const previa = (data.ordenes || []).filter((o) => {
      const k = o?.fechaProgramada;
      return k && k >= inicioK && k <= finK;
    }).length;
    const deltaPct = previa > 0
      ? Math.round(((totalSemana - previa) / previa) * 100)
      : null;

    return { bars, totalSemana, hoy, deltaPct };
  }, [data.ordenes]);

  const maxBar = Math.max(1, ...bars);

  return (
    <button
      type="button"
      onClick={() => navigate(m.to)}
      className="m-hero p-5 rounded-2xl border bg-white text-left flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md group min-h-[200px] md:min-h-0"
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
            <div className="text-xs mt-0.5 text-stone-500 truncate">{m.desc}</div>
          </div>
        </div>
        <ArrowUpRight
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: m.color }}
        />
      </div>

      <div className="my-3 md:my-2">
        <div
          className="text-[11px] uppercase tracking-wider mb-1 text-stone-400"
          style={{ letterSpacing: '0.08em' }}
        >
          Órdenes esta semana
        </div>
        <div className="tabular flex items-baseline gap-2">
          <span
            className="font-serif"
            style={{
              fontWeight: 400,
              fontSize: 'clamp(32px, 5vw, 40px)',
              letterSpacing: '-0.025em',
              lineHeight: 1,
              color: m.color,
            }}
          >
            {totalSemana}
          </span>
          {deltaPct != null && (
            <span
              className="text-xs font-medium"
              style={{ color: deltaPct >= 0 ? '#2D6B45' : '#C45B2C' }}
            >
              {deltaPct >= 0 ? '+' : ''}{deltaPct}%
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-end gap-1.5 h-12 mb-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.max(8, (h / maxBar) * 100)}%`,
                background: m.color,
                opacity: 0.25 + (h / maxBar) * 0.6,
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-500">Últimos 7 días</span>
          <span className="font-medium" style={{ color: '#C45B2C' }}>
            {hoy} programadas hoy →
          </span>
        </div>
      </div>
    </button>
  );
}
