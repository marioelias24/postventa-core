export function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-xl p-5 space-y-4 ${className}`}>
      <h3 className="text-base font-semibold text-stone-800 flex items-center gap-2 pb-3 border-b border-stone-100">
        <Icon className="w-5 h-5 text-teal-600" /> {title}
      </h3>
      {children}
    </div>
  );
}
