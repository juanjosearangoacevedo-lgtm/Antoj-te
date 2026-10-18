import { Check, X } from 'lucide-react';

// Píldora de un antojo. Activa se nota por color Y por la marca de
// verificación; "pronto" se ve pero no se toca; "quitable" lleva una X para
// sacar un filtro ya aplicado.
export default function ChipAntojo({ etiqueta, activo = false, pronto = false, quitable = false, onClick }) {
  const base =
    'inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-transform duration-fast';
  const estado = pronto
    ? 'border-dashed border-line bg-surface text-muted opacity-60 cursor-not-allowed'
    : activo
      ? 'border-transparent bg-boton text-botontxt active:scale-95'
      : 'border-line bg-surface text-cream active:scale-95';

  return (
    <button
      type="button"
      onClick={pronto ? undefined : onClick}
      disabled={pronto}
      role={quitable ? undefined : 'checkbox'}
      aria-checked={quitable ? undefined : activo}
      aria-label={quitable ? `Quitar ${etiqueta}` : pronto ? `${etiqueta}, disponible pronto` : undefined}
      className={`${base} ${estado}`}
    >
      {activo && !quitable ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : null}
      {etiqueta}
      {pronto ? (
        <span className="rounded-full bg-surface2 px-1.5 py-px text-[10px] font-semibold text-muted">Pronto</span>
      ) : null}
      {quitable ? <X className="h-4 w-4" strokeWidth={2.6} aria-hidden /> : null}
    </button>
  );
}
