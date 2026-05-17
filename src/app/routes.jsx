import { createBrowserRouter, Navigate, Outlet, useParams } from 'react-router-dom';
import { StoreProvider } from '@/store/StoreContext';
import { UIProvider } from '@/app/UIContext';
import { AuthProvider, useAuth } from '@/app/AuthContext';
import { EmpresaProvider } from '@/app/EmpresaContext';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { RequirePermission } from '@/app/RequirePermission';
import { hasPermission } from '@/app/permissions';
import { LauncherLayout } from '@/app/launcher/LauncherLayout';
import { LauncherPage } from '@/app/launcher/LauncherPage';
import { ModuleLayout } from '@/app/modules/ModuleLayout';
import { LoginPage } from '@/features/auth';
import { CalendarPage } from '@/features/calendario';
import { OrdersListPage, OrderDetailPage } from '@/features/ordenes';
import {
  ClientDetailPage, ClientesCatalogPage, ImportClientesPage,
} from '@/features/clientes';
import { CatalogsPage } from '@/features/catalogos';
import { ReportsPage } from '@/features/reportes';
import { UsuariosPage, EmpresaPage, GruposPage } from '@/features/ajustes';

// Redirige una ruta vieja con :id a la nueva, conservando el id.
function RedirectWithId({ template }) {
  const { id } = useParams();
  return <Navigate to={template.replace(':id', id)} replace />;
}

// Index de /ajustes: redirige a la primera sub-vista para la que el usuario
// tiene permiso (Usuarios si admin, Empresa si supervisor).
function AjustesIndex() {
  const { user } = useAuth();
  if (hasPermission(user?.role, 'users:manage')) return <Navigate to="usuarios" replace />;
  if (hasPermission(user?.role, 'empresa:edit')) return <Navigate to="empresa" replace />;
  return <Navigate to="/" replace />;
}

function PublicRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

// Providers compartidos para todo lo autenticado.
function ProtectedRoot() {
  return (
    <StoreProvider>
      <UIProvider>
        <EmpresaProvider>
          <Outlet />
        </EmpresaProvider>
      </UIProvider>
    </StoreProvider>
  );
}

// Sub-árbol con clientes (lista + detalle + nuevo + importar). Se monta en dos
// lugares: bajo /mantenimiento/clientes y bajo /contactos/clientes.
const clientesRoutes = [
  { index: true, element: <ClientesCatalogPage /> },
  { path: 'importar', element: <ImportClientesPage /> },
  { path: 'nuevo', element: <ClientDetailPage mode="new" /> },
  { path: ':id', element: <ClientDetailPage /> },
];

export const router = createBrowserRouter([
  {
    element: <PublicRoot />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <ProtectedRoot />,
            children: [
              // Launcher (tema claro)
              {
                element: <LauncherLayout />,
                children: [
                  { index: true, element: <LauncherPage /> },
                ],
              },

              // MÓDULO: Mantenimiento
              {
                path: 'mantenimiento',
                element: <ModuleLayout moduleId="mantenimiento" />,
                children: [
                  { index: true, element: <Navigate to="planeacion" replace /> },
                  { path: 'planeacion', element: <CalendarPage /> },
                  { path: 'ordenes', element: <OrdersListPage /> },
                  { path: 'ordenes/:id', element: <OrderDetailPage /> },
                  { path: 'clientes', children: clientesRoutes },
                  { path: 'configuracion', element: <CatalogsPage /> },
                ],
              },

              // MÓDULO: Contactos
              {
                path: 'contactos',
                element: <ModuleLayout moduleId="contactos" />,
                children: [
                  { index: true, element: <Navigate to="clientes" replace /> },
                  { path: 'clientes', children: clientesRoutes },
                ],
              },

              // MÓDULO: Reportes (sola vista)
              {
                path: 'reportes',
                element: <ModuleLayout moduleId="reportes" />,
                children: [
                  { index: true, element: <ReportsPage /> },
                ],
              },

              // MÓDULO: Ajustes — protegido por permisos. El index redirige a
              // la primera sub-vista permitida para el rol (usuarios si admin,
              // empresa si supervisor).
              {
                element: <RequirePermission permissions={['users:manage', 'empresa:edit']} />,
                children: [
                  {
                    path: 'ajustes',
                    element: <ModuleLayout moduleId="ajustes" />,
                    children: [
                      { index: true, element: <AjustesIndex /> },
                      {
                        element: <RequirePermission permissions="users:manage" />,
                        children: [
                          { path: 'usuarios', element: <UsuariosPage /> },
                          { path: 'grupos', element: <GruposPage /> },
                        ],
                      },
                      {
                        element: <RequirePermission permissions="empresa:edit" />,
                        children: [
                          { path: 'empresa', element: <EmpresaPage /> },
                        ],
                      },
                    ],
                  },
                ],
              },

              // Redirecciones de rutas viejas (por bookmarks / enlaces guardados).
              { path: 'calendario', element: <Navigate to="/mantenimiento/planeacion" replace /> },
              { path: 'ordenes', element: <Navigate to="/mantenimiento/ordenes" replace /> },
              { path: 'ordenes/:id', element: <RedirectWithId template="/mantenimiento/ordenes/:id" /> },
              { path: 'catalogos', element: <Navigate to="/mantenimiento/configuracion" replace /> },
              { path: 'clientes/importar', element: <Navigate to="/mantenimiento/clientes/importar" replace /> },
              { path: 'clientes/nuevo', element: <Navigate to="/mantenimiento/clientes/nuevo" replace /> },
              { path: 'clientes/:id', element: <RedirectWithId template="/mantenimiento/clientes/:id" /> },

              { path: '*', element: <Navigate to="/" replace /> },
            ],
          },
        ],
      },
    ],
  },
]);
