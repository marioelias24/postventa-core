import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStoreContext } from '@/store/StoreContext';
import { useUI } from '@/app/UIContext';
import { OrderDetailView } from '../components/OrderDetailView';

export function OrderDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const { data, upsert } = useStoreContext();
  const { openNewOrderForm } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  // Contexto de origen (lo pone quien navega aquí): la lista de ids "hermanos"
  // que se estaban viendo (lista filtrada, órdenes del día...) y la ruta de la
  // que se entró. Se pierde si recargas la página → se cae a un fallback.
  const fromState = location.state || {};
  const from = typeof fromState.from === 'string' ? fromState.from : null;
  const siblingIds = Array.isArray(fromState.siblingIds) && fromState.siblingIds.length ? fromState.siblingIds : null;

  // Lista que recorren los botones ‹ ›: la de origen si existe; si no, todas las
  // órdenes por id ascendente.
  const list = siblingIds || [...data.ordenes].sort((a, b) => a.id - b.id).map(o => o.id);
  const idx = list.indexOf(numericId);
  const prevId = idx > 0 ? list[idx - 1] : null;
  const nextId = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  // Al saltar a otra orden con ‹ ›: navegación relativa (../newId) para que
  // funcione bajo cualquier prefijo de módulo. replace:true evita apilar
  // historial. `relative: 'path'` es CRÍTICO acá: la ruta es `ordenes/:id`
  // (un único route con dos segments). El default de React Router v6+ trata
  // `..` como "salir del route entero" (= salta a `/mantenimiento`), lo que
  // hace que `../14` resuelva a `/mantenimiento/14` → no matchea → catch-all
  // manda al launcher. Con `relative: 'path'` se comporta como un browser
  // tradicional: `..` sube un segment de la URL y `../14` queda en
  // `/mantenimiento/ordenes/14`. Misma razón en goBack/handleDelete.
  const navState = (siblingIds || from) ? { siblingIds, from } : undefined;
  const goTo = (target) => navigate(`../${target}`, { replace: true, relative: 'path', state: navState });

  // "Volver": si hay historial atrás, usar back; si no, ir al `from` o un
  // fallback relativo (la lista de órdenes del módulo).
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(from || '..', { relative: 'path' });
  };

  return (
    <OrderDetailView
      key={numericId}
      orderId={numericId}
      data={data}
      onSave={upsert}
      onBack={goBack}
      onNew={() => openNewOrderForm()}
      onPrev={prevId != null ? () => goTo(prevId) : null}
      onNext={nextId != null ? () => goTo(nextId) : null}
      pagerInfo={idx >= 0 && list.length > 1 ? { index: idx, total: list.length } : null}
    />
  );
}
