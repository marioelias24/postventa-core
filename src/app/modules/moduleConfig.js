import {
  Wrench, Calendar, ClipboardList, Users, Sliders,
  Contact2, BarChart3, Settings as SettingsIcon, Building2, ShieldCheck, UserCog, Hash,
} from 'lucide-react';

// Definición de los 4 módulos y sus sub-vistas (sidebar).
// El primer item de `subviews` es la vista por defecto (a la que redirige el index).
export const MODULES = [
  {
    id: 'mantenimiento',
    name: 'Mantenimiento',
    desc: 'Operación diaria',
    color: '#1F5F75',
    icon: Wrench,
    base: '/mantenimiento',
    subviews: [
      { id: 'planeacion',    label: 'Planeación',    path: 'planeacion',    icon: Calendar },
      { id: 'ordenes',       label: 'Órdenes',       path: 'ordenes',       icon: ClipboardList },
      { id: 'clientes',      label: 'Clientes',      path: 'clientes',      icon: Users },
      { id: 'configuracion', label: 'Configuración', path: 'configuracion', icon: Sliders },
    ],
  },
  {
    id: 'contactos',
    name: 'Contactos',
    desc: 'Directorio de clientes',
    color: '#2D6B45',
    icon: Contact2,
    base: '/contactos',
    subviews: [
      { id: 'clientes', label: 'Clientes', path: 'clientes', icon: Users },
    ],
  },
  {
    id: 'reportes',
    name: 'Reportes',
    desc: 'KPIs y análisis',
    color: '#5A7B2E',
    icon: BarChart3,
    base: '/reportes',
    subviews: [
      { id: 'reportes', label: 'Reportes', path: '', icon: BarChart3 },
    ],
  },
  {
    id: 'ajustes',
    name: 'Ajustes',
    desc: 'Configuración global',
    color: '#5A3370',
    icon: SettingsIcon,
    base: '/ajustes',
    // Visible si el usuario tiene CUALQUIERA de estos permisos. El módulo
    // entero se oculta en sidebar/launcher si no tiene ninguno.
    visiblePermissions: ['users:manage', 'empresa:edit', 'sequences:manage'],
    subviews: [
      { id: 'usuarios',   label: 'Usuarios',          path: 'usuarios',   icon: UserCog,     permission: 'users:manage' },
      { id: 'empresa',    label: 'Empresa',           path: 'empresa',    icon: Building2,   permission: 'empresa:edit' },
      { id: 'secuencias', label: 'Secuencias',        path: 'secuencias', icon: Hash,        permission: 'sequences:manage' },
      { id: 'grupos',     label: 'Roles y permisos',  path: 'grupos',     icon: ShieldCheck, permission: 'users:manage' },
    ],
  },
];

export const moduleById = (id) => MODULES.find((m) => m.id === id);

// Devuelve el módulo al que pertenece una ruta dada (para resaltar nav, etc).
export function moduleFromPath(pathname) {
  return MODULES.find((m) => pathname === m.base || pathname.startsWith(m.base + '/'));
}

// Filtra módulos visibles según los permisos del rol (pasar la función
// hasPermission del frontend). Si `visiblePermissions` no está definida, el
// módulo siempre se ve.
export function visibleModules(hasPermFn) {
  return MODULES.filter((m) => {
    if (!m.visiblePermissions || m.visiblePermissions.length === 0) return true;
    return m.visiblePermissions.some((p) => hasPermFn(p));
  });
}

// Filtra sub-vistas de un módulo según permisos. Si la sub-vista no tiene
// `permission`, siempre se ve.
export function visibleSubviews(m, hasPermFn) {
  if (!m) return [];
  return m.subviews.filter((s) => !s.permission || hasPermFn(s.permission));
}
