import { useSesion } from './sesion';
import { useSolicitudAcceso } from './solicitudAcceso';

// El llavero no existe en las pruebas; aquí no se usa.
jest.mock('../almacenamiento/seguro', () => ({
  almacenSeguro: { leer: jest.fn(), guardar: jest.fn(), borrar: jest.fn() },
}));

beforeEach(() => {
  useSesion.setState({ estado: 'anonimo', comensal: null, accessToken: null });
  useSolicitudAcceso.setState({ motivo: null, resolver: null });
});

// Es lo que permite "seguir donde quedó": el flujo que pidió la cuenta espera
// esta promesa y continúa en cuanto la persona entra, venga de donde venga.
test('la solicitud responde true en cuanto la sesión pasa a autenticada', async () => {
  const respuesta = useSolicitudAcceso.getState().abrir('Para confirmar tu reserva necesitas crear una cuenta.');
  expect(useSolicitudAcceso.getState().motivo).toMatch(/reserva/);

  useSesion.setState({ estado: 'autenticado' });

  await expect(respuesta).resolves.toBe(true);
  expect(useSolicitudAcceso.getState().resolver).toBeNull();
});

test('cerrar el acceso sin entrar responde false', async () => {
  const respuesta = useSolicitudAcceso.getState().abrir(null);
  useSolicitudAcceso.getState().terminar(false);
  await expect(respuesta).resolves.toBe(false);
});

test('una solicitud nueva cancela la anterior, que responde false', async () => {
  const primera = useSolicitudAcceso.getState().abrir('primera');
  const segunda = useSolicitudAcceso.getState().abrir('segunda');

  await expect(primera).resolves.toBe(false);
  useSesion.setState({ estado: 'autenticado' });
  await expect(segunda).resolves.toBe(true);
});

test('renovar una sesión que ya estaba autenticada no resuelve nada de nuevo', () => {
  useSesion.setState({ estado: 'autenticado' });
  const resolver = jest.fn();
  useSolicitudAcceso.setState({ motivo: null, resolver });

  useSesion.setState({ accessToken: 'otro-token' }); // sigue 'autenticado'

  expect(resolver).not.toHaveBeenCalled();
});
