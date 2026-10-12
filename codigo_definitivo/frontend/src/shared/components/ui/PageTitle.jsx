export function PageTitle({ children, descripcion, accion }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-cream">{children}</h1>
        {descripcion && <p className="text-sm text-muted mt-1">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
