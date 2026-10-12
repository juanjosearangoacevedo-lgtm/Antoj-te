import { UtensilsCrossed } from 'lucide-react';
import TemaToggle from '@/shared/components/TemaToggle';

// Marco común de las pantallas sin sesión: entrar, recuperar y restablecer la
// contraseña. Así las tres se ven como una sola cosa y no como tres inventos.
export default function PantallaAcceso({ subtitulo, children, pie }) {
  return (
    <div className="superficie-plataforma relative min-h-[100dvh] grid place-items-center bg-base px-4">
      <div className="absolute top-4 right-4">
        <TemaToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-accent-soft mb-4">
            <UtensilsCrossed className="text-amber" size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-cream">Bitemo</h1>
          <p className="text-muted text-sm mt-1">{subtitulo}</p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm">{children}</div>

        <div className="text-center text-xs text-muted mt-6">
          {pie ?? 'Visual commerce para restaurantes modernos.'}
        </div>
      </div>
    </div>
  );
}
