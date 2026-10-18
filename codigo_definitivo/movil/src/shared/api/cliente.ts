import type { ZodType } from 'zod';
import { obtenerDispositivoId } from '../state/dispositivo';
import { PLATAFORMA, TIEMPO_LIMITE_MS, URL_API, VERSION_APP } from './config';
import {
  ErrorApi,
  MENSAJE_RESPUESTA_RARA,
  MENSAJE_SIN_CONEXION,
  RESPUESTA_INESPERADA,
  SIN_CONEXION,
  errorDesdeRespuesta,
} from './errores';

// Único punto por donde la app habla con el backend. Las pantallas nunca llaman
// a `fetch`: usan los servicios de cada dominio (auth.ts, cuenta.ts…), que usan
// esto. Aquí vive todo lo que debe ser igual en cada petición: la URL base, las
// cabeceras, el token, el tiempo límite, la renovación de sesión y la forma de
// los errores.

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OpcionesPeticion<T> {
  metodo?: Metodo;
  cuerpo?: unknown;
  /**
   * false = no manda token aunque haya sesión (login, registro, renovar). Por
   * defecto se manda si existe: el backend decide si la ruta lo exige.
   */
  sesion?: boolean;
  /** Si viene, la respuesta se valida con él: un contrato roto falla aquí, no en una pantalla. */
  esquema?: ZodType<T>;
  /** Para cancelar (React Query la pasa al desmontar una pantalla). */
  senal?: AbortSignal;
}

// La sesión la lleva el store (state/sesion.ts); el cliente solo necesita pedirle
// el token vigente y que lo renueve. Se conecta desde fuera para que este archivo
// no dependa del store (y el store sí pueda depender de los servicios).
export interface ProveedorSesion {
  tokenDeAcceso(): string | null;
  /** Token nuevo, o null si la sesión terminó (ya no hay forma de renovarla). */
  renovar(): Promise<string | null>;
}

let proveedor: ProveedorSesion | null = null;

export function conectarSesion(nuevo: ProveedorSesion | null): void {
  proveedor = nuevo;
}

// Si diez peticiones reciben 401 a la vez (el token de 15 minutos caducó), se
// renueva UNA vez y las diez esperan ese resultado. Sin esto, el refresh token
// rotaría diez veces seguidas y nueve peticiones se quedarían con uno inválido.
let renovacionEnCurso: Promise<string | null> | null = null;

function renovarUnaVez(): Promise<string | null> {
  if (!proveedor) return Promise.resolve(null);
  if (!renovacionEnCurso) {
    renovacionEnCurso = proveedor.renovar().finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

async function ejecutar(
  ruta: string,
  opciones: OpcionesPeticion<unknown>,
  token: string | null
): Promise<{ status: number; datos: unknown }> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
  const alCancelar = () => controlador.abort();
  opciones.senal?.addEventListener('abort', alCancelar);

  try {
    const hayCuerpo = opciones.cuerpo !== undefined;
    const res = await fetch(`${URL_API}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(hayCuerpo ? { 'Content-Type': 'application/json' } : {}),
        // Identifica el teléfono en lo que no exige cuenta (y la sesión de
        // cada dispositivo). No es una credencial.
        'X-Dispositivo': await obtenerDispositivoId(),
        'X-Plataforma': PLATAFORMA,
        'X-Version-App': VERSION_APP,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: hayCuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
      signal: controlador.signal,
    });

    const tipo = res.headers.get('content-type') ?? '';
    let datos: unknown = null;
    if (tipo.includes('application/json')) {
      try {
        datos = await res.json();
      } catch {
        throw new ErrorApi(RESPUESTA_INESPERADA, MENSAJE_RESPUESTA_RARA);
      }
    }
    return { status: res.status, datos };
  } catch (err) {
    if (err instanceof ErrorApi) throw err;
    // Cancelada por quien la pidió: no es un error que enseñar.
    if (opciones.senal?.aborted) throw err;
    // Sin red, DNS, tiempo límite: para quien usa la app es lo mismo.
    throw new ErrorApi(SIN_CONEXION, MENSAJE_SIN_CONEXION);
  } finally {
    clearTimeout(temporizador);
    opciones.senal?.removeEventListener('abort', alCancelar);
  }
}

export async function pedir<T = unknown>(ruta: string, opciones: OpcionesPeticion<T> = {}): Promise<T> {
  let token = opciones.sesion === false ? null : (proveedor?.tokenDeAcceso() ?? null);
  let respuesta = await ejecutar(ruta, opciones as OpcionesPeticion<unknown>, token);

  // 401 llevando token: el de acceso caducó (dura 15 minutos) o se revocó. Se
  // renueva una vez y se repite la petición. Si la renovación tampoco puede, el
  // store ya cerró la sesión y aquí se devuelve el 401 original.
  if (respuesta.status === 401 && token) {
    const nuevo = await renovarUnaVez();
    if (nuevo) {
      token = nuevo;
      respuesta = await ejecutar(ruta, opciones as OpcionesPeticion<unknown>, token);
    }
  }

  const { status, datos } = respuesta;
  if (status < 200 || status >= 300) throw errorDesdeRespuesta(status, datos);
  if (status === 204 || datos === null) return undefined as T;

  if (!opciones.esquema) return datos as T;
  const validado = opciones.esquema.safeParse(datos);
  if (!validado.success) {
    throw new ErrorApi(RESPUESTA_INESPERADA, MENSAJE_RESPUESTA_RARA, validado.error.issues);
  }
  return validado.data;
}
