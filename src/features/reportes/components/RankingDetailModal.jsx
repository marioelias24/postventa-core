import { useEffect, useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { inputCls } from '@/styles/tokens';

// Modal genérico de ranking. Recibe `rows = [{ name, value, color? }]` ya
// ordenadas y muestra # (rank original), nombre, valor y % del total con
// una barra. Tiene buscador para listas largas (p.ej. 50+ clientes).
export function RankingDetailModal({ title, subtitle, valueLabel = 'Valor', valueFormat, rows = [], onClose }) {
  const [q, setQ] = useState('');
  const fmtVal = valueFormat || ((v) => String(v));
  const total = useMemo(() => rows.reduce((s, r) => s + (r.value || 0), 0), [rows]);
  const term = q.trim().toLowerCase();
  const filtered = term ? rows.filter(r => (r.name || '').toLowerCase().includes(term)) : rows;
  const subTotal = useMemo(() => filtered.reduce((s, r) => s + (r.value || 0), 0), [filtered]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-stone-800 truncate font-serif">{title}</h3>
            {subtitle && <p className="text-xs text-stone-500 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-stone-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Buscar entre ${rows.length} ${rows.length === 1 ? 'fila' : 'filas'}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={inputCls + ' pl-9'}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-500 sticky top-0 bg-white border-b border-stone-200 z-10">
              <tr>
                <th className="text-right py-2.5 pl-4 pr-2 w-12">#</th>
                <th className="text-left py-2.5 px-2">Nombre</th>
                <th className="text-right py-2.5 px-2 whitespace-nowrap">{valueLabel}</th>
                <th className="text-right py-2.5 pl-2 pr-4 w-44">% del total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-stone-400 italic">Sin resultados</td></tr>
              ) : filtered.map((r) => {
                // Rank conservando el orden original (no cambia al filtrar).
                const originalRank = rows.indexOf(r) + 1;
                const pct = total > 0 ? Math.round(((r.value || 0) / total) * 100) : 0;
                return (
                  <tr key={originalRank + '-' + r.name} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="py-2 pl-4 pr-2 text-right text-stone-500 tabular-nums">{originalRank}</td>
                    <td className="py-2 px-2 text-stone-800">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        {r.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />}
                        <span className="truncate">{r.name}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-stone-900 tabular-nums font-medium whitespace-nowrap">{fmtVal(r.value)}</td>
                    <td className="py-2 pl-2 pr-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <div className="w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-stone-700 tabular-nums w-9 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-stone-200 bg-white sticky bottom-0">
              <tr>
                <td className="py-2.5 pl-4 pr-2"></td>
                <td className="py-2.5 px-2 text-stone-500 text-xs uppercase">
                  {term ? `Filtradas: ${filtered.length}` : `Total: ${filtered.length} ${filtered.length === 1 ? 'fila' : 'filas'}`}
                </td>
                <td className="py-2.5 px-2 text-right text-stone-900 tabular-nums font-semibold whitespace-nowrap">{fmtVal(subTotal)}</td>
                <td className="py-2.5 pl-2 pr-4 text-right text-stone-500 text-xs">
                  {term && total > 0 ? `${Math.round((subTotal / total) * 100)}%` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
