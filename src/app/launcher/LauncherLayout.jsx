import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search, HelpCircle, Bell, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useStoreContext } from '@/store/StoreContext';
import { useEmpresa } from '@/app/EmpresaContext';
import { CommandPalette } from './CommandPalette';
import { UserMenu } from './UserMenu';
import './launcher.css';

const beigeBg = '#F7F7F4';

export function LauncherLayout() {
  const { user } = useAuth();
  const { loading } = useStoreContext();
  const { nombre: empresaNombre, logo: empresaLogo } = useEmpresa();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K abre la paleta; Esc la cierra.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closePalette = useCallback(() => setPaletteOpen(false), []);

  if (loading) {
    return (
      <div className="launcher-root min-h-screen flex items-center justify-center" style={{ background: beigeBg }}>
        <div className="text-stone-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando…
        </div>
      </div>
    );
  }

  void user; // referenciado por UserMenu vía AuthContext

  return (
    <div
      className="launcher-root min-h-screen w-full flex flex-col text-stone-900"
      style={{ background: beigeBg, fontFamily: "'Geist', -apple-system, sans-serif" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3.5 border-b"
        style={{ background: 'rgba(247,247,244,0.85)', backdropFilter: 'blur(16px)', borderColor: '#EAEAE4' }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 min-w-0"
          title="Inicio"
        >
          <span className="bg-white rounded-md px-2 py-1 flex items-center border" style={{ borderColor: '#EAEAE4' }}>
            <img src={empresaLogo} alt={empresaNombre} className="h-6 w-auto" />
          </span>
          <span className="hidden sm:flex flex-col leading-tight text-left">
            <span className="text-[13px] font-semibold text-stone-800">Post Venta</span>
            <span className="text-[10px] text-stone-500 truncate max-w-[200px]">{empresaNombre}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:shadow-sm transition-all"
          style={{ borderColor: '#EAEAE4', minWidth: 260, maxWidth: 420, width: '100%' }}
        >
          <Search className="w-4 h-4 text-stone-400" />
          <span className="text-sm flex-1 text-left truncate text-stone-400">
            Buscar módulo, orden o cliente…
          </span>
          <kbd
            className="text-[11px] px-1.5 py-0.5 rounded font-mono hidden sm:inline"
            style={{ background: '#F0EFE9', color: '#666' }}
          >
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative p-2 rounded-lg hover:bg-stone-100"
            title="Notificaciones (próximamente)"
          >
            <Bell className="w-4 h-4 text-stone-500" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-stone-100 hidden sm:block"
            title="Ayuda"
          >
            <HelpCircle className="w-4 h-4 text-stone-500" />
          </button>
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {paletteOpen && <CommandPalette onClose={closePalette} />}
    </div>
  );
}
