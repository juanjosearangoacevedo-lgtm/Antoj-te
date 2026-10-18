import { useCallback, useEffect, useMemo, useState } from 'react';
import { staffApi } from '@/shared/services/staffApi';
import { CLAVES_TEMA } from '@/shared/tema/opciones';

/**
 * Estado del editor de personalización.
 *
 * Mantiene un BORRADOR separado de lo guardado: así la vista previa reacciona a
 * cada toque sin escribir en la base, y se puede saber si hay cambios sin
 * guardar (o descartarlos).
 */
export function useTemaBorrador() {
  const [guardado, setGuardado] = useState(null); // lo que hay en la base
  const [borrador, setBorrador] = useState(null); // lo que se está editando
  const [cargando, setCargando] = useState(true);
  const [guardandose, setGuardandose] = useState(false);
  const [error, setError] = useState(null);
  const [confirmacion, setConfirmacion] = useState(false);

  useEffect(() => {
    staffApi.tema
      .obtener()
      .then((t) => {
        setGuardado(t);
        setBorrador(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const cambiar = useCallback((clave, valor) => {
    setConfirmacion(false);
    setBorrador((t) => ({ ...t, [clave]: valor }));
  }, []);

  const descartar = useCallback(() => {
    setBorrador(guardado);
    setError(null);
    setConfirmacion(false);
  }, [guardado]);

  // Deja en blanco toda la personalización: el menú vuelve al diseño de Antojate.
  const restablecerTodo = useCallback(() => {
    setConfirmacion(false);
    setBorrador((t) => ({ ...t, ...Object.fromEntries(CLAVES_TEMA.map((c) => [c, null])) }));
  }, []);

  const hayCambios = useMemo(() => {
    if (!guardado || !borrador) return false;
    return CLAVES_TEMA.some((c) => (guardado[c] ?? null) !== (borrador[c] ?? null));
  }, [guardado, borrador]);

  const guardar = useCallback(async () => {
    setGuardandose(true);
    setError(null);
    try {
      // Solo se envían las claves de personalización: nunca id, restaurante_id
      // ni actualizado_en, que son del sistema.
      const cuerpo = Object.fromEntries(CLAVES_TEMA.map((c) => [c, borrador[c] ?? null]));
      const actualizado = await staffApi.tema.guardar(cuerpo);
      setGuardado(actualizado);
      setBorrador(actualizado);
      setConfirmacion(true);
      setTimeout(() => setConfirmacion(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandose(false);
    }
  }, [borrador]);

  return {
    borrador,
    cargando,
    guardandose,
    error,
    confirmacion,
    hayCambios,
    cambiar,
    descartar,
    restablecerTodo,
    guardar,
  };
}
