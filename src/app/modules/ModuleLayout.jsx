import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  NavLink, Outlet, useLocation, useNavigate, Link,
} from 'react-router-dom';
import {
  Search, HelpCircle, Bell, Menu, X, ChevronRight, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useStoreContext } from '@/store/StoreContext';
import { useUI } from '@/app/UIContext';
import { useEmpresa } from '@/app/EmpresaContext';
import { hasPermission } from '@/app/permissions';
import { CommandPalette } from '@/app/launcher/CommandPalette';
import { UserMenu } from '@/app/launcher/UserMenu';
import { DayDetailModal, OrderForm } from '@/features/ordenes';
import { moduleById, moduleFromPath, visibleSubviews } from './moduleConfig';

const APP_BG = '#F7F7F4';

export function ModuleLayout({ moduleId }) {
  const m = moduleById(moduleId);
  const { data, loading, upsert, remove } = useStoreContext();
  const { user } = useAuth();
  const { nombre: empresaNombre, logo: empresaLogo } = useEmpresa();
  const {
    dayDetail, closeDayDetail,
    orderForm, closeOrderForm, openNewOrderForm,
  } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Al editar desde el DayDetailModal, la orden vive en el módulo de
  // mantenimiento — destino fijo, sin depender del módulo actual.
  const openOrder = (o, siblingIds) =>
    navigate(`/mantenimiento/ordenes/${o.id}`, {
      state: { siblingIds, from: location.pathname },
    });

  // Silenciar warning del linter para moduleFromPath (importado por completitud).
  void moduleFromPath;

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Cierra el sidebar móvil al cambiar de sub-vista.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Sub-vistas visibles para el rol actual.
  const subviews = useMemo(
    () => visibleSubviews(m, (perm) => hasPermission(user?.role, perm)),
    [m, user?.role],
  );

  // Sub-vista activa derivada de la URL: la que tenga el path más largo que matchea.
  const activeSubview = useMemo(() => {
    if (!m) return null;
    const sorted = [...subviews].sort((a, b) => b.path.length - a.path.length);
    return sorted.find((s) => {
      const full = s.path ? `${m.base}/${s.path}` : m.base;
      return location.pathname === full || location.pathname.startsWith(full + '/');
    }) || subviews[0];
  }, [m, subviews, location.pathname]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: APP_BG, fontFamily: "'Geist', -apple-system, sans-serif" }}
      >
        <div className="text-stone-500 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando…
        </div>
      </div>
    );
  }

  if (!m) return null;

  const Icon = m.icon;
  void user; // referenciado por UserMenu vía AuthContext

  return (
    <div
      className="launcher-root min-h-screen flex flex-col text-stone-900"
      style={{ background: APP_BG, fontFamily: "'Geist', -apple-system, sans-serif" }}
    >
      {/* Top bar global (mismo estilo que LauncherLayout) */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b"
        style={{ background: 'rgba(247,247,244,0.85)', borderColor: '#EAEAE4' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-stone-100"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5 text-stone-600" />
            </button>
            <Link to="/" className="flex items-center gap-2 min-w-0" title="Inicio">
              <span
                className="bg-white rounded-md px-2 py-1 flex items-center border"
                style={{ borderColor: '#EAEAE4' }}
              >
                <img src={empresaLogo} alt={empresaNombre} className="h-6 w-auto" />
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-sm text-stone-500 min-w-0">
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium text-stone-800 truncate">{m.name}</span>
              {activeSubview && activeSubview.id !== subviews[0]?.id && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-stone-300" />
                  <span className="truncate">{activeSubview.label}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:shadow-sm transition-all"
            style={{ borderColor: '#EAEAE4', minWidth: 200, maxWidth: 360, width: '100%' }}
          >
            <Search className="w-4 h-4 text-stone-400" />
            <span className="text-sm flex-1 text-left truncate text-stone-400">
              Buscar…
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
        </div>
      </header>

      {/* Cuerpo del módulo: sidebar + contenido */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Backdrop móvil */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:sticky md:top-[64px] left-0 z-50 md:z-0 h-screen md:h-[calc(100vh-64px)] w-56 flex flex-col border-r transition-transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
          style={{ background: '#FFFFFF', borderColor: '#EAEAE4' }}
        >
          {/* Header del sidebar */}
          <div className="px-4 py-4 border-b flex items-center justify-between gap-2" style={{ borderColor: '#EAEAE4' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{ background: m.color, borderRadius: '22%' }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-stone-800 leading-tight truncate">{m.name}</div>
                <div className="text-[11px] text-stone-500 truncate">{m.desc}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeSidebar}
              className="md:hidden p-1 hover:bg-stone-100 rounded"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          <nav className="px-2 py-3 flex-1 overflow-y-auto">
            {subviews.map((s) => {
              const VIcon = s.icon;
              const to = s.path ? `${m.base}/${s.path}` : m.base;
              const active = activeSubview?.id === s.id;
              return (
                <NavLink
                  key={s.id}
                  to={to}
                  end={!s.path}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors"
                  style={{
                    background: active ? m.color + '15' : 'transparent',
                    color: active ? m.color : '#444',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <VIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{s.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 md:px-6 py-5">
          <Outlet />
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={closePalette} />}

      {dayDetail && (
        <DayDetailModal
          date={dayDetail}
          data={data}
          onClose={closeDayDetail}
          onEdit={openOrder}
          onDelete={(id) => remove('ordenes', id)}
          onAdd={(d) => { closeDayDetail(); openNewOrderForm(d); }}
        />
      )}
      {orderForm && (
        <OrderForm
          order={null}
          defaultDate={orderForm.defaultDate}
          defaults={orderForm.defaults}
          backlogMode={orderForm.backlogMode || false}
          data={data}
          onSave={upsert}
          onClose={closeOrderForm}
        />
      )}
    </div>
  );
}
