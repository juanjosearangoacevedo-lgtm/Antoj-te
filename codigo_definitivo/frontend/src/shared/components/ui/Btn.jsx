import { Spinner } from './Spinner';

export function Btn({ children, variante = 'primario', cargando = false, className = '', disabled, ...props }) {
  const estilos = {
    primario: 'bg-boton text-botontxt hover:opacity-90',
    acento: 'bg-amber text-botontxt hover:opacity-90',
    secundario: 'bg-surface text-cream border border-line hover:border-muted',
    peligro: 'bg-danger-soft text-danger hover:brightness-95',
    fantasma: 'text-muted hover:text-cream hover:bg-surface2',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando && <Spinner />}
      {children}
    </button>
  );
}
