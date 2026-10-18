// Errores de la API, con una sola forma para toda la app.
//
// El backend siempre responde { error: true, message, details? }. Aquí se
// traduce eso (y los fallos de red) a un ErrorApi que las pantallas saben pintar
// sin conocer códigos HTTP.

export const MENSAJE_SIN_CONEXION = 'No pudimos cargar el contenido. Revisa tu conexión e intenta de nuevo.';
export const MENSAJE_GENERICO = 'Algo salió mal. Intenta de nuevo en un momento.';
export const MENSAJE_RESPUESTA_RARA = 'Recibimos una respuesta inesperada. Intenta de nuevo en un momento.';

// Estados que no son HTTP.
export const SIN_CONEXION = 0;
export const RESPUESTA_INESPERADA = -1;

export class ErrorApi extends Error {
  /** Código HTTP, o SIN_CONEXION / RESPUESTA_INESPERADA. */
  readonly status: number;
  /** `details.codigo` del backend (SESION_INVALIDA, CUENTA_REQUERIDA…), si viene. */
  readonly codigo: string | null;
  readonly detalles: unknown;

  constructor(status: number, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.detalles = detalles ?? null;
    this.codigo =
      detalles && typeof detalles === 'object' && 'codigo' in detalles && typeof detalles.codigo === 'string'
        ? detalles.codigo
        : null;
  }

  get esDeRed(): boolean {
    return this.status === SIN_CONEXION;
  }
}

/**
 * El error que se le enseña a una persona. Los 4xx del backend ya traen un
 * mensaje redactado para leerse; los 5xx no se muestran tal cual (no le dicen
 * nada a quien usa la app).
 */
export function errorDesdeRespuesta(status: number, cuerpo: unknown): ErrorApi {
  const datos = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {};
  const mensaje =
    status >= 500 || typeof datos.message !== 'string' || !datos.message ? MENSAJE_GENERICO : datos.message;
  return new ErrorApi(status, mensaje, datos.details);
}

export function mensajeDeError(err: unknown): string {
  return err instanceof ErrorApi ? err.message : MENSAJE_GENERICO;
}
