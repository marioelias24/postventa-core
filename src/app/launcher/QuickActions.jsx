import { useNavigate } from 'react-router-dom';
import {
  Plus, Calendar as CalIcon, UserPlus, Upload, BarChart3, Users,
} from 'lucide-react';
import { useUI } from '@/app/UIContext';
import { useCan } from '@/app/permissions';
import { fmt } from '@/shared/lib/dates';

export function QuickActions() {
  const navigate = useNavigate();
  const { openNewOrderForm, setCalendarView, setCalendarRefDate } = useUI();
  const canCreateOrder = useCan('orden:create');
  const canCreateClient = useCan('cliente:create');
  const canBulk = useCan('cliente:bulk');

  const today = new Date();
  const todayK = fmt(today);

  const actions = [
    canCreateOrder && {
      id: 'nueva-orden',
      name: 'Nueva orden',
      desc: 'Crear OS',
      icon: Plus,
      color: '#B8741F',
      // OrderForm vive dentro de ModuleLayout (Mantenimiento).
      onClick: () => { navigate('/mantenimiento/ordenes'); openNewOrderForm(); },
    },
    {
      id: 'agenda-hoy',
      name: 'Agenda de hoy',
      desc: todayK,
      icon: CalIcon,
      color: '#1F5F75',
      onClick: () => {
        setCalendarView('day');
        setCalendarRefDate(today);
        navigate('/mantenimiento/planeacion');
      },
    },
    canCreateClient && {
      id: 'nuevo-cliente',
      name: 'Nuevo cliente',
      desc: 'Registrar en directorio',
      icon: UserPlus,
      color: '#2D6B45',
      onClick: () => navigate('/contactos/clientes/nuevo'),
    },
    {
      id: 'clientes',
      name: 'Ver clientes',
      desc: 'Directorio completo',
      icon: Users,
      color: '#5A3370',
      onClick: () => navigate('/contactos/clientes'),
    },
    canBulk && {
      id: 'importar',
      name: 'Importar clientes',
      desc: 'Desde Excel/CSV',
      icon: Upload,
      color: '#7A4F26',
      onClick: () => navigate('/contactos/clientes/importar'),
    },
    {
      id: 'reportes',
      name: 'Reportes',
      desc: 'Horas y desempeño',
      icon: BarChart3,
      color: '#5A7B2E',
      onClick: () => navigate('/reportes'),
    },
  ].filter(Boolean);

  return (
    <section>
      <h2
        className="text-xs uppercase tracking-wider font-medium mb-3 text-stone-500"
        style={{ letterSpacing: '0.12em' }}
      >
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((qa) => {
          const Icon = qa.icon;
          return (
            <button
              key={qa.id}
              type="button"
              onClick={qa.onClick}
              className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:shadow-sm hover:-translate-y-0.5 transition-all text-left"
              style={{ borderColor: '#EAEAE4' }}
            >
              <div
                className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{ background: qa.color, borderRadius: '22%' }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight text-stone-800 truncate">{qa.name}</div>
                <div className="text-[11px] text-stone-500 truncate">{qa.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
