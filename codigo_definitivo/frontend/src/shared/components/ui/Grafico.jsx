// Dos gráficos mínimos, en CSS sobre los tokens de la marca. Sin librería: una de
// gráficos pesa ~100 KB y aquí solo hacen falta barras. Si algún día se necesitan
// ejes, escalas o tooltips de verdad, ESE es el momento de traerse una.

// Barras horizontales con etiqueta y valor. Para embudos y rankings.
export function Barras({ datos, formato = (v) => v, vacio = 'Sin datos en este periodo' }) {
  if (!datos?.length) return <p className="text-sm text-muted py-4">{vacio}</p>;

  // La escala es relativa al mayor valor, no al total: con un plato que se lleva
  // el 90% de las vistas, escalar sobre el total dejaría al resto invisible.
  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <ul className="space-y-3">
      {datos.map((d) => (
        <li key={d.etiqueta}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-sm text-cream truncate">{d.etiqueta}</span>
            <span className="text-sm text-muted tabular-nums shrink-0">
              {formato(d.valor)}
              {d.nota && <span className="text-xs ml-1.5">{d.nota}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface2 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber transition-[width] duration-[--motion-slow]"
              style={{ width: `${(d.valor / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Columnas verticales. Para series con muchos puntos y poco espacio: las 24 horas.
export function Columnas({ datos, formato = (v) => v, vacio = 'Sin datos en este periodo' }) {
  const hayDatos = datos?.some((d) => d.valor > 0);
  if (!hayDatos) return <p className="text-sm text-muted py-4">{vacio}</p>;

  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <div className="flex items-end gap-1 h-32" role="img" aria-label="Actividad por hora">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-full flex-1 flex items-end">
            <div
              className={`w-full rounded-t transition-[height] duration-[--motion-slow] ${
                d.valor > 0 ? 'bg-amber' : 'bg-surface2'
              }`}
              // El mínimo de 2px deja ver el carril de las horas en cero: sin él
              // parecen huecos en la gráfica en vez de horas sin movimiento.
              style={{ height: `${Math.max((d.valor / max) * 100, 2)}%` }}
              title={`${d.etiqueta}: ${formato(d.valor)}`}
            />
          </div>
          <span className="text-[10px] text-muted tabular-nums truncate w-full text-center">
            {d.corta ?? d.etiqueta}
          </span>
        </div>
      ))}
    </div>
  );
}
