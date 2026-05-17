import { useState } from 'react';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { inputCls } from '@/styles/tokens';
import { createUserApi } from '@/services/users';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/app/permissions';

export function NuevoUsuarioModal({ onClose, onCreated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('tecnico');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('La confirmación no coincide.'); return; }
    setSubmitting(true);
    try {
      const { user } = await createUserApi(email.trim(), password, role);
      setDone(true);
      onCreated?.(user);
      setTimeout(() => onClose?.(), 1200);
    } catch (err) {
      setError(err.message || 'No se pudo crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-800 font-serif flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600" /> Nuevo usuario
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {done ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Usuario creado
            </div>
          ) : (
            <>
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="usuario@ejemplo.com"
                  autoFocus
                />
              </Field>
              <Field label="Contraseña">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Mínimo 8 caracteres"
                />
              </Field>
              <Field label="Confirmar contraseña">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Rol">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
              </Field>
              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="p-4 border-t border-stone-200 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium"
            >
              {submitting ? 'Creando…' : 'Crear'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
