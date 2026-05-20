import { CheckCircle2 } from 'lucide-react';

export function FormPage({ children, className = '' }) {
  return <div className={`space-y-4 pb-24 ${className}`}>{children}</div>;
}

export function FormToolbar({ navigation, actions, trailing }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">{navigation}</div>
        {trailing && <div className="flex flex-wrap items-center gap-2">{trailing}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// Barra de flujo: el Stepper es la única fuente de verdad del estado, así que
// no repetimos la etiqueta en texto. El color del estado vive en una franja
// superior sutil; `currentLabel` se conserva para accesibilidad.
export function FormWorkflow({ currentLabel, color = '#64748b', children }) {
  return (
    <div
      className="sticky top-0 z-30 overflow-hidden rounded-xl border border-stone-200 bg-white/95 shadow-sm backdrop-blur"
      aria-label={currentLabel ? `Estado actual: ${currentLabel}` : undefined}
    >
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        {children}
      </div>
    </div>
  );
}

export function FormHeader({ eyebrow, title, subtitle, badges, facts, smartButtons }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            {eyebrow && <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">{eyebrow}</div>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-2xl font-bold text-stone-950 sm:text-3xl">{title}</h1>
              {badges}
            </div>
            {subtitle && <div className="mt-2 text-sm text-stone-500">{subtitle}</div>}
          </div>
          {smartButtons && <div className="flex flex-wrap items-start gap-2 xl:justify-end">{smartButtons}</div>}
        </div>
        {facts && (
          <div className="mt-4 grid grid-cols-1 border-t border-stone-100 sm:grid-cols-2 lg:grid-cols-4">
            {facts}
          </div>
        )}
      </div>
    </div>
  );
}

export function HeaderFact({ icon: Icon, label, value, detail }) {
  return (
    <div className="min-w-0 pt-3 sm:border-l sm:border-stone-100 sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-4 w-4 text-teal-600" />
        <span>{label}</span>
      </div>
      <div className="mt-1 truncate text-[15px] font-semibold text-stone-900">{value}</div>
      {detail && <div className="mt-0.5 truncate text-[13px] text-stone-500">{detail}</div>}
    </div>
  );
}

export function SmartButton({ icon: Icon, count, label, onClick, title, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-w-[160px] items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-stone-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
      title={title || label}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold leading-none text-stone-900">{count}</span>
        <span className="mt-1 block text-xs font-medium text-stone-600">{label}</span>
      </span>
    </button>
  );
}

export function FormTabs({ tabs, activeTab, onChange, children }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border-b border-stone-200">
        <div className="flex min-w-max items-end gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-[15px] font-medium transition-colors ${
                  active
                    ? 'border-teal-600 text-stone-950'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{tab.label}</span>
                {tab.badge != null && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                    active ? 'bg-teal-50 text-teal-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}

export function FormFooter({ dirty, saved, onClose, onSave, saveLabel = 'Guardar cambios', canSave = true, saveDisabled }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 backdrop-blur" style={{ background: 'rgba(247,247,244,0.95)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="text-xs text-stone-500">
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Cambios guardados
            </span>
          )}
          {!saved && dirty && <span className="text-amber-600">Hay cambios sin guardar</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
            Cerrar
          </button>
          {canSave && (
            <button
              onClick={onSave}
              disabled={saveDisabled}
              className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:bg-stone-200 disabled:text-stone-400"
            >
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
