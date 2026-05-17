import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

// Tarjeta compacta del bento (1x1). Recibe el módulo + KPI ya calculado por el caller.
export function CompactWidget({ module: m, kpi, sublabel, trend, warning = false }) {
  const navigate = useNavigate();
  const Icon = m.icon;
  const accent = warning ? '#C45B2C' : m.color;

  return (
    <button
      type="button"
      onClick={() => navigate(m.to)}
      className="p-4 rounded-2xl border bg-white text-left flex flex-col justify-between gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md group min-h-[130px]"
      style={{ borderColor: warning ? '#F5D9C7' : '#EAEAE4' }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 flex items-center justify-center"
          style={{ background: m.color, borderRadius: '22%' }}
        >
          <Icon className="w-[18px] h-[18px] text-white" />
        </div>
        {warning && <AlertCircle className="w-4 h-4" style={{ color: accent }} />}
      </div>
      <div>
        <div className="text-xs text-stone-500">{m.name}</div>
        <div
          className="tabular mt-0.5 font-serif"
          style={{
            fontWeight: 400,
            fontSize: '26px',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: accent,
          }}
        >
          {kpi}
        </div>
        {sublabel && (
          <div className="text-[11px] mt-1.5 leading-tight text-stone-500">{sublabel}</div>
        )}
        {trend && (
          <div
            className="text-[11px] mt-1 font-medium"
            style={{ color: warning ? accent : '#2D6B45' }}
          >
            {trend}
          </div>
        )}
      </div>
    </button>
  );
}
