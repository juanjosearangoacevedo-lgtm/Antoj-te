export function Skeleton({ className = '' }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

// Bloque de skeletons para páginas en carga (título + filas)
export function SkeletonPagina({ filas = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
