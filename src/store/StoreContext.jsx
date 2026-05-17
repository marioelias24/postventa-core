import { createContext, useContext } from 'react';
import { useStore } from './useStore';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const store = useStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext debe usarse dentro de <StoreProvider>');
  return ctx;
}
