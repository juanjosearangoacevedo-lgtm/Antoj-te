import { useEffect, useState } from 'react';
import { obtenerPlanes } from '@/features/landing/services/planesApi';

// Carga los planes a la venta. Devuelve los tres estados por separado (cargando,
// error, datos) porque la sección de precios los pinta distinto: un esqueleto, un
// aviso con reintento, o las tarjetas.
export function usePlanes() {
  const [planes, setPlanes] = useState(null);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setError(null);

    obtenerPlanes()
      .then((datos) => vigente && setPlanes(datos))
      .catch(() => vigente && setError('No pudimos cargar los planes.'));

    return () => {
      vigente = false;
    };
  }, [intento]);

  return { planes, error, cargando: !planes && !error, reintentar: () => setIntento((n) => n + 1) };
}
