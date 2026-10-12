export function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface border border-line rounded-2xl p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
