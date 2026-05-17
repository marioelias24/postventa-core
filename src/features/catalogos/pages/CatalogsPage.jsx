import { useStoreContext } from '@/store/StoreContext';
import { CatalogsView } from '../components/CatalogsView';

export function CatalogsPage() {
  const store = useStoreContext();
  return <CatalogsView store={store} />;
}
