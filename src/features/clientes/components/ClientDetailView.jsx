import { useState } from 'react';
import {
  ChevronLeft, Trash2, Building2, MapPin, RefreshCw, Search, Locate,
  ExternalLink, Navigation, CheckCircle2,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Section } from '@/shared/ui/Section';
import { LocationPicker } from '@/shared/ui/LocationPicker';
import { inputCls } from '@/styles/tokens';
import { useCan } from '@/app/permissions';
import { BRAND } from '@/config/branding';

const EMPTY_CLIENT = {
  id: '',
  nombre: '',
  contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  lat: null,
  lng: null,
  contratoActivo: true,
  notas: '',
};

export function ClientDetailView({ client, isNew, onSave, onDelete, onBack }) {
  const canEdit = useCan('cliente:edit');
  const canDelete = useCan('cliente:delete');
  const [form, setForm] = useState(client ? { ...client } : { ...EMPTY_CLIENT });
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(isNew);
  const [geocoding, setGeocoding] = useState(false);
  const [mapMsg, setMapMsg] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const setLatLng = (lat, lng) => {
    setForm(f => ({ ...f, lat: round(lat), lng: round(lng) }));
    setDirty(true);
  };

  const geocodeAddress = async () => {
    if (!form.direccion?.trim()) { setMapMsg('⚠ Ingresa una dirección primero'); return; }
    setGeocoding(true); setMapMsg('');
    try {
      // Sufijo opcional para sesgar geocoding a un país (configurable).
      const q = encodeURIComponent(form.direccion + (BRAND.geocodeCountrySuffix || ''));
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`);
      const d = await res.json();
      if (!d.length) setMapMsg('⚠ No se encontró. Refina la dirección o haz clic en el mapa.');
      else {
        setLatLng(parseFloat(d[0].lat), parseFloat(d[0].lon));
        setMapMsg('✓ Coordenadas obtenidas');
      }
    } catch {
      setMapMsg('⚠ Error de conexión. Haz clic en el mapa para seleccionar manualmente.');
    } finally {
      setGeocoding(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setMapMsg('⚠ Geolocalización no disponible'); return; }
    setMapMsg('Obteniendo ubicación...');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatLng(pos.coords.latitude, pos.coords.longitude);
        setMapMsg('✓ Ubicación obtenida');
      },
      () => setMapMsg('⚠ No se pudo obtener tu ubicación')
    );
  };

  const save = () => {
    if (!form.nombre.trim()) return alert('Nombre requerido');
    onSave(form);
    setDirty(false);
    setSavedAt(new Date());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const handleDelete = () => {
    if (isNew || !form.id) return;
    if (!confirm(`¿Eliminar el cliente ${form.nombre}? Esta acción no se puede deshacer.`)) return;
    onDelete(form.id);
  };

  const title = isNew ? 'Nuevo cliente' : form.nombre || 'Cliente';

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <div className="text-center flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 truncate font-serif">{title}</h2>
          <p className="text-xs text-stone-500">{isNew ? 'Crear nuevo cliente' : 'Detalle de cliente'}</p>
        </div>
        {!isNew && canDelete ? (
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : <div className="w-9" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Datos del cliente" icon={Building2}>
            <Field label="Nombre / Razón social *">
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Contacto principal">
                <input value={form.contacto || ''} onChange={e => set('contacto', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Teléfono">
                <input value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Email">
              <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Notas">
              <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} className={inputCls + ' h-20'} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={!!form.contratoActivo}
                onChange={e => set('contratoActivo', e.target.checked)}
                className="rounded"
              />
              Contrato activo
            </label>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Ubicación" icon={MapPin}>
            <Field label="Dirección">
              <textarea
                value={form.direccion || ''}
                onChange={e => set('direccion', e.target.value)}
                className={inputCls + ' h-16'}
                placeholder="Dirección"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={geocoding}
                className="px-3 py-1.5 text-xs rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                {geocoding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                Buscar por dirección
              </button>
              <button
                type="button"
                onClick={useCurrentLocation}
                className="px-3 py-1.5 text-xs rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5"
              >
                <Locate className="w-3 h-3" /> Mi ubicación
              </button>
            </div>
            {mapMsg && <div className="text-xs text-teal-700">{mapMsg}</div>}

            <div className="text-[11px] text-stone-500">
              Haz clic en el mapa o arrastra el marcador para fijar la ubicación.
            </div>
            <LocationPicker
              lat={form.lat}
              lng={form.lng}
              onChange={setLatLng}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitud">
                <input
                  type="number"
                  step="any"
                  value={form.lat ?? ''}
                  onChange={e => set('lat', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Longitud">
                <input
                  type="number"
                  step="any"
                  value={form.lng ?? ''}
                  onChange={e => set('lng', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
            {form.lat != null && form.lng != null && (
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${form.lat},${form.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" /> Cómo llegar
                </a>
              </div>
            )}
          </Section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur border-t border-stone-200 z-20" style={{ background: 'rgba(247,247,244,0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            {savedAt && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Cambios guardados</span>}
            {!savedAt && dirty && <span className="text-amber-600">Hay cambios sin guardar</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="px-4 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm">Cerrar</button>
            {canEdit && (
              <button
                onClick={save}
                disabled={!dirty}
                className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-medium"
              >
                {isNew ? 'Crear cliente' : 'Guardar cambios'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function round(n) {
  return Math.round(n * 1e6) / 1e6;
}
