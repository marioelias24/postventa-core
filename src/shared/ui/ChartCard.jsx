export function ChartCard({ title, children, className = '', action = null }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
