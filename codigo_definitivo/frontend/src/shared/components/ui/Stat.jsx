// Cifra grande con su etiqueta. Estaba definido dentro del dashboard global; subió
// aquí al necesitarlo también las pantallas de analítica, para no tener dos.
export function Stat({ etiqueta, valor, detalle }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{etiqueta}</div>
      <div className="text-3xl font-bold tracking-tight text-cream mt-1.5 tabular-nums">{valor}</div>
      {detalle && <div className="text-xs text-muted mt-1.5">{detalle}</div>}
    </div>
  );
}
