import { useMemo, useState } from 'react';

// Rangos preestablecidos. Se ofrecen en vez de dos selectores de fecha porque la
// pregunta real del restaurante es "¿cómo va la semana?", no "¿del 3 al 17?".
export const RANGOS = [
  { id: '7d', etiqueta: '7 días', dias: 7 },
  { id: '30d', etiqueta: '30 días', dias: 30 },
  { id: '90d', etiqueta: '90 días', dias: 90 },
];

const aTexto = (fecha) => fecha.toISOString().slice(0, 10);

export function useRango(inicial = '30d') {
  const [rangoId, setRangoId] = useState(inicial);

  // La cadena de consulta es lo que se le pasa a staffApi, y también lo que
  // identifica la petición: si cambia, hay que recargar.
  const query = useMemo(() => {
    const { dias } = RANGOS.find((r) => r.id === rangoId) ?? RANGOS[1];
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - dias * 24 * 60 * 60 * 1000);
    return `?desde=${aTexto(desde)}&hasta=${aTexto(hasta)}`;
  }, [rangoId]);

  return { rangoId, setRangoId, query };
}
