export function KPI({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-stone-500">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-stone-900 font-serif">{value}</div>
    </div>
  );
}
