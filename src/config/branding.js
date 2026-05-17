// Configuración de marca/branding por deployment. Todos los valores son
// "defaults de build" (read-time del env de Vite); la fila Empresa en la DB
// puede sobrescribir nombre/logo en runtime.
//
// Para customizar un deployment, definir estas variables en el `.env` antes
// del build (o vía docker-compose `environment:`):
//
//   VITE_BRAND_DEFAULT_NAME       — nombre mostrado en topbar/login/footer
//                                   cuando aún no hay Empresa configurada.
//   VITE_LOCALE                   — locale para formato de fechas (es-PA,
//                                   es-ES, es-MX, en-US, etc).
//   VITE_GEOCODE_COUNTRY_SUFFIX   — texto que se concatena al geocodificar
//                                   direcciones (ej. ", Panamá" sesga la
//                                   búsqueda a ese país). Vacío = sin sesgo.
//   VITE_MAP_DEFAULT_CENTER       — "lat,lng" del centro inicial del mapa
//                                   cuando un cliente no tiene coordenadas.
//
// Si una variable no está definida, el core usa defaults genéricos para que
// funcione standalone (sin customer-layer encima).

function parseLatLng(s, fallback) {
  if (!s) return fallback;
  const [lat, lng] = String(s).split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : fallback;
}

export const BRAND = {
  defaultName: import.meta.env.VITE_BRAND_DEFAULT_NAME || 'Post Venta',
  locale: import.meta.env.VITE_LOCALE || 'es',
  geocodeCountrySuffix: import.meta.env.VITE_GEOCODE_COUNTRY_SUFFIX || '',
  mapDefaultCenter: parseLatLng(
    import.meta.env.VITE_MAP_DEFAULT_CENTER,
    [0, 0],
  ),
};
