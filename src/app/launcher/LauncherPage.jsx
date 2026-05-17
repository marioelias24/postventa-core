import { useMemo } from 'react';
import { useStoreContext } from '@/store/StoreContext';
import { useAuth } from '@/app/AuthContext';
import { hasPermission } from '@/app/permissions';
import { useEmpresa } from '@/app/EmpresaContext';
import { tecnicoIdsOf } from '@/shared/lib/orders';
import { BRAND } from '@/config/branding';
import { HeroCalendario } from './HeroCalendario';
import { TallContactos } from './TallContactos';
import { CompactWidget } from './CompactWidget';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import { moduleById } from './modules';

function nombrePropio(email) {
  if (!email) return '';
  const local = email.split('@')[0] || '';
  const base = local.split(/[._-]/)[0] || local;
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : '';
}

export function LauncherPage() {
  const { data } = useStoreContext();
  const { user } = useAuth();
  const { nombre: empresaNombre } = useEmpresa();

  // today se memoiza para no recrear el objeto en cada render (estabiliza deps).
  const today = useMemo(() => new Date(), []);
  const dia = today.toLocaleDateString(BRAND.locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const nombre = nombrePropio(user?.email) || 'Bienvenido';

  // KPIs para las compactas: horas-hombre del mes actual + nº de técnicos
  // activos (para el preview de Ajustes).
  const { horasMes, ordenesMes, totalTecnicos } = useMemo(() => {
    const y = today.getFullYear();
    const mo = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${mo}`;
    const ordenesDelMes = (data.ordenes || []).filter(
      (o) => o?.fechaProgramada?.startsWith(prefix),
    );
    const horas = ordenesDelMes.reduce(
      (s, o) => s + (Number(o?.duracionEstimada) || 0) * Math.max(1, tecnicoIdsOf(o).length),
      0,
    );
    return {
      horasMes: Math.round(horas * 10) / 10,
      ordenesMes: ordenesDelMes.length,
      totalTecnicos: (data.tecnicos || []).length,
    };
  }, [data.ordenes, data.tecnicos, today]);

  const mReportes = moduleById('reportes');
  const mAjustes = moduleById('ajustes');
  // Ajustes solo visible si tiene permisos administrativos.
  const verAjustes = hasPermission(user?.role, 'users:manage') || hasPermission(user?.role, 'empresa:edit');

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
      {/* Saludo */}
      <div className="mb-6 md:mb-8">
        <div
          className="text-xs mb-1.5 uppercase tracking-wider text-stone-400"
          style={{ letterSpacing: '0.12em' }}
        >
          {dia}
        </div>
        <h1
          className="font-serif"
          style={{
            fontWeight: 400,
            fontSize: 'clamp(28px, 4.5vw, 38px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
          }}
        >
          Hola, {nombre}.
        </h1>
        <p className="mt-1 text-sm text-stone-500">¿Qué deseas hacer hoy?</p>
      </div>

      {/* Módulos */}
      <div className="mb-3 flex items-center justify-between">
        <h2
          className="text-xs uppercase tracking-wider font-medium text-stone-500"
          style={{ letterSpacing: '0.12em' }}
        >
          Módulos
        </h2>
      </div>

      <div className="bento-modules mb-8">
        <HeroCalendario data={data} />
        <TallContactos data={data} />
        <div className="m-cmp1">
          <CompactWidget
            module={mReportes}
            kpi={`${horasMes}h`}
            sublabel={`este mes · ${ordenesMes} órden${ordenesMes === 1 ? '' : 'es'}`}
            trend={ordenesMes > 0 ? 'horas-hombre acumuladas' : 'sin actividad'}
          />
        </div>
        {verAjustes && (
          <div className="m-cmp2">
            <CompactWidget
              module={mAjustes}
              kpi={totalTecnicos}
              sublabel={`técnico${totalTecnicos === 1 ? '' : 's'} registrado${totalTecnicos === 1 ? '' : 's'}`}
              trend="usuarios, empresa, permisos"
            />
          </div>
        )}
      </div>

      {/* Accesos rápidos + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
        <div className="lg:col-span-3">
          <RecentActivity data={data} />
        </div>
      </div>

      <div
        className="mt-10 pt-4 border-t flex items-center justify-between text-xs text-stone-400"
        style={{ borderColor: '#EAEAE4' }}
      >
        <span>{empresaNombre} · Post Venta</span>
        <span className="hidden md:inline">
          Presiona{' '}
          <kbd className="font-mono px-1.5 py-0.5 rounded mx-1" style={{ background: '#F0EFE9' }}>
            ⌘K
          </kbd>{' '}
          para buscar
        </span>
      </div>
    </div>
  );
}
