import { Inbox } from 'lucide-react';

export function EstadoVacio({ mensaje, icono: Icono = Inbox, titulo, accion }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-surface2 text-muted mb-4">
        <Icono size={22} />
      </div>
      {titulo && <h3 className="text-sm font-semibold text-cream mb-1">{titulo}</h3>}
      <p className="text-sm text-muted max-w-sm mx-auto">{mensaje}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
