import { z } from 'zod';
import { conectarSesion, pedir } from './cliente';
import { ErrorApi, MENSAJE_GENERICO, RESPUESTA_INESPERADA, SIN_CONEXION } from './errores';

// El id del dispositivo sale del llavero, que en las pruebas no existe.
jest.mock('../state/dispositivo', () => ({
  obtenerDispositivoId: jest.fn().mockResolvedValue('3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'),
}));

const respuesta = (status: number, cuerpo?: unknown) => ({
  status,
  headers: {
    get: (nombre: string) =>
      nombre.toLowerCase() === 'content-type' && cuerpo !== undefined ? 'application/json; charset=utf-8' : null,
  },
  json: async () => cuerpo,
});

const fetchFalso = jest.fn();
globalThis.fetch = fetchFalso as unknown as typeof fetch;

const cabecerasDe = (llamada: number) => fetchFalso.mock.calls[llamada][1].headers as Record<string, string>;

beforeEach(() => {
  fetchFalso.mockReset();
  conectarSesion(null);
});

test('manda las cabeceras de la app y el token cuando hay sesión', async () => {
  conectarSesion({ tokenDeAcceso: () => 'token-vigente', renovar: jest.fn() });
  fetchFalso.mockResolvedValueOnce(respuesta(200, { ok: true }));

  await pedir('/app/v1/cuenta');

  const [url] = fetchFalso.mock.calls[0];
  expect(url).toMatch(/\/app\/v1\/cuenta$/);
  expect(cabecerasDe(0)).toMatchObject({
    Authorization: 'Bearer token-vigente',
    'X-Dispositivo': '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b',
    Accept: 'application/json',
  });
  expect(cabecerasDe(0)['X-Plataforma']).toBeDefined();
});

test('con sesion:false no manda el token aunque exista (login, renovar)', async () => {
  conectarSesion({ tokenDeAcceso: () => 'token-vigente', renovar: jest.fn() });
  fetchFalso.mockResolvedValueOnce(respuesta(200, { ok: true }));

  await pedir('/app/v1/auth/login', { metodo: 'POST', cuerpo: { email: 'a@b.co' }, sesion: false });

  expect(cabecerasDe(0).Authorization).toBeUndefined();
  expect(cabecerasDe(0)['Content-Type']).toBe('application/json');
  expect(fetchFalso.mock.calls[0][1].body).toBe('{"email":"a@b.co"}');
});

test('un 401 llevando token renueva la sesión y repite la petición una vez', async () => {
  let token = 'viejo';
  const renovar = jest.fn(async () => {
    token = 'nuevo';
    return token;
  });
  conectarSesion({ tokenDeAcceso: () => token, renovar });
  fetchFalso
    .mockResolvedValueOnce(respuesta(401, { error: true, message: 'Tu sesión terminó.' }))
    .mockResolvedValueOnce(respuesta(200, { nombre: 'Ana' }));

  await expect(pedir('/app/v1/cuenta')).resolves.toEqual({ nombre: 'Ana' });
  expect(renovar).toHaveBeenCalledTimes(1);
  expect(cabecerasDe(1).Authorization).toBe('Bearer nuevo');
});

// Si cada petición renovara por su cuenta, el refresh token rotaría varias veces
// seguidas y todas menos una se quedarían con un token que ya no existe.
test('varias peticiones con 401 a la vez comparten UNA sola renovación', async () => {
  let token = 'viejo';
  const renovar = jest.fn(
    () =>
      new Promise<string>((resolver) =>
        setTimeout(() => {
          token = 'nuevo';
          resolver(token);
        }, 20)
      )
  );
  conectarSesion({ tokenDeAcceso: () => token, renovar });
  fetchFalso.mockImplementation(async (_url: string, init: { headers: Record<string, string> }) =>
    init.headers.Authorization === 'Bearer nuevo' ? respuesta(200, { ok: true }) : respuesta(401, { message: 'caducado' })
  );

  const resultados = await Promise.all([pedir('/a'), pedir('/b'), pedir('/c')]);

  expect(resultados).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
  expect(renovar).toHaveBeenCalledTimes(1);
});

test('si la sesión ya no se puede renovar, devuelve el 401 original', async () => {
  conectarSesion({ tokenDeAcceso: () => 'viejo', renovar: jest.fn(async () => null) });
  fetchFalso.mockResolvedValueOnce(
    respuesta(401, { error: true, message: 'Tu sesión terminó.', details: { codigo: 'SESION_INVALIDA' } })
  );

  const error = await pedir('/app/v1/cuenta').catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ErrorApi);
  expect((error as ErrorApi).status).toBe(401);
  expect((error as ErrorApi).codigo).toBe('SESION_INVALIDA');
  expect(fetchFalso).toHaveBeenCalledTimes(1);
});

test('un 401 SIN token (una clave mal escrita) no intenta renovar nada', async () => {
  const renovar = jest.fn();
  conectarSesion({ tokenDeAcceso: () => null, renovar });
  fetchFalso.mockResolvedValueOnce(respuesta(401, { error: true, message: 'Correo o contraseña incorrectos' }));

  await expect(pedir('/app/v1/auth/login', { metodo: 'POST', cuerpo: {}, sesion: false })).rejects.toMatchObject({
    status: 401,
    message: 'Correo o contraseña incorrectos',
  });
  expect(renovar).not.toHaveBeenCalled();
});

test('sin red lanza un error de conexión, con el mensaje para reintentar', async () => {
  fetchFalso.mockRejectedValueOnce(new TypeError('Network request failed'));

  const error = (await pedir('/app/v1/config').catch((e: unknown) => e)) as ErrorApi;

  expect(error.status).toBe(SIN_CONEXION);
  expect(error.esDeRed).toBe(true);
  expect(error.message).toMatch(/Reintentar|intenta de nuevo/i);
});

test('los 4xx traen el mensaje del backend; los 5xx, uno genérico', async () => {
  fetchFalso
    .mockResolvedValueOnce(respuesta(409, { error: true, message: 'Ya existe una cuenta con ese correo.' }))
    .mockResolvedValueOnce(respuesta(500, { error: true, message: 'Error interno del servidor' }));

  await expect(pedir('/uno')).rejects.toMatchObject({ status: 409, message: 'Ya existe una cuenta con ese correo.' });
  await expect(pedir('/dos')).rejects.toMatchObject({ status: 500, message: MENSAJE_GENERICO });
});

test('una respuesta que no cumple el contrato falla aquí, no en la pantalla', async () => {
  fetchFalso.mockResolvedValueOnce(respuesta(200, { id: 'no-es-un-numero' }));

  await expect(pedir('/x', { esquema: z.object({ id: z.number() }) })).rejects.toMatchObject({
    status: RESPUESTA_INESPERADA,
  });
});

test('un 204 devuelve undefined', async () => {
  fetchFalso.mockResolvedValueOnce(respuesta(204));
  await expect(pedir('/app/v1/auth/logout', { metodo: 'POST', cuerpo: {} })).resolves.toBeUndefined();
});
