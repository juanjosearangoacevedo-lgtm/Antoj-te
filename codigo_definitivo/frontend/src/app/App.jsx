import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import AppRouter from './router';

// Providers globales de la aplicación. La sesión del comensal (SessionProvider)
// NO va aquí: solo existe dentro de la ruta /menu, que es la única que la usa.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
