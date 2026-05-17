export function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-xl p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
        <Icon className="w-4 h-4 text-teal-600" /> {title}
      </h3>
      {children}
    </div>
  );
}
