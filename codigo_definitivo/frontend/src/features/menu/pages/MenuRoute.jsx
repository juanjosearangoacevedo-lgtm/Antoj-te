import { SessionProvider } from '@/features/menu/context/SessionContext';
import MenuPage from '@/features/menu/pages/MenuPage';

// Punto de entrada de /menu como un solo módulo. El router lo importa de forma
// diferida, así que este archivo es la frontera del trozo del comensal: lo que
// cuelgue de aquí (la sesión de mesa, hls.js) no lo descarga quien abre la
// landing ni quien entra al panel.
export default function MenuRoute() {
  return (
    <SessionProvider>
      <MenuPage />
    </SessionProvider>
  );
}
