import { useState } from 'react';
import { X, KeyRound, CheckCircle2 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { inputCls } from '@/styles/tokens';
import { changeMyPassword } from '@/services/users';

export function CambiarPasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (next !== confirm) { setError('La confirmación no coincide.'); return; }
    setSubmitting(true);
    try {
      await changeMyPassword(current, next);
      setDone(true);
      setTimeout(() => onClose?.(), 1500);
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña.');
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
            <KeyRound className="w-4 h-4 text-teal-600" /> Cambiar contraseña
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
              <CheckCircle2 className="w-4 h-4" /> Contraseña actualizada
            </div>
          ) : (
            <>
              <Field label="Contraseña actual">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <Field label="Nueva contraseña">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className={inputCls}
                  placeholder="Mínimo 8 caracteres"
                />
              </Field>
              <Field label="Confirmar nueva contraseña">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputCls}
                />
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
              {submitting ? 'Guardando…' : 'Cambiar'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
