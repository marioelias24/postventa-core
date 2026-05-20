import { Check } from 'lucide-react';

// Indicador horizontal de etapas. Visual puro: muestra `steps` en orden,
// destaca la activa (= currentKey), marca con check las anteriores, deja
// en gris las posteriores. Si onClick está, cada paso es clickeable y se
// invoca con la key; sin onClick es solo informativo para workflows
// controlados con botones de acción aparte.
//
// Props:
//   steps:      [{ key, label, color? }]
//   currentKey: string — debe matchear uno de los keys
//   onClick:    (key) => void   (opcional; sin handler = no clickeable)
//   compact:    boolean — versión chica (menos padding, ideal para detail header)
export function Stepper({ steps = [], currentKey, onClick, compact = false }) {
  if (!steps.length) return null;
  const currentIdx = Math.max(0, steps.findIndex((s) => s.key === currentKey));
  const clickable = typeof onClick === 'function';

  return (
    <ol
      className={`flex flex-wrap items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}
      aria-label="Etapas"
    >
      {steps.map((s, i) => {
        const isPast    = i < currentIdx;
        const isCurrent = i === currentIdx;
        const color     = s.color || '#1F5F75';
        const baseStyle = isCurrent
          ? { background: color, color: '#fff', borderColor: color, boxShadow: `0 0 0 3px ${color}22` }
          : isPast
            ? { background: color + '15', color: color, borderColor: color + '55' }
            : { background: '#fff', color: '#A8A29E', borderColor: '#E7E5E4' };

        const pill = (
          <span
            className={`inline-flex items-center gap-1.5 border rounded-full ${compact ? 'px-2.5 py-0.5' : 'px-3 py-1'} font-medium whitespace-nowrap transition-colors`}
            style={baseStyle}
          >
            {isPast && <Check className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
            {s.label}
            {isCurrent && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-white">
                Actual
              </span>
            )}
          </span>
        );

        return (
          <li key={s.key} className="flex items-center gap-1">
            {clickable && !isCurrent ? (
              <button
                type="button"
                onClick={() => onClick(s.key)}
                className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded-full"
                title={`Cambiar a ${s.label}`}
              >
                {pill}
              </button>
            ) : (
              pill
            )}
            {i < steps.length - 1 && (
              <span className="text-stone-300 select-none" aria-hidden="true">›</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
