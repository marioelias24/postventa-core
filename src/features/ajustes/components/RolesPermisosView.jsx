import { ShieldCheck, Check, Minus } from 'lucide-react';
import {
  ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, hasPermission,
} from '@/app/permissions';

// Catálogo legible de las acciones del sistema. El orden es el que se muestra
// en la tabla. Las claves DEBEN coincidir con las usadas en useCan/Can.
const ACCIONES = [
  {
    grupo: 'Órdenes de servicio',
    items: [
      { id: 'orden:create', label: 'Crear órdenes' },
      { id: 'orden:edit',   label: 'Editar órdenes' },
      { id: 'orden:delete', label: 'Eliminar órdenes' },
    ],
  },
  {
    grupo: 'Clientes',
    items: [
      { id: 'cliente:create', label: 'Crear clientes' },
      { id: 'cliente:edit',   label: 'Editar clientes' },
      { id: 'cliente:delete', label: 'Eliminar clientes' },
      { id: 'cliente:bulk',   label: 'Importar clientes (Excel/CSV)' },
    ],
  },
  {
    grupo: 'Catálogos (técnicos, tipos, prioridades)',
    items: [
      { id: 'catalogo:edit', label: 'Crear / editar / eliminar' },
    ],
  },
  {
    grupo: 'Reportes',
    items: [
      { id: 'reporte:view', label: 'Ver y exportar reportes' },
    ],
  },
  {
    grupo: 'Administración',
    items: [
      { id: 'empresa:edit',  label: 'Editar datos y logo de empresa' },
      { id: 'users:manage',  label: 'Gestionar usuarios y roles' },
    ],
  },
];

const ROLE_BG = {
  admin:      '#2D6B45',
  supervisor: '#1F5F75',
  tecnico:    '#B8741F',
  lectura:    '#5A3370',
};

export function RolesPermisosView() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 font-serif">Roles y permisos</h1>
        <p className="text-sm text-stone-500">
          Qué puede hacer cada rol. Asigna el rol de cada persona desde{' '}
          <strong>Ajustes &gt; Usuarios</strong>.
        </p>
      </div>

      {/* Tarjetas resumen por rol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map((r) => (
          <div key={r} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                style={{ background: ROLE_BG[r] }}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-stone-800">{ROLE_LABELS[r]}</div>
            </div>
            <p className="text-xs text-stone-500 leading-snug">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>

      {/* Matriz de permisos */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Acción</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2 text-center min-w-[100px]">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACCIONES.map((g) => (
                <FragmentoGrupo key={g.grupo} grupo={g} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
        <strong className="text-stone-700">Nota:</strong> los roles son fijos por ahora. En el
        futuro se podrán crear grupos personalizados con permisos a la medida (RBAC custom).
      </div>
    </div>
  );
}

function FragmentoGrupo({ grupo }) {
  return (
    <>
      <tr className="bg-stone-50/60">
        <td colSpan={1 + ROLES.length} className="px-4 py-1.5 text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
          {grupo.grupo}
        </td>
      </tr>
      {grupo.items.map((it) => (
        <tr key={it.id} className="border-t border-stone-100 hover:bg-stone-50">
          <td className="px-4 py-2 text-stone-700">{it.label}</td>
          {ROLES.map((r) => {
            const ok = hasPermission(r, it.id);
            return (
              <td key={r} className="px-2 py-2 text-center">
                {ok ? (
                  <Check className="w-4 h-4 text-emerald-600 inline" />
                ) : (
                  <Minus className="w-4 h-4 text-stone-300 inline" />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
