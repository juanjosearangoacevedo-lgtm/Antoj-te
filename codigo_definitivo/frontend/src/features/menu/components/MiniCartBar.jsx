import { ShoppingBag } from 'lucide-react';

// Botón flotante del carrito: compacto y anclado a la derecha para no tapar
// el botón "Agregar" del feed (que vive en la esquina inferior izquierda).
export default function MiniCartBar({ cantidadItems, total, onAbrir }) {
  if (cantidadItems === 0) return null;
  return (
    <button
      onClick={onAbrir}
      aria-label={`Ver carrito: ${cantidadItems} ${cantidadItems === 1 ? 'producto' : 'productos'}`}
      className="fixed bottom-6 right-4 z-40 grid place-items-center w-14 h-14 rounded-full bg-amber text-botontxt shadow-card active:scale-95 transition-transform animate-risein"
    >
      <ShoppingBag className="w-6 h-6" />
      <span className="absolute -top-1 -right-1 grid place-items-center min-w-[22px] h-[22px] px-1 rounded-full bg-[var(--c-boton-texto)] text-amber text-[11px] font-bold">
        {cantidadItems}
      </span>
    </button>
  );
}
