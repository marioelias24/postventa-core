import { useNavigate, useParams } from 'react-router-dom';
import { useStoreContext } from '@/store/StoreContext';
import { ClientDetailView } from '../components/ClientDetailView';

export function ClientDetailPage({ mode }) {
  const { id } = useParams();
  const numericId = Number(id);
  const { data, upsert, remove } = useStoreContext();
  const navigate = useNavigate();
  const isNew = mode === 'new';

  // Navegación relativa: si hay historial atrás, usar back; si no, subir un
  // nivel al listado del módulo padre (/mantenimiento/clientes o /contactos/clientes).
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('..');
    }
  };

  const handleSave = async (form) => {
    try {
      const saved = await upsert('clientes', form);
      // Cuando es nuevo, navegamos al detalle (relativo al módulo) con el id real.
      if (isNew && saved?.id) {
        navigate(`../${saved.id}`, { replace: true });
      }
    } catch {
      // useStore ya muestra alert con el error.
    }
  };

  const handleDelete = (clientId) => {
    remove('clientes', clientId);
    navigate('..');
  };

  if (isNew) {
    return (
      <ClientDetailView
        client={null}
        isNew
        onSave={handleSave}
        onDelete={handleDelete}
        onBack={goBack}
      />
    );
  }

  const client = data.clientes.find(c => c.id === numericId);
  if (!client) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
        <p className="text-stone-500 text-sm mb-4">Cliente no encontrado</p>
        <button onClick={goBack} className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-sm">Volver</button>
      </div>
    );
  }

  return (
    <ClientDetailView
      client={client}
      isNew={false}
      onSave={handleSave}
      onDelete={handleDelete}
      onBack={goBack}
    />
  );
}
