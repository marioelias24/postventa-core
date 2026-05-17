// Soporte para "crear al vuelo" un registro de catálogo desde un formulario
// (p. ej. crear un Tipo o un Cliente nuevo sin salir de la orden).

// Valores por defecto razonables según el catálogo. Solo el nombre lo escribe
// el usuario; el resto se puede afinar luego en Catálogos.
export function newCatalogItem(collection, nombre) {
  switch (collection) {
    case 'clientes':    return { nombre, contratoActivo: true };
    case 'tecnicos':    return { nombre, activo: true };
    case 'tipos':       return { nombre, color: '#14b8a6', activo: true };
    case 'estados':     return { nombre, color: '#64748b', orden: 1, esFinal: false, activo: true };
    case 'prioridades': return { nombre, color: '#64748b', nivel: 1 };
    default:            return { nombre };
  }
}

// Devuelve un onCreate(nombre) listo para pasar a <EntityPicker onCreate=...>.
// upsert es la función del store; resuelve con el item creado (incluye id).
export const makeQuickCreate = (upsert, collection) => (nombre) =>
  upsert(collection, newCatalogItem(collection, nombre));
