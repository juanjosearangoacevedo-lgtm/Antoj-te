export function Badge({ children, tono = 'neutro' }) {
  const tonos = {
    neutro: 'bg-surface2 text-muted',
    ok: 'bg-ok-soft text-ok',
    alerta: 'bg-accent-soft text-amber-soft',
    peligro: 'bg-danger-soft text-danger',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${tonos[tono]}`}>
      {children}
    </span>
  );
}
