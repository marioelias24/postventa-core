import { useLocation, useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/store/StoreContext';
import { useUI } from '@/app/UIContext';
import { OrdersListView } from '../components/OrdersListView';

export function OrdersListPage() {
  const { data } = useStoreContext();
  const { openNewOrderForm } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  // Navegación relativa al módulo en el que está montada la página.
  return (
    <OrdersListView
      data={data}
      onEdit={(o, siblingIds) =>
        navigate(`${o.id}`, { state: { siblingIds, from: location.pathname } })
      }
      onAdd={() => openNewOrderForm()}
    />
  );
}
