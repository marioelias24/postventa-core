import { useEffect, useRef, useState } from 'react';
import {
  Building2, Upload, Image as ImageIcon, Trash2, CheckCircle2, RefreshCw,
} from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Section } from '@/shared/ui/Section';
import { inputCls } from '@/styles/tokens';
import {
  fetchEmpresa, updateEmpresaApi, uploadEmpresaLogoApi, deleteEmpresaLogoApi, logoUrl,
} from '@/services/empresa';
import { useEmpresa } from '@/app/EmpresaContext';

const EMPTY = { nombre: '', ruc: '', telefono: '', email: '', direccion: '' };

export function EmpresaView() {
  const { refresh: refreshGlobal } = useEmpresa();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchEmpresa()
      .then((data) => {
        if (!mounted) return;
        setEmpresa(data.empresa);
        setForm({
          nombre: data.empresa?.nombre || '',
          ruc: data.empresa?.ruc || '',
          telefono: data.empresa?.telefono || '',
          email: data.empresa?.email || '',
          direccion: data.empresa?.direccion || '',
        });
      })
      .catch((err) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const save = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setSubmitting(true);
    try {
      const { empresa: saved } = await updateEmpresaApi(form);
      setEmpresa(saved);
      setDirty(false);
      setSavedAt(new Date());
      setTimeout(() => setSavedAt(null), 2500);
      refreshGlobal();
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { empresa: saved } = await uploadEmpresaLogoApi(file);
      setEmpresa(saved);
      refreshGlobal();
    } catch (err) {
      setError(err.message || 'No se pudo subir el logo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('¿Quitar el logo actual? Se mostrará el logo por defecto.')) return;
    setError(null);
    try {
      const { empresa: saved } = await deleteEmpresaLogoApi();
      setEmpresa(saved);
      refreshGlobal();
    } catch (err) {
      setError(err.message || 'No se pudo quitar el logo.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <RefreshCw className="w-4 h-4 animate-spin" /> Cargando…
      </div>
    );
  }

  const currentLogo = logoUrl(empresa);

  return (
    <form onSubmit={save} className="space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 font-serif">Empresa</h1>
        <p className="text-sm text-stone-500">Datos generales que se muestran en la app y en reportes impresos</p>
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Datos generales" icon={Building2}>
            <Field label="Nombre / Razón social *">
              <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="RUC">
                <input value={form.ruc} onChange={(e) => set('ruc', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Teléfono">
                <input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Dirección">
              <textarea value={form.direccion} onChange={(e) => set('direccion', e.target.value)} className={inputCls + ' h-20'} />
            </Field>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Logo" icon={ImageIcon}>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-full h-40 rounded-lg border-2 border-dashed flex items-center justify-center bg-stone-50 overflow-hidden"
                style={{ borderColor: '#EAEAE4' }}
              >
                {currentLogo ? (
                  <img src={currentLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center text-stone-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <div className="text-xs">Sin logo personalizado</div>
                    <div className="text-[10px]">(se usa el logo por defecto)</div>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {uploading
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Subiendo…' : (currentLogo ? 'Cambiar' : 'Subir logo')}
                </button>
                {currentLogo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-2 text-sm rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                    title="Quitar logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-stone-500 text-center">
                PNG, JPG, WEBP o SVG · máximo 2 MB
              </p>
            </div>
          </Section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur border-t border-stone-200 z-20" style={{ background: 'rgba(247,247,244,0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            {savedAt && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Cambios guardados</span>}
            {!savedAt && dirty && <span className="text-amber-600">Hay cambios sin guardar</span>}
          </div>
          <button
            type="submit"
            disabled={!dirty || submitting}
            className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-medium"
          >
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}
