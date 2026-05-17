import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { hasPermission } from './permissions';

// Guard de ruta: si el usuario actual no tiene NINGUNO de los permisos listados,
// redirige al launcher (/). Para usar en routes.jsx envolviendo el subárbol que
// queremos proteger. Si pasás un solo permiso, también vale (acepta string|array).
export function RequirePermission({ permissions }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const list = Array.isArray(permissions) ? permissions : [permissions];
  const ok = list.some((p) => hasPermission(user?.role, p));
  if (!ok) return <Navigate to="/" replace />;
  return <Outlet />;
}
