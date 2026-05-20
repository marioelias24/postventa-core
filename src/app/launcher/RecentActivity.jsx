import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { relativeTime, orderActivityDate } from './helpers';
import { getOrderStatusMeta } from '@/shared/lib/orderStatus';

// Las 6 últimas órdenes con actividad (updatedAt > fechaCompletada > fechaProgramada).
export function RecentActivity({ data }) {
  const navigate = useNavigate();

  const items = useMemo(() => {
    const cliMap = Object.fromEntries((data.clientes || []).map((c) => [c.id, c]));

    return [...(data.ordenes || [])]
      .map((o) => ({ o, when: orderActivityDate(o) }))
      .filter((x) => !!x.when)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 6)
      .map(({ o, when }) => {
        const status = getOrderStatusMeta(o, data.estados || []);
        return {
          id: o.id,
          numero: o.numero || `#${o.id}`,
          cliente: cliMap[o.clienteId]?.nombre || 'Cliente —',
          estado: status.label,
          estadoColor: status.color,
          when,
        };
      });
  }, [data.ordenes, data.clientes, data.estados]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xs uppercase tracking-wider font-medium text-stone-500"
          style={{ letterSpacing: '0.12em' }}
        >
          Actividad reciente
        </h2>
        <button
          type="button"
          onClick={() => navigate('/mantenimiento/ordenes')}
          className="text-xs font-medium hover:underline"
          style={{ color: '#1F3A6B' }}
        >
          Ver todas →
        </button>
      </div>
      <div className="rounded-xl border bg-white divide-y" style={{ borderColor: '#EAEAE4' }}>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-stone-400 italic">Sin actividad reciente</div>
        ) : (
          items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => navigate(`/mantenimiento/ordenes/${it.id}`)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-stone-50 text-left transition-colors"
              style={{ borderColor: '#F0EFE9' }}
            >
              <div
                className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: '#B8741F15', borderRadius: '22%' }}
              >
                <ClipboardList className="w-4 h-4" style={{ color: '#B8741F' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight text-stone-800 truncate">
                  Orden <span className="font-mono">{it.numero}</span> — {it.cliente}
                </div>
                <div className="text-[12px] mt-0.5 text-stone-500">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ background: it.estadoColor }}
                  />
                  {it.estado}
                </div>
              </div>
              <span className="text-[11px] flex-shrink-0 mt-1 text-stone-400 whitespace-nowrap">
                {relativeTime(it.when)}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
