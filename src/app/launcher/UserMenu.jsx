import { useEffect, useRef, useState } from 'react';
import { LogOut, KeyRound, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { ROLE_LABELS } from '@/app/permissions';
import { CambiarPasswordModal } from '@/features/ajustes/components/CambiarPasswordModal';

// Menú desplegable del avatar (top-right). Reemplaza el botón "Salir" suelto
// que había antes y agrega "Cambiar mi contraseña" disponible para todos los
// usuarios (incluyendo técnico/lectura que no entran a Ajustes).
export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const inicial = (user.email?.[0] || '?').toUpperCase();
  const roleLabel = ROLE_LABELS[user.role] || user.role || '';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full hover:bg-stone-100 pl-0.5 pr-1.5 py-0.5 transition-colors"
        title={user.email}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
          style={{ background: '#2D6B45' }}
        >
          {inicial}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-40"
          style={{ borderColor: '#EAEAE4' }}
        >
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="text-sm font-medium text-stone-800 truncate">{user.email}</div>
            {roleLabel && (
              <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-teal-600" /> {roleLabel}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); setShowPasswordModal(true); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 text-left"
          >
            <KeyRound className="w-4 h-4 text-stone-500" />
            Cambiar mi contraseña
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 text-left border-t border-stone-100"
          >
            <LogOut className="w-4 h-4 text-stone-500" />
            Cerrar sesión
          </button>
        </div>
      )}

      {showPasswordModal && <CambiarPasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
