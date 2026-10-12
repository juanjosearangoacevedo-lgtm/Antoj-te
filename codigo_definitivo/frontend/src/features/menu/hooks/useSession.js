import { useContext } from 'react';
import { SessionContext } from '@/features/menu/context/SessionContext';

// Sesión anónima del comensal: mesa resuelta por QR, carrito, tema del
// restaurante y modo demo cuando el backend no responde.
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
}
