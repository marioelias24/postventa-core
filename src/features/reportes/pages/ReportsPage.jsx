import { useStoreContext } from '@/store/StoreContext';
import { ReportsView } from '../components/ReportsView';

export function ReportsPage() {
  const { data } = useStoreContext();
  return <ReportsView data={data} />;
}
