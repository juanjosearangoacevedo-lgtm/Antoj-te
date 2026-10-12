import { useParams } from 'react-router-dom';
import { SessionProvider } from '@/features/menu/context/SessionContext';
import MenuPage from '@/features/menu/pages/MenuPage';

// Vitrina pública: /r/:slug. Es la MISMA pantalla del comensal, con el mismo feed
// y el mismo tema; lo único que cambia es que entra por el slug del restaurante y
// no por el token de una mesa, y que por eso no hay carrito.
//
// Se reutiliza MenuPage entera a propósito: una segunda pantalla "de solo mirar"
// se quedaría atrás en cuanto el menú real cambiara.
//
// El HTML que ve un buscador NO lo genera este archivo: lo entrega ya escrito el
// backend (backend/src/services/seo.service.js), y React lo reemplaza al montar.
export default function VitrinaRoute() {
  const { slug } = useParams();

  return (
    <SessionProvider slug={slug}>
      <MenuPage />
    </SessionProvider>
  );
}
