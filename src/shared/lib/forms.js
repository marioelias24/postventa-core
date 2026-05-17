// Convierte el value de un <select> o <input> a Number, o null si está vacío.
// Útil porque los IDs son números (Int) pero el DOM siempre devuelve strings.
export const numOrNull = (v) => (v === '' || v == null ? null : Number(v));
