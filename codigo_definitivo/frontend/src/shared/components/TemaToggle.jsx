import { Sun, Moon } from 'lucide-react';
import { useTemaStaff } from '@/shared/hooks/useTemaStaff';

// Botón minimalista para alternar tema claro/oscuro del panel.
export default function TemaToggle({ className = '' }) {
  const { tema, alternar } = useTemaStaff();
  const esOscuro = tema === 'oscuro';
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
      className={`inline-grid place-items-center w-9 h-9 rounded-xl text-muted hover:text-cream hover:bg-surface2 transition-colors duration-fast ${className}`}
    >
      {esOscuro ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
