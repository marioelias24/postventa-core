// Tema claro unificado (beige #F7F7F4 + white cards). Las clases conservan
// los mismos nombres (inputCls, tooltipStyle, etc.) para no romper imports.

export const inputCls =
  "w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-stone-400";

export const cardCls =
  "bg-white border border-stone-200 rounded-xl";

export const btnPrimaryCls =
  "px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors";

export const btnSecondaryCls =
  "px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-sm flex items-center gap-2 transition-colors";

export const btnDangerCls =
  "px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2 transition-colors";

// Estilo de Tooltip de Recharts en tema claro.
export const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #EAEAE4',
  borderRadius: 8,
  color: '#1A1A1A',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
};

// Paleta de superficies y bordes — para usos sueltos.
export const surface = {
  app: '#F7F7F4',
  card: '#FFFFFF',
  cardHover: '#FAFAF7',
  border: '#EAEAE4',
  borderSoft: '#F0EFE9',
  text: '#1A1A1A',
  textMuted: '#666666',
  textFaint: '#999999',
};
