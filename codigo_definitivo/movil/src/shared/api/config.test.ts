import { resolverUrlApi, URL_PRODUCCION } from './config';

test('la variable de entorno manda sobre todo lo demás, sin barra final', () => {
  expect(
    resolverUrlApi({ variable: 'https://staging.bitemo.co/api/', hostUri: '192.168.1.20:8081', desarrollo: true })
  ).toBe('https://staging.bitemo.co/api');
});

// En desarrollo el teléfono ya llegó al PC por esa IP para bajar el código.
test('en desarrollo usa la IP del servidor de Expo con el puerto del backend', () => {
  expect(resolverUrlApi({ hostUri: '192.168.1.20:8081', desarrollo: true })).toBe('http://192.168.1.20:3000/api');
});

test('fuera de desarrollo nunca apunta a una IP local', () => {
  expect(resolverUrlApi({ hostUri: '192.168.1.20:8081', desarrollo: false })).toBe(URL_PRODUCCION);
  expect(resolverUrlApi({ desarrollo: false })).toBe('https://bitemo.co/api');
});

test('sin variable ni servidor de Expo, producción', () => {
  expect(resolverUrlApi({ hostUri: null, desarrollo: true })).toBe(URL_PRODUCCION);
});
