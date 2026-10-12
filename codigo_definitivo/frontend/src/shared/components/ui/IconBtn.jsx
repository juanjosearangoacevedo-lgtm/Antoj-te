export function IconBtn({ icono: Icono, etiqueta, className = '', tam = 16, ...props }) {
  return (
    <button
      aria-label={etiqueta}
      title={etiqueta}
      className={`inline-grid place-items-center w-9 h-9 rounded-xl text-muted hover:text-cream hover:bg-surface2 transition-colors duration-fast disabled:opacity-40 ${className}`}
      {...props}
    >
      {Icono && <Icono size={tam} />}
    </button>
  );
}
