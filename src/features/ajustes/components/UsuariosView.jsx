import { useEffect, useMemo, useState } from 'react';
import {
  UserCog, KeyRound, RefreshCw, Mail, Plus, Trash2, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useCan } from '@/app/permissions';
import { ROLES, ROLE_LABELS } from '@/app/permissions';
import { fetchUsers, deleteUserApi, updateUserRoleApi } from '@/services/users';
import { BRAND } from '@/config/branding';
import { NuevoUsuarioModal } from './NuevoUsuarioModal';
import { ResetPasswordModal } from './ResetPasswordModal';

export function UsuariosView() {
  const { user, logout } = useAuth();
  const canManage = useCan('users:manage');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingRoleId, setSavingRoleId] = useState(null);

  const refresh = () => {
    setLoading(true);
    fetchUsers()
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; el setState ocurre en .then/.finally tras la microtask.
  useEffect(() => { refresh(); }, []);

  const adminsCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);

  const handleDelete = async (u) => {
    const isSelf = u.email === user?.email;
    const confirmMsg = isSelf
      ? `Vas a eliminar tu propia cuenta (${u.email}). Cerrarás sesión inmediatamente. ¿Continuar?`
      : `¿Eliminar al usuario ${u.email}? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(u.id);
    try {
      await deleteUserApi(u.id);
      if (isSelf) {
        await logout();
        return;
      }
      refresh();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el usuario.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRoleChange = async (u, newRole) => {
    if (newRole === u.role) return;
    // Guardrail UI: confirma cuando bajás el rol de un admin único.
    if (u.role === 'admin' && newRole !== 'admin' && adminsCount <= 1) {
      alert('No se puede cambiar el rol: este es el único administrador del sistema.');
      return;
    }
    setSavingRoleId(u.id);
    try {
      const { user: updated } = await updateUserRoleApi(u.id, newRole);
      setUsers((list) => list.map((x) => (x.id === updated.id ? { ...x, role: updated.role } : x)));
    } catch (err) {
      alert(err.message || 'No se pudo cambiar el rol.');
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 font-serif">Usuarios</h1>
          <p className="text-sm text-stone-500">Cuentas con acceso a Post Venta</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowNuevoModal(true)}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo usuario
          </button>
        )}
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-900 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Para cambiar tu propia contraseña, abrí el menú del avatar (arriba a la derecha) → <strong>Cambiar mi contraseña</strong>.
        </span>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Creado</th>
                {canManage && <th className="px-4 py-2 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-8 text-center text-stone-400">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-8 text-center text-red-600">{error}</td>
                </tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={canManage ? 4 : 3} className="py-8 text-center text-stone-400 italic">Sin usuarios</td></tr>
              ) : users.map((u) => {
                const isMe = u.email === user?.email;
                const isLast = users.length === 1;
                const isOnlyAdmin = u.role === 'admin' && adminsCount <= 1;
                return (
                  <tr key={u.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-2 text-stone-900">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                          style={{ background: isMe ? '#2D6B45' : '#5A3370' }}
                        >
                          {u.email[0].toUpperCase()}
                        </div>
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-stone-400" />
                          {u.email}
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">tú</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {canManage ? (
                        <select
                          value={u.role || 'admin'}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          disabled={savingRoleId === u.id || isOnlyAdmin}
                          title={isOnlyAdmin ? 'Es el único administrador; asignar admin a otro antes de cambiar' : ''}
                          className="text-xs px-2 py-1 rounded border border-stone-200 bg-white text-stone-700 disabled:bg-stone-50 disabled:text-stone-400"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700">{ROLE_LABELS[u.role] || u.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-stone-700 text-xs">
                      {new Date(u.createdAt).toLocaleDateString(BRAND.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => setResetTarget(u)}
                              className="p-1.5 rounded hover:bg-stone-100 text-stone-500"
                              title="Resetear contraseña"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            disabled={isLast || isOnlyAdmin || deletingId === u.id}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={isLast ? 'No se puede eliminar al último usuario' : (isOnlyAdmin ? 'No se puede eliminar al único administrador' : 'Eliminar usuario')}
                          >
                            {deletingId === u.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNuevoModal && (
        <NuevoUsuarioModal
          onClose={() => setShowNuevoModal(false)}
          onCreated={refresh}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}

UsuariosView.icon = UserCog;
