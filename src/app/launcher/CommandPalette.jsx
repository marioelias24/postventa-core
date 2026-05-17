import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ClipboardList, Users } from 'lucide-react';
import { useStoreContext } from '@/store/StoreContext';
import { MODULES } from './modules';

export function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const { data } = useStoreContext();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [prevQ, setPrevQ] = useState('');
  const inputRef = useRef(null);

  // Resetear la selección al cambiar la búsqueda — patrón "ajustar estado en
  // render" recomendado por React (en vez de useEffect con setState).
  if (q !== prevQ) {
    setPrevQ(q);
    setActive(0);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Resultados unificados: módulos + órdenes + clientes (límite por sección).
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const mods = MODULES.filter((m) => !term || (m.name + ' ' + m.desc).toLowerCase().includes(term))
      .slice(0, term ? 6 : MODULES.length)
      .map((m) => ({
        kind: 'modulo',
        id: `m-${m.id}`,
        title: m.name,
        subtitle: m.desc,
        color: m.color,
        Icon: m.icon,
        onSelect: () => navigate(m.to),
      }));

    if (!term) return mods;

    const cliMap = Object.fromEntries((data.clientes || []).map((c) => [c.id, c]));

    const ords = (data.ordenes || [])
      .filter((o) => {
        const num = (o.numero || `#${o.id}`).toLowerCase();
        const cli = cliMap[o.clienteId]?.nombre?.toLowerCase() || '';
        return num.includes(term) || cli.includes(term);
      })
      .slice(0, 6)
      .map((o) => ({
        kind: 'orden',
        id: `o-${o.id}`,
        title: `Orden ${o.numero || `#${o.id}`}`,
        subtitle: cliMap[o.clienteId]?.nombre || 'Cliente —',
        color: '#B8741F',
        Icon: ClipboardList,
        onSelect: () => navigate(`/mantenimiento/ordenes/${o.id}`),
      }));

    const cls = (data.clientes || [])
      .filter((c) => (c.nombre || '').toLowerCase().includes(term))
      .slice(0, 6)
      .map((c) => ({
        kind: 'cliente',
        id: `c-${c.id}`,
        title: c.nombre,
        subtitle: c.direccion || c.telefono || '',
        color: '#5A3370',
        Icon: Users,
        onSelect: () => navigate(`/contactos/clientes/${c.id}`),
      }));

    return [...mods, ...ords, ...cls];
  }, [q, data.ordenes, data.clientes, navigate]);

  // ↑↓ navegan; ↵ selecciona.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        const item = results[active];
        if (item) {
          e.preventDefault();
          item.onSelect();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, active, onClose]);

  const sections = useMemo(() => {
    const groups = [];
    let last = null;
    results.forEach((r, idx) => {
      if (r.kind !== last) {
        groups.push({ kind: r.kind, items: [] });
        last = r.kind;
      }
      groups[groups.length - 1].items.push({ ...r, idx });
    });
    return groups;
  }, [results]);

  const labelFor = (kind) =>
    kind === 'modulo' ? 'Módulos' : kind === 'orden' ? 'Órdenes' : 'Clientes';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 md:pt-24 px-4"
      style={{ background: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden bg-white border"
        style={{ borderColor: '#EAEAE4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: '#EAEAE4' }}
        >
          <Search className="w-5 h-5 text-stone-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar módulo, orden o cliente…"
            className="flex-1 outline-none text-sm bg-transparent text-stone-800 placeholder:text-stone-400"
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded font-mono"
            style={{ background: '#F0EFE9', color: '#666' }}
          >
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-400">Sin resultados</div>
          ) : (
            sections.map((sec) => (
              <div key={sec.kind}>
                <div
                  className="px-4 py-1.5 text-xs uppercase tracking-wider text-stone-400"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {labelFor(sec.kind)}
                </div>
                {sec.items.map((item) => {
                  const Icon = item.Icon;
                  const isActive = item.idx === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActive(item.idx)}
                      onClick={() => { item.onSelect(); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                      style={{ background: isActive ? '#F7F7F4' : 'transparent' }}
                    >
                      <div
                        className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                        style={{ background: item.color, borderRadius: '22%' }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-stone-800 truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-xs text-stone-400 truncate">{item.subtitle}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          className="flex items-center justify-between px-4 py-2 border-t text-xs text-stone-400"
          style={{ background: '#FAFAF7', borderColor: '#EAEAE4' }}
        >
          <div className="flex gap-3">
            <span>
              <kbd className="font-mono">↑↓</kbd> navegar
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> abrir
            </span>
          </div>
          <span>Búsqueda global</span>
        </div>
      </div>
    </div>
  );
}
