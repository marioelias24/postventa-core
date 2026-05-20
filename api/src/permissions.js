// Matriz de permisos por rol. Fuente de verdad del backend; el frontend tiene
// una copia espejo en src/app/permissions.js que solo decide qué mostrar (la
// seguridad real la hace el backend con requirePermission).
//
// Acciones (granularidad por dominio/verbo):
//
//   users:manage      → crear/eliminar/resetear/cambiar rol de usuarios
//   empresa:edit      → editar datos y logo de la empresa
//   catalogo:edit     → crear/editar/eliminar técnicos/tipos/prioridades
//   orden:create      → crear órdenes
//   orden:edit        → editar órdenes existentes
//   orden:delete      → eliminar órdenes
//   cliente:create    → crear clientes
//   cliente:edit      → editar clientes
//   cliente:delete    → eliminar clientes
//   cliente:bulk      → importar clientes masivamente
//   reporte:view      → ver reportes
//   sequences:manage  → ver/editar configuración de secuencias (Ajustes > Secuencias)
//
// "Cambiar mi propia contraseña" no es un permiso — cualquier usuario
// autenticado puede hacerlo siempre.

export const ROLES = ['admin', 'supervisor', 'tecnico', 'lectura'];

const PERMS_BY_ROLE = {
  admin: new Set([
    'users:manage', 'empresa:edit', 'catalogo:edit', 'sequences:manage',
    'orden:create', 'orden:edit', 'orden:delete',
    'cliente:create', 'cliente:edit', 'cliente:delete', 'cliente:bulk',
    'reporte:view',
    'ot:create', 'ot:edit', 'ot:delete',
    'plantilla:manage',
  ]),
  supervisor: new Set([
    // Igual que admin pero SIN gestión de usuarios.
    'empresa:edit', 'catalogo:edit',
    'orden:create', 'orden:edit', 'orden:delete',
    'cliente:create', 'cliente:edit', 'cliente:delete', 'cliente:bulk',
    'reporte:view',
    'ot:create', 'ot:edit', 'ot:delete',
    'plantilla:manage',
  ]),
  tecnico: new Set([
    // Crea y edita pero NO elimina nada. NO entra a Ajustes.
    'orden:create', 'orden:edit',
    'cliente:create', 'cliente:edit',
    'reporte:view',
    'ot:create', 'ot:edit',
  ]),
  lectura: new Set([
    // Solo lectura. Ve calendario/órdenes/clientes/reportes.
    'reporte:view',
  ]),
};

export function hasPermission(role, action) {
  const set = PERMS_BY_ROLE[role];
  return !!(set && set.has(action));
}

export function isValidRole(role) {
  return ROLES.includes(role);
}
