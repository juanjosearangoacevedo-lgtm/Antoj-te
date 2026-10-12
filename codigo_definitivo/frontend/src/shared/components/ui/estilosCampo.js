// Estilos compartidos por Input, Select y Textarea, para que los tres campos
// se vean y reaccionen igual (hover, foco, inválido, deshabilitado).
export const inputBase =
  'w-full bg-surface border rounded-xl px-3.5 py-2 text-sm text-cream placeholder:text-muted/70 outline-none transition-colors duration-fast ' +
  'hover:border-muted/60 focus:border-amber focus:shadow-[0_0_0_3px_var(--accent-soft)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface2';

export function claseInput(invalido, valido) {
  if (invalido) return `${inputBase} border-danger`;
  if (valido) return `${inputBase} border-ok`;
  return `${inputBase} border-line`;
}
