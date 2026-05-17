import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { Field } from '@/shared/ui/Field';
import { inputCls } from '@/styles/tokens';
import { BRAND } from '@/config/branding';

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F7F4' }}>
        <RefreshCw className="w-5 h-5 text-stone-400 animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Email o contraseña incorrectos' : (err.message || 'Error de conexión'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#F7F7F4', fontFamily: "'Geist', -apple-system, sans-serif" }}
    >
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="text-center">
          <div className="bg-white inline-flex rounded-md px-3 py-2 mb-3 border border-stone-200">
            <img src="/logo.svg" alt={BRAND.defaultName} className="h-8 w-auto" />
          </div>
          <h1 className="text-lg font-bold text-stone-900 font-serif">Post Venta</h1>
          <p className="text-xs text-stone-500">Inicia sesión para continuar</p>
        </div>

        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="tucorreo@ejemplo.com"
          />
        </Field>

        <Field label="Contraseña">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </Field>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium flex items-center justify-center gap-2"
        >
          {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
