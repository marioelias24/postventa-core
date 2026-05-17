import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchEmpresa, logoUrl } from '@/services/empresa';
import { BRAND } from '@/config/branding';

const EmpresaContext = createContext(null);

// Datos de la empresa cargados una vez al iniciar (post-auth). El refresh()
// se llama desde EmpresaView después de guardar/subir logo para refrescar
// header/login/etc. en todas las vistas que la usen.
export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchEmpresa();
      setEmpresa(data.empresa || null);
    } catch (err) {
      console.error('[empresa] fetch failed:', err);
      // No bloqueamos la app: si falla, se usan los fallbacks.
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- patrón estándar de fetch on mount; setState ocurre en .finally() después de la microtask del effect.
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Helpers públicos derivados, con fallbacks para no romper la UI si la
  // tabla está vacía o hubo error de red.
  // Si el deployment necesita un logo personalizado, basta con reemplazar
  // /public/logo.svg con su propio archivo (mismo path) — no hace falta
  // tocar este código.
  const nombre = empresa?.nombre?.trim() || BRAND.defaultName;
  const logo = logoUrl(empresa) || '/logo.svg';

  return (
    <EmpresaContext.Provider value={{ empresa, nombre, logo, loading, refresh }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa debe usarse dentro de <EmpresaProvider>');
  return ctx;
}
