import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '@/services/auth';
import { setOnUnauthorized } from '@/services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Si la API responde 401, limpiamos la sesión local → ProtectedRoute redirige a /login.
  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
    return () => setOnUnauthorized(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  }, []);

  // Llamado por storage.js cuando recibe 401: deja el estado limpio sin pedir al backend.
  const handleUnauthorized = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, handleUnauthorized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
