// Matriz de permisos en el frontend. Es un ESPEJO de api/src/permissions.js;
// si cambia un permiso allá, hay que actualizarlo acá también. La seguridad
// real la hace el backend (los chequeos de este archivo solo deciden qué
// ocultar en la UI — un usuario que evada esto recibirá 403 igual).

import { useAuth } from './AuthContext';

export const ROLES = ['admin', 'supervisor', 'tecnico', 'lectura'];

export const ROLE_LABELS = {
  admin:      'Administrador',
  supervisor: 'Supervisor',
  tecnico:    'Técnico',
  lectura:    'Lectura',
};

export const ROLE_DESCRIPTIONS = {
  admin:      'Acceso total, incluyendo gestión de usuarios y empresa.',
  supervisor: 'Gestión operativa completa, no puede crear/eliminar usuarios.',
  tecnico:    'Ve, crea y edita órdenes y clientes. No elimina ni accede a Ajustes.',
  lectura:    'Solo puede ver la información. No edita ni elimina.',
};

const PERMS_BY_ROLE = {
  admin: new Set([
    'users:manage', 'empresa:edit', 'catalogo:edit', 'sequences:manage',
    'orden:create', 'orden:edit', 'orden:delete',
    'cliente:create', 'cliente:edit', 'cliente:delete', 'cliente:bulk',
    'reporte:view',
  ]),
  supervisor: new Set([
    'empresa:edit', 'catalogo:edit',
    'orden:create', 'orden:edit', 'orden:delete',
    'cliente:create', 'cliente:edit', 'cliente:delete', 'cliente:bulk',
    'reporte:view',
  ]),
  tecnico: new Set([
    'orden:create', 'orden:edit',
    'cliente:create', 'cliente:edit',
    'reporte:view',
  ]),
  lectura: new Set([
    'reporte:view',
  ]),
};

export function hasPermission(role, action) {
  const set = PERMS_BY_ROLE[role];
  return !!(set && set.has(action));
}

// Hook: devuelve true si el usuario actual puede ejecutar `action`.
// Si no hay usuario logueado, devuelve false.
export function useCan(action) {
  const { user } = useAuth();
  return hasPermission(user?.role, action);
}

// Hook: devuelve el rol del usuario actual (o null).
export function useRole() {
  const { user } = useAuth();
  return user?.role || null;
}

// Componente helper: renderiza children solo si el usuario tiene el permiso.
// Uso: <Can action="orden:delete"><button>Eliminar</button></Can>
//
// Opcional: `fallback` para mostrar algo alternativo cuando no tiene permiso.
export function Can({ action, fallback = null, children }) {
  const ok = useCan(action);
  return ok ? children : fallback;
}
