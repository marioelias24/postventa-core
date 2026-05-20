export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-semibold text-stone-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
