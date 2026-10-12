// Pantalla completa de carga mientras se resuelve la sesión del staff.
// Evita el "salto" entre login y panel: ocupa el mismo espacio que el contenido real.
export default function PantallaCargando({ ancho = 'max-w-6xl', bloques = 2 }) {
  return (
    <div className="superficie-plataforma h-[100dvh] p-8 bg-base">
      <div className={`${ancho} mx-auto space-y-3 pt-16`} role="status" aria-label="Cargando">
        <div className="skeleton h-6 w-48" />
        {Array.from({ length: bloques }).map((_, i) => (
          <div key={i} className="skeleton h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
