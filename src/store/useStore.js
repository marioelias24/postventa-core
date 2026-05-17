import { useEffect, useRef, useState } from 'react';
import { storage } from '@/services/storage';

const EMPTY_DATA = {
  tecnicos: [], tipos: [], estados: [], prioridades: [], clientes: [], ordenes: [],
};

// Cada cuánto se vuelve a leer del servidor para reflejar cambios de otras
// personas sin tener que recargar la página.
const POLL_MS = 25000;

// El backend asigna IDs (números autoincrement); el frontend ya no los inventa.
function isUpdate(item) {
  return typeof item?.id === 'number' && Number.isInteger(item.id) && item.id > 0;
}

export function useStore() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Cuántas escrituras hay en curso: el auto-refresh espera a que terminen para
  // no pisar una creación/edición optimista con datos viejos del servidor.
  const inFlightRef = useRef(0);

  const refresh = () => storage.read()
    .then(setData)
    .catch((err) => {
      console.error('[store] refresh failed:', err);
      setError(err);
      throw err;
    });

  // Refresco silencioso (polling y al volver a la pestaña): si falla por un
  // parpadeo de red no muestra error ni rompe la UI.
  const quietRefresh = () => {
    if (inFlightRef.current > 0 || document.visibilityState !== 'visible') return;
    storage.read().then(setData).catch(() => { /* reintenta en el próximo tick */ });
  };

  // Solo al montar: la carga inicial.
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  // Auto-actualización: cada POLL_MS y al volver a la pestaña.
  useEffect(() => {
    const id = setInterval(quietRefresh, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') quietRefresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const track = (promise) => {
    inFlightRef.current += 1;
    return promise.finally(() => { inFlightRef.current = Math.max(0, inFlightRef.current - 1); });
  };

  // upsert devuelve Promise<savedItem>. Update aplica optimistic; create espera al server.
  const upsert = (collection, item) => {
    if (isUpdate(item)) {
      const ts = new Date().toISOString();
      const payload = { ...item, updatedAt: ts };
      setData(prev => {
        const arr = prev[collection];
        const idx = arr.findIndex(x => x.id === payload.id);
        if (idx < 0) return prev;
        return { ...prev, [collection]: arr.map((x, i) => (i === idx ? payload : x)) };
      });
      return track(storage.upsert(collection, payload)).catch((err) => {
        console.error('[store] upsert sync failed:', err);
        alert(err.message || 'No se pudo guardar el cambio en el servidor.');
        throw err;
      });
    }
    // CREATE: pedir al server el id y agregar al state cuando llegue.
    return track(storage.upsert(collection, item))
      .then((created) => {
        // Idempotente: React puede ejecutar el updater 2 veces en dev (chequeo de pureza).
        setData(prev => {
          const arr = prev[collection];
          if (arr.some(x => x.id === created.id)) return prev;
          return { ...prev, [collection]: [...arr, created] };
        });
        return created;
      })
      .catch((err) => {
        console.error('[store] create failed:', err);
        alert(err.message || 'No se pudo crear el registro.');
        throw err;
      });
  };

  const remove = (collection, id) => {
    const previous = data[collection];
    const removedItem = previous.find(x => x.id === id);

    setData(prev => ({
      ...prev,
      [collection]: prev[collection].filter(x => x.id !== id),
    }));

    return track(storage.remove(collection, id)).catch((err) => {
      // Revertir el optimistic delete.
      if (removedItem) {
        setData(prev => ({
          ...prev,
          [collection]: prev[collection].some(x => x.id === id)
            ? prev[collection]
            : [...prev[collection], removedItem],
        }));
      }
      console.error('[store] remove sync failed:', err);
      alert(err.message || 'No se pudo eliminar el registro.');
      throw err;
    });
  };

  const reset = () => {
    setLoading(true);
    return storage.reset()
      .then(() => storage.read())
      .then(setData)
      .catch((err) => {
        console.error('[store] reset failed:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  };

  return { data, loading, error, upsert, remove, reset, refresh };
}
