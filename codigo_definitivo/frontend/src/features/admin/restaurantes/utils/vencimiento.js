// Cómo se describe la membresía de un restaurante en el panel del superadmin, a
// partir de `fecha_fin` y `vencida` (los calcula MySQL en restaurantes.model).

const DIA_MS = 24 * 60 * 60 * 1000;

export function describirVencimiento(r) {
  if (!r.fecha_fin) return { texto: 'Sin vencimiento', clase: 'text-muted', tono: 'neutro' };

  const fin = new Date(String(r.fecha_fin).replace(' ', 'T'));
  const fecha = fin.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  if (Number(r.vencida)) return { texto: `Vencida el ${fecha}`, clase: 'text-danger', tono: 'peligro' };

  const dias = Math.ceil((fin.getTime() - Date.now()) / DIA_MS);
  if (dias <= 7) return { texto: `Vence el ${fecha} (${dias} d)`, clase: 'text-amber-soft', tono: 'alerta' };
  return { texto: `Vence el ${fecha}`, clase: 'text-cream', tono: 'ok' };
}
