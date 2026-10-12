import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useSearchParams, useParams } from 'react-router-dom';

import LandingPage from '@/features/landing/pages/LandingPage';
import RequireAuth from '@/features/auth/components/RequireAuth';
import SoloSuper from '@/features/auth/components/SoloSuper';
import SoloRestaurante from '@/features/auth/components/SoloRestaurante';
import PantallaCargando from '@/shared/components/PantallaCargando';
import { ROLES_PANEL, ROLES_OPERACION } from '@/shared/constants/roles';

// La landing viaja en el paquete inicial: es la ruta '/', la que recibe a quien
// llega desde un buscador y la que tiene que pintar sin esperar una segunda
// descarga. Todo lo demás se pide al visitarlo.
//
// Sin esto los tres públicos cargaban el código de los otros dos: el comensal
// bajaba el generador de QR y el subidor de video del panel, y quien abría la
// landing bajaba el reproductor (hls.js) del menú.
const MenuRoute = lazy(() => import('@/features/menu/pages/MenuRoute'));
const VitrinaRoute = lazy(() => import('@/features/menu/pages/VitrinaRoute'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RecuperarPage = lazy(() => import('@/features/auth/pages/RecuperarPage'));
const RestablecerPage = lazy(() => import('@/features/auth/pages/RestablecerPage'));
const CocinaPage = lazy(() => import('@/features/cocina/pages/CocinaPage'));

// Páginas de contenido. Van diferidas porque su texto pesa lo suyo y quien
// entra a la portada no lo necesita. El HTML ya escrito por el build se ve
// mientras llega el trozo, así que la espera no deja la pantalla en blanco de
// verdad: por eso su Suspense no lleva pantalla de carga (ver `SIN_ESPERA`).
const PaginaContenido = lazy(() => import('@/features/contenido/pages/PaginaContenido'));
const GuiasIndex = lazy(() => import('@/features/contenido/pages/GuiasIndex'));
const DirectorioRoute = lazy(() => import('@/features/contenido/pages/DirectorioRoute'));
const NoEncontrado = lazy(() => import('@/features/contenido/pages/NoEncontrado'));

const AdminLayout = lazy(() => import('@/features/admin/layout/AdminLayout'));
const AdminIndex = lazy(() => import('@/features/admin/pages/AdminIndex'));
const RestaurantesPage = lazy(() => import('@/features/admin/restaurantes/pages/RestaurantesPage'));
const PlanesPage = lazy(() => import('@/features/admin/planes/pages/PlanesPage'));
const SolicitudesPage = lazy(() => import('@/features/admin/solicitudes/pages/SolicitudesPage'));
const UsuariosPage = lazy(() => import('@/features/admin/usuarios/pages/UsuariosPage'));
const CategoriasPage = lazy(() => import('@/features/admin/categorias/pages/CategoriasPage'));
const PlatosPage = lazy(() => import('@/features/admin/platos/pages/PlatosPage'));
const PersonalizacionPage = lazy(() => import('@/features/admin/personalizacion/pages/PersonalizacionPage'));
const MesasPage = lazy(() => import('@/features/admin/mesas/pages/MesasPage'));
const AnaliticasPage = lazy(() => import('@/features/admin/analiticas/pages/AnaliticasPage'));
const SuscripcionPage = lazy(() => import('@/features/admin/suscripcion/pages/SuscripcionPage'));

// Espera del comensal: negro a pantalla completa, igual que el fondo del menú,
// para que la transición no sea un destello blanco antes del video.
const EsperaComensal = () => (
  <div className="h-[100dvh] bg-black" role="status" aria-label="Cargando menú" />
);

// Envuelve un elemento diferido con su pantalla de espera. React exige un
// Suspense por encima de cualquier lazy: sin él, la primera visita a la ruta
// revienta en vez de esperar al trozo.
const conEspera = (elemento, respaldo = <PantallaCargando />) => (
  <Suspense fallback={respaldo}>{elemento}</Suspense>
);

// Para las páginas que el build ya entregó escritas: enseñar una pantalla de
// carga encima de un contenido que YA se está leyendo es peor que no enseñar
// nada durante los pocos milisegundos que tarda el trozo.
const SIN_ESPERA = null;

// /guias/:slug y las páginas de producto comparten componente; lo único que
// cambia es de dónde sale el slug.
function GuiaRoute() {
  return <PaginaContenido slug={useParams().slug} />;
}

// La raíz es la landing pública, pero los QR impresos antes de esta versión
// apuntan a /?mesa=<token>: si llega ese parámetro, lo mandamos al menú.
function RaizPublica() {
  const [params] = useSearchParams();
  const mesa = params.get('mesa');
  if (mesa) return <Navigate to={`/menu?mesa=${encodeURIComponent(mesa)}`} replace />;
  return <LandingPage />;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* --- Público --- */}
      <Route path="/" element={<RaizPublica />} />
      <Route path="/menu" element={conEspera(<MenuRoute />, <EsperaComensal />)} />
      {/* Carta pública del restaurante, para compartir e indexar. En producción
          Nginx manda esta ruta al backend, que devuelve el HTML ya escrito; React
          lo sustituye al montar y a partir de ahí la experiencia es la de siempre. */}
      <Route path="/r/:slug" element={conEspera(<VitrinaRoute />, <EsperaComensal />)} />

      {/* --- Contenido indexable ---
          Estas rutas también existen como HTML estático en dist/ (las escribe
          el plugin seoEstatico de vite.config.js). Nginx sirve ese archivo y
          React se monta encima; las rutas de aquí son las que hacen que la
          navegación DENTRO de la SPA no tenga que recargar la página. */}
      <Route
        path="/menu-digital-con-video"
        element={conEspera(<PaginaContenido slug="menu-digital-con-video" />, SIN_ESPERA)}
      />
      <Route
        path="/menu-qr-para-restaurantes"
        element={conEspera(<PaginaContenido slug="menu-qr-para-restaurantes" />, SIN_ESPERA)}
      />
      <Route path="/guias" element={conEspera(<GuiasIndex />, SIN_ESPERA)} />
      <Route path="/guias/:slug" element={conEspera(<GuiaRoute />, SIN_ESPERA)} />
      <Route path="/restaurantes" element={conEspera(<DirectorioRoute />, SIN_ESPERA)} />
      <Route path="/restaurantes/:ciudad" element={conEspera(<DirectorioRoute />, SIN_ESPERA)} />

      {/* --- Autenticación --- */}
      <Route path="/login" element={conEspera(<LoginPage />)} />
      <Route path="/recuperar" element={conEspera(<RecuperarPage />)} />
      <Route path="/restablecer" element={conEspera(<RestablecerPage />)} />

      {/* --- Panel administrativo (comparte AdminLayout) --- */}
      {/* Las hijas no llevan Suspense propio: el de AdminLayout rodea al Outlet,
          así al cambiar de sección el sidebar y la cabecera no parpadean. */}
      <Route path="/admin" element={conEspera(<AdminLayout />)}>
        <Route index element={<AdminIndex />} />
        {/* Solo plataforma */}
        <Route path="restaurantes" element={<SoloSuper><RestaurantesPage /></SoloSuper>} />
        <Route path="planes" element={<SoloSuper><PlanesPage /></SoloSuper>} />
        <Route path="solicitudes" element={<SoloSuper><SolicitudesPage /></SoloSuper>} />
        {/* Compartidas / restaurante */}
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="analiticas" element={<AnaliticasPage />} />
        <Route path="categorias" element={<CategoriasPage />} />
        <Route path="platos" element={<PlatosPage />} />
        <Route path="personalizacion" element={<PersonalizacionPage />} />
        <Route path="mesas" element={<MesasPage />} />
        {/* Solo restaurante: el superadmin no tiene membresía que pagar */}
        <Route path="suscripcion" element={<SoloRestaurante><SuscripcionPage /></SoloRestaurante>} />
      </Route>

      {/* --- Cocina (sin sidebar: pantalla de operación) --- */}
      <Route
        path="/cocina"
        element={conEspera(
          <RequireAuth roles={[...ROLES_PANEL, ...ROLES_OPERACION]}>
            <CocinaPage />
          </RequireAuth>,
        )}
      />

      {/* Antes esto era un <Navigate to="/">. Mandaba a la portada al visitante
          que pedía una dirección que no existe, sin decirle nada, y —peor— hacía
          que el servidor respondiera 200 a cualquier URL inventada: soft 404, y
          el índice de Google acaba lleno de direcciones que nunca existieron.
          Ahora Nginx devuelve un 404 de verdad y esto explica qué pasó. */}
      <Route path="*" element={conEspera(<NoEncontrado />, SIN_ESPERA)} />
    </Routes>
  );
}
