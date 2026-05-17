import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Upload, User, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react';
import { inputCls } from '@/styles/tokens';
import { useCan } from '@/app/permissions';

export function ClientesCatalog({ store }) {
  const { data, remove } = store;
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const canCreate = useCan('cliente:create');
  const canDelete = useCan('cliente:delete');
  const canBulk = useCan('cliente:bulk');

  const filtered = data.clientes.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (`${c.nombre} ${c.contacto || ''} ${c.direccion || ''} ${c.telefono || ''} ${c.email || ''}`).toLowerCase().includes(q);
  });

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    remove('clientes', id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' pl-9'} placeholder="Buscar cliente..." />
        </div>
        {canBulk && (
          <button
            onClick={() => navigate('importar')}
            className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg font-medium flex items-center gap-2"
            title="Importar clientes desde CSV/Excel"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
        )}
        {canCreate && (
          <button
            onClick={() => navigate('nuevo')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo cliente
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white border border-stone-200 rounded-xl p-4 hover:border-teal-400 hover:shadow-sm transition-all flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-stone-900 truncate">{c.nombre}</h3>
              </div>
              {!c.contratoActivo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Inactivo</span>}
            </div>
            <div className="space-y-1 text-xs text-stone-500 mb-3 flex-1">
              {c.contacto && <div className="flex items-center gap-1.5"><User className="w-3 h-3 flex-shrink-0" />{c.contacto}</div>}
              {c.telefono && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 flex-shrink-0" />{c.telefono}</div>}
              {c.email && <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</div>}
              {c.direccion && <div className="flex items-start gap-1.5"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{c.direccion}</span></div>}
            </div>
            <div className="flex gap-1 pt-2 border-t border-stone-100">
              <button
                onClick={() => navigate(`${c.id}`)}
                className="flex-1 py-1.5 text-xs rounded bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Editar
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-2 py-1.5 text-xs rounded bg-red-50 hover:bg-red-100 text-red-700"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-stone-400 text-sm italic">Sin clientes registrados</div>}
      </div>
    </div>
  );
}
