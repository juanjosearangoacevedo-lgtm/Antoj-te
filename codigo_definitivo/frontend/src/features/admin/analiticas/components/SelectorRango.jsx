import { RANGOS } from '@/features/admin/analiticas/hooks/useRango';

export default function SelectorRango({ rangoId, onCambiar }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="group">
      {RANGOS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onCambiar(r.id)}
          aria-pressed={rangoId === r.id}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors duration-[--motion-fast] ${
            rangoId === r.id ? 'bg-boton text-botontxt font-medium' : 'text-muted hover:text-cream'
          }`}
        >
          {r.etiqueta}
        </button>
      ))}
    </div>
  );
}
