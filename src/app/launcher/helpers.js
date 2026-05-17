import { BRAND } from '@/config/branding';

// Devuelve "hace X" en español para una fecha (Date | ISO string | undefined).
export function relativeTime(input) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'ahora';
  const min = Math.round(sec / 60);
  if (min < 60) return `Hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Hace ${hr} ${hr === 1 ? 'hora' : 'horas'}`;
  const day = Math.round(hr / 24);
  if (day < 7) return `Hace ${day} ${day === 1 ? 'día' : 'días'}`;
  return d.toLocaleDateString(BRAND.locale, { day: 'numeric', month: 'short' });
}

// Mejor fecha disponible para "última actividad" de una orden.
export function orderActivityDate(o) {
  return o?.updatedAt || o?.fechaCompletada || o?.fechaProgramada || null;
}
