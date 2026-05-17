import { Wrench, Contact2, BarChart3, Settings as SettingsIcon } from 'lucide-react';

// Catálogo de módulos para la grilla bento del launcher. Cada entrada apunta
// a la ruta raíz del módulo (el ModuleLayout redirige a la sub-vista por defecto).
export const MODULES = [
  {
    id: 'mantenimiento',
    name: 'Mantenimiento',
    desc: 'Calendario, órdenes y clientes',
    to: '/mantenimiento',
    icon: Wrench,
    color: '#1F5F75',
    featured: 'hero',
  },
  {
    id: 'contactos',
    name: 'Contactos',
    desc: 'Directorio de clientes',
    to: '/contactos',
    icon: Contact2,
    color: '#2D6B45',
    featured: 'tall',
  },
  {
    id: 'reportes',
    name: 'Reportes',
    desc: 'Horas, clientes y técnicos',
    to: '/reportes',
    icon: BarChart3,
    color: '#5A7B2E',
    featured: 'compact',
  },
  {
    id: 'ajustes',
    name: 'Ajustes',
    desc: 'Usuarios, empresa y permisos',
    to: '/ajustes',
    icon: SettingsIcon,
    color: '#5A3370',
    featured: 'compact',
  },
];

export const moduleById = (id) => MODULES.find((m) => m.id === id);
