// Vista genérica "próximamente" — para sub-vistas de Ajustes aún no implementadas.
export function PlaceholderView({ title, description, icon: Icon, nextPhase }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 font-serif">{title}</h1>
        {description && <p className="text-sm text-stone-500">{description}</p>}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
        {Icon && (
          <div
            className="w-14 h-14 mx-auto flex items-center justify-center mb-4"
            style={{ background: '#5A337015', borderRadius: '22%' }}
          >
            <Icon className="w-7 h-7 text-purple-700" />
          </div>
        )}
        <h3 className="text-base font-semibold text-stone-800 mb-1">Próximamente</h3>
        <p className="text-sm text-stone-500 max-w-md mx-auto">
          {nextPhase || 'Esta sección estará disponible en una fase posterior.'}
        </p>
      </div>
    </div>
  );
}
