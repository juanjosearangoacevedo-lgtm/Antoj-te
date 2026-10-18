import { formatearConteo, formatearPrecio, haceCuanto } from './formato';
import {
  errorCodigo,
  errorCorreo,
  errorNombre,
  errorPasswordNueva,
  errorTelefono,
  normalizarCorreo,
} from './validacion';
import { compararVersiones, debeActualizar } from './version';

describe('versiones', () => {
  test('compara por número, no por texto', () => {
    expect(compararVersiones('0.10.0', '0.9.0')).toBe(1);
    expect(compararVersiones('1.2', '1.2.0')).toBe(0);
    expect(compararVersiones('1.2.3', '1.3.0')).toBe(-1);
  });

  test('pide actualizar solo si la versión es menor que la mínima', () => {
    expect(debeActualizar('0.1.0', '0.1.0')).toBe(false);
    expect(debeActualizar('0.1.0', '0.2.0')).toBe(true);
    expect(debeActualizar('1.0.0', '0.9.9')).toBe(false);
  });
});

// Las mismas reglas que el backend (validators/app/auth.validator.js).
describe('validación de formularios', () => {
  test('correo', () => {
    expect(normalizarCorreo('  Ana@Correo.COM ')).toBe('ana@correo.com');
    expect(errorCorreo('ana@correo.com')).toBeNull();
    expect(errorCorreo('')).toBe('Escribe tu correo');
    expect(errorCorreo('ana@correo')).not.toBeNull();
  });

  test('nombre y contraseña', () => {
    expect(errorNombre(' A ')).not.toBeNull();
    expect(errorNombre('Ana')).toBeNull();
    expect(errorPasswordNueva('1234567')).not.toBeNull();
    expect(errorPasswordNueva('12345678')).toBeNull();
  });

  test('teléfono opcional', () => {
    expect(errorTelefono('')).toBeNull();
    expect(errorTelefono('+57 300 123 4567')).toBeNull();
    expect(errorTelefono('llámame')).not.toBeNull();
  });

  test('código de 6 dígitos', () => {
    expect(errorCodigo('012345')).toBeNull();
    expect(errorCodigo('12345')).not.toBeNull();
    expect(errorCodigo('abcdef')).not.toBeNull();
  });
});

describe('formatos', () => {
  test('precio en pesos colombianos con punto de miles', () => {
    expect(formatearPrecio(16000)).toBe('$16.000');
    expect(formatearPrecio(5555.99)).toBe('$5.556');
    expect(formatearPrecio(229900)).toBe('$229.900');
    expect(formatearPrecio(900)).toBe('$900');
  });

  test('contadores cortos, sin redondear hacia arriba', () => {
    expect(formatearConteo(0)).toBe('0');
    expect(formatearConteo(999)).toBe('999');
    expect(formatearConteo(1000)).toBe('1 mil');
    expect(formatearConteo(1290)).toBe('1,2 mil');
    expect(formatearConteo(15400)).toBe('15 mil');
    expect(formatearConteo(2_450_000)).toBe('2,4 M');
  });

  test('hace cuánto, desde los segundos del backend', () => {
    expect(haceCuanto(5)).toBe('ahora');
    expect(haceCuanto(300)).toBe('hace 5 min');
    expect(haceCuanto(3 * 3600)).toBe('hace 3 h');
    expect(haceCuanto(2 * 86400)).toBe('hace 2 d');
    expect(haceCuanto(15 * 86400)).toBe('hace 2 sem');
    expect(haceCuanto(40 * 86400)).toBe('hace 1 mes');
  });
});
