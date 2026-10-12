import { Lock } from 'lucide-react';
import { Card } from './Card';

// Bloqueo visual cuando el plan del restaurante no incluye una funcionalidad
export function FeatureLock({ titulo, descripcion }) {
  return (
    <Card className="text-center py-12">
      <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-accent-soft text-amber mb-4">
        <Lock size={22} />
      </div>
      <h2 className="text-lg font-bold tracking-tight text-cream mb-2">{titulo}</h2>
      <p className="text-muted text-sm max-w-md mx-auto mb-6">{descripcion}</p>
      <p className="text-xs text-muted">
        Contacta al equipo de Bitemo para mejorar tu plan y desbloquear esta funcionalidad.
      </p>
    </Card>
  );
}
