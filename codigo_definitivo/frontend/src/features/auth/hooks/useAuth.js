import { useContext } from 'react';
import { AuthContext } from '@/features/auth/context/AuthContext';

// Sesión del staff: usuario, plan contratado, features habilitadas y login/logout.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
