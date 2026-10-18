// Formatos de la app. A mano y no con Intl: el motor de JavaScript del teléfono
// no siempre trae los datos regionales de es-CO.

const conPuntos = (entero: number) => entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Precio en pesos colombianos, como en la web: $16.000 (punto de miles, sin decimales).
export function formatearPrecio(valor: number): string {
  if (!Number.isFinite(valor)) return '';
  const entero = Math.round(valor);
  const signo = entero < 0 ? '-' : '';
  return `${signo}$${conPuntos(Math.abs(entero))}`;
}

/** Contadores del feed: 950 → "950", 1.250 → "1,2 mil", 2.400.000 → "2,4 M". */
export function formatearConteo(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) return '0';
  const corto = (n: number) => (n >= 10 ? String(Math.floor(n)) : n.toFixed(1).replace(/\.0$/, '').replace('.', ','));
  // Se trunca a una décima: 1.290 es "1,2 mil", nunca "1,3 mil" (no se infla un contador).
  if (valor >= 1_000_000) return `${corto(Math.floor(valor / 100_000) / 10)} M`;
  if (valor >= 1_000) return `${corto(Math.floor(valor / 100) / 10)} mil`;
  return String(Math.floor(valor));
}

/** Hace cuánto, a partir de los segundos que calcula el backend: "ahora", "hace 5 min", "hace 3 d". */
export function haceCuanto(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 60) return 'ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  const semanas = Math.floor(dias / 7);
  if (dias < 30) return `hace ${semanas} sem`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  const anios = Math.floor(dias / 365);
  return `hace ${anios} ${anios === 1 ? 'año' : 'años'}`;
}
