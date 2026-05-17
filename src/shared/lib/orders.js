// Técnicos asignados a una orden, como array de ids.
// Fuente de verdad: `tecnicoIds`. Si por algún motivo no viniera (datos viejos
// leídos antes del backfill), cae al `tecnicoId` "principal".
export const tecnicoIdsOf = (orden) =>
  Array.isArray(orden?.tecnicoIds)
    ? orden.tecnicoIds
    : (orden?.tecnicoId != null ? [orden.tecnicoId] : []);
