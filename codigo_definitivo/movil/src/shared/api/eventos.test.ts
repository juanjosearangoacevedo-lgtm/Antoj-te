// La cola de señales del feed: se juntan y salen por lotes de hasta 50, y un
// lote que falla se pierde sin volver a intentarlo (son señales, no datos).

const mockPedir = jest.fn();
jest.mock('./cliente', () => ({ pedir: (...args: unknown[]) => mockPedir(...args) }));

import { enviarEventos, eventosEnCola, registrarEvento } from './eventos';

beforeEach(() => {
  mockPedir.mockReset();
  jest.useFakeTimers();
});

afterEach(async () => {
  mockPedir.mockResolvedValue(undefined);
  await enviarEventos();
  jest.useRealTimers();
});

test('los eventos esperan y salen juntos en un lote', async () => {
  mockPedir.mockResolvedValue(undefined);
  registrarEvento({ tipo: 'vista', plato_id: 1 });
  registrarEvento({ tipo: 'tiempo_visto', plato_id: 1, valor: 7 });
  expect(mockPedir).not.toHaveBeenCalled();

  await enviarEventos();
  expect(mockPedir).toHaveBeenCalledTimes(1);
  const [ruta, opciones] = mockPedir.mock.calls[0] as [string, { cuerpo: { eventos: unknown[] } }];
  expect(ruta).toBe('/app/v1/eventos');
  expect(opciones.cuerpo.eventos).toHaveLength(2);
  expect(eventosEnCola()).toBe(0);
});

test('más de 50 se mandan en varios lotes', async () => {
  mockPedir.mockResolvedValue(undefined);
  for (let i = 0; i < 120; i++) registrarEvento({ tipo: 'vista', plato_id: i });
  await enviarEventos();
  expect(mockPedir.mock.calls.map(([, o]) => (o as { cuerpo: { eventos: unknown[] } }).cuerpo.eventos.length)).toEqual([50, 50, 20]);
});

test('un lote que falla se pierde y lo demás espera', async () => {
  mockPedir.mockRejectedValueOnce(new Error('sin red'));
  for (let i = 0; i < 60; i++) registrarEvento({ tipo: 'vista', plato_id: i });
  await enviarEventos();
  expect(mockPedir).toHaveBeenCalledTimes(1);
  expect(eventosEnCola()).toBe(10);
});

test('sin red mucho rato, la cola no crece sin límite', () => {
  for (let i = 0; i < 500; i++) registrarEvento({ tipo: 'vista', plato_id: i });
  expect(eventosEnCola()).toBe(200);
});
