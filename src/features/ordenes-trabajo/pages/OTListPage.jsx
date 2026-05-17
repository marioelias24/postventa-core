import { useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/store/StoreContext';
import { OTListView } from '../components/OTListView';
import { storage } from '@/services/storage';

export function OTListPage() {
  const { data, refresh } = useStoreContext();
  const navigate = useNavigate();

  const handleDelete = async (id) => {
    try {
      await storage.removeOT(id);
      refresh();
    } catch (err) {
      alert(err.message || 'Error al eliminar la OT');
    }
  };

  return (
    <OTListView
      data={data}
      onEdit={(ot) => navigate(`${ot.id}`)}
      onDelete={handleDelete}
      onAdd={() => navigate('new')}
    />
  );
}
