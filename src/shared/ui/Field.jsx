export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-stone-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
