import { useStoreContext } from '@/store/StoreContext';
import { PlantillasChecklist } from '../components/PlantillasChecklist';

export function PlantillasChecklistPage() {
  const { data, refresh } = useStoreContext();
  return <PlantillasChecklist data={data} onRefresh={refresh} />;
}
