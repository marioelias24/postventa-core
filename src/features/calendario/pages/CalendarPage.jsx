import { useLocation, useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/store/StoreContext';
import { useUI } from '@/app/UIContext';
import { CalendarView } from '../components/CalendarView';

export function CalendarPage() {
  const { data } = useStoreContext();
  const { openDayDetail, openNewOrderForm } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  // Detalle de orden está en el módulo padre: /mantenimiento/ordenes/:id.
  // Desde /mantenimiento/planeacion vamos a ../ordenes/<id>.
  return (
    <CalendarView
      data={data}
      onSelectDate={openDayDetail}
      onSelectOrder={(id, siblingIds) =>
        navigate(`../ordenes/${id}`, { state: { siblingIds, from: location.pathname } })
      }
      onOpenForm={(date, defaults) => openNewOrderForm(date || null, defaults || null)}
    />
  );
}
