import { useStoreContext } from '@/store/StoreContext';
import { ClientesCatalog } from '../components/ClientesCatalog';

export function ClientesCatalogPage() {
  const store = useStoreContext();
  return <ClientesCatalog store={store} />;
}
