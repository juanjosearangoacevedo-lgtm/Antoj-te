import { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconBtn } from './IconBtn';

export function Modal({ abierto, titulo, onCerrar, children }) {
  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCerrar?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="superficie-plataforma relative bg-surface border border-line rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-card animate-scalein">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold tracking-tight text-cream">{titulo}</h2>
          <IconBtn icono={X} etiqueta="Cerrar" onClick={onCerrar} />
        </div>
        {children}
      </div>
    </div>
  );
}
