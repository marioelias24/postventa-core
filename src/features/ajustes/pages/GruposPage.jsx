import { RolesPermisosView } from '../components/RolesPermisosView';

// La ruta se llama `/ajustes/grupos` por compatibilidad, pero la vista real
// es "Roles y permisos" (no hay grupos custom todavía — eso vendría en una
// fase futura).
export function GruposPage() {
  return <RolesPermisosView />;
}
