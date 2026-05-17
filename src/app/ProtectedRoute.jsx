import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F7F4' }}>
        <div className="text-stone-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Verificando sesión...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
