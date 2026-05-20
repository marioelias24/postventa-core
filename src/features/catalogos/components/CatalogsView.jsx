import { useState } from 'react';
import { Building2, Users, Tag, Flag } from 'lucide-react';
import { ClientesCatalog } from '@/features/clientes';
import { CatalogManager } from './CatalogManager';

export function CatalogsView({ store }) {
  const { data } = store;
  const [tab, setTab] = useState('clientes');

  const subTabs = [
    { k: 'clientes',    l: 'Clientes',    i: Building2 },
    { k: 'tecnicos',    l: 'Técnicos',    i: Users },
    { k: 'tipos',       l: 'Tipos',       i: Tag },
    { k: 'prioridades', l: 'Prioridades', i: Flag }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-1 rounded-lg border border-stone-200 overflow-x-auto">
        {subTabs.map(t => {
          const Icon = t.i;
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 whitespace-nowrap transition-colors ${active ? 'bg-teal-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.l}
            </button>
          );
        })}
      </div>

      {tab === 'clientes' && <ClientesCatalog store={store} />}

      {tab === 'tecnicos' && (
        <CatalogManager
          collection="tecnicos" label="Técnicos" items={data.tecnicos} store={store}
          fields={[
            { key: 'nombre',   label: 'Nombre' },
            { key: 'telefono', label: 'Teléfono' },
            { key: 'email',    label: 'Email' },
            { key: 'activo',   label: 'Activo', type: 'boolean', default: true }
          ]}
        />
      )}

      {tab === 'tipos' && (
        <CatalogManager
          collection="tipos" label="Tipos de servicio" items={data.tipos} store={store}
          fields={[
            { key: 'nombre', label: 'Nombre' },
            { key: 'color',  label: 'Color', type: 'color', default: '#14b8a6' },
            { key: 'activo', label: 'Activo', type: 'boolean', default: true }
          ]}
        />
      )}

      {tab === 'prioridades' && (
        <CatalogManager
          collection="prioridades" label="Prioridades" items={[...data.prioridades].sort((a, b) => a.nivel - b.nivel)} store={store}
          fields={[
            { key: 'nombre', label: 'Nombre' },
            { key: 'color',  label: 'Color', type: 'color', default: '#64748b' },
            { key: 'nivel',  label: 'Nivel', type: 'number', default: 1 }
          ]}
        />
      )}
    </div>
  );
}
