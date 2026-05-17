import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStoreContext } from '@/store/StoreContext';
import { OTDetailView } from '../components/OTDetailView';
import { storage } from '@/services/storage';

export function OTDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, refresh } = useStoreContext();

  // id === 'new' → crear nueva OT (puede venir con ?ordenId=X)
  const isNew = id === 'new';
  const numericId = isNew ? null : Number(id);
  const defaultOrdenId = isNew ? Number(searchParams.get('ordenId')) || null : null;

  const handleSave = async (payload) => {
    try {
      const saved = await storage.upsertOT(payload);
      await refresh();
      // Si era nueva, navegar al id asignado.
      if (isNew && saved?.id) {
        navigate(`../${saved.id}`, { replace: true, relative: 'path' });
      }
      return saved;
    } catch (err) {
      alert(err.message || 'Error al guardar la OT');
      throw err;
    }
  };

  const handleDelete = async (otId) => {
    try {
      await storage.removeOT(otId);
      await refresh();
      navigate('..', { relative: 'path' });
    } catch (err) {
      alert(err.message || 'Error al eliminar la OT');
    }
  };

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('..', { relative: 'path' });
  };

  return (
    <OTDetailView
      key={id}
      otId={numericId}
      ordenId={defaultOrdenId}
      data={data}
      onSave={handleSave}
      onDelete={handleDelete}
      onBack={goBack}
      onRefresh={refresh}
    />
  );
}
