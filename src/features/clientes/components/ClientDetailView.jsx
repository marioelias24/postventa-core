import { useState } from 'react';
import {
  ChevronLeft, Trash2, Building2, MapPin, RefreshCw, Search, Locate,
  ExternalLink, Navigation, Mail, Phone,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Section } from '@/shared/ui/Section';
import { LocationPicker } from '@/shared/ui/LocationPicker';
import {
  FormFooter, FormHeader, FormPage, FormTabs, FormToolbar, HeaderFact,
} from '@/shared/ui/FormView';
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
  const [activeTab, setActiveTab] = useState('general');

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
    <FormPage>
      <FormToolbar
        navigation={(
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
        )}
        actions={(
          <>
            {canEdit && (
              <button
                onClick={save}
                disabled={!dirty}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400"
              >
                {isNew ? 'Crear cliente' : 'Guardar'}
              </button>
            )}
            {!isNew && canDelete && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            )}
          </>
        )}
      />

      <FormHeader
        eyebrow={(
          <span className="inline-flex items-center gap-1.5 font-medium uppercase">
            <Building2 className="h-3.5 w-3.5 text-teal-600" />
            Cliente
          </span>
        )}
        title={title}
        subtitle={isNew ? 'Crear nuevo cliente' : 'Ficha de cliente'}
        badges={(
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
            form.contratoActivo
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-stone-200 bg-stone-50 text-stone-500'
          }`}>
            {form.contratoActivo ? 'Contrato activo' : 'Sin contrato activo'}
          </span>
        )}
        facts={(
          <>
            <HeaderFact icon={Building2} label="Contacto" value={form.contacto || 'Sin contacto'} detail={form.nombre || ''} />
            <HeaderFact icon={Phone} label="Teléfono" value={form.telefono || 'Sin teléfono'} detail={form.email || ''} />
            <HeaderFact icon={MapPin} label="Ubicación" value={form.direccion || 'Sin dirección'} detail={form.lat != null && form.lng != null ? `${form.lat}, ${form.lng}` : ''} />
            <HeaderFact icon={Mail} label="Email" value={form.email || 'Sin email'} detail={form.contratoActivo ? 'Contrato activo' : ''} />
          </>
        )}
      />

      <FormTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'general', label: 'General', icon: Building2 },
          { id: 'ubicacion', label: 'Ubicación', icon: MapPin },
        ]}
      >
        {activeTab === 'general' && (
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
        )}

        {activeTab === 'ubicacion' && (
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
        )}
      </FormTabs>

      <FormFooter
        dirty={dirty}
        saved={savedAt}
        onClose={onBack}
        onSave={save}
        saveLabel={isNew ? 'Crear cliente' : 'Guardar cambios'}
        canSave={canEdit}
        saveDisabled={!dirty}
      />
    </FormPage>
  );
}

function round(n) {
  return Math.round(n * 1e6) / 1e6;
}
