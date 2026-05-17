import { useNavigate, useLocation } from 'react-router-dom';
import { useStoreContext } from '@/store/StoreContext';
import { useUI } from '@/app/UIContext';
import { BacklogView } from '../components/BacklogView';

export function BacklogPage() {
  const { data, remove } = useStoreContext();
  const { openNewOrderForm } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <BacklogView
      data={data}
      onEdit={(o, siblingIds) =>
        navigate(`/mantenimiento/ordenes/${o.id}`, { state: { siblingIds, from: location.pathname } })
      }
      onDelete={(id) => remove('ordenes', id)}
      onAdd={() => openNewOrderForm(null, null, true)}
    />
  );
}
