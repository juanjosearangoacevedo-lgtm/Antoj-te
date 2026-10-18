// Compara versiones "mayor.menor.parche". Devuelve -1, 0 o 1.
// Lo que no es número cuenta como 0, y "1.2" equivale a "1.2.0".
export function compararVersiones(a: string, b: string): number {
  const partes = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pa = partes(a);
  const pb = partes(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diferencia = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diferencia !== 0) return Math.sign(diferencia);
  }
  return 0;
}

export const debeActualizar = (actual: string, minima: string): boolean => compararVersiones(actual, minima) < 0;
