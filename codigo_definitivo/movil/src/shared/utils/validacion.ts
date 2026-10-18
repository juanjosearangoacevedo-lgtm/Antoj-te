// Validación en el teléfono, para avisar al instante sin ir al servidor. Son las
// MISMAS reglas del backend (backend/src/validators/app/auth.validator.js); el
// servidor vuelve a comprobarlo todo, esto solo ahorra una ida y vuelta.

export const MIN_PASSWORD = 8;

export const normalizarCorreo = (valor: string): string => valor.trim().toLowerCase();

export function errorCorreo(valor: string): string | null {
  const correo = normalizarCorreo(valor);
  if (!correo) return 'Escribe tu correo';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return 'El correo no tiene un formato válido';
  return null;
}

export function errorNombre(valor: string): string | null {
  return valor.trim().length < 2 ? 'Escribe tu nombre' : null;
}

export function errorPasswordNueva(valor: string): string | null {
  return valor.length < MIN_PASSWORD ? `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` : null;
}

// Opcional: vacío es válido.
export function errorTelefono(valor: string): string | null {
  const telefono = valor.trim();
  if (!telefono) return null;
  return /^\+?[0-9][0-9\s-]{5,}[0-9]$/.test(telefono) && telefono.length <= 30
    ? null
    : 'El teléfono solo puede tener números, espacios y guiones';
}

export function errorCodigo(valor: string): string | null {
  return /^\d{6}$/.test(valor.trim()) ? null : 'El código tiene 6 dígitos';
}
