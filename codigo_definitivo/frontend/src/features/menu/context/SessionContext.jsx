import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/features/menu/services/menu.api';
import { setMoneda } from '@/shared/utils/formato';
import { aplicarTema } from '@/shared/tema/aplicarTema';
import { MESA_DEMO } from '@/features/menu/data/mock';
import { uuidV4 } from '@/shared/utils/uuid';

const SessionContext = createContext(null);

function getQrTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('mesa') || 'demo';
}

function getOrCreateSesionToken() {
  const KEY = 'menu_sesion_token';
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = uuidV4();
    localStorage.setItem(KEY, token);
  }
  return token;
}

// `slug` llega solo desde /r/:slug. Su presencia es lo que convierte la
// experiencia en vitrina: misma carta, mismo feed, mismo tema, pero sin mesa —y
// por tanto sin carrito, porque un pedido necesita saber a qué mesa llevarlo.
export function SessionProvider({ children, slug = null }) {
  const esVitrina = Boolean(slug);
  const [qrToken] = useState(getQrTokenFromUrl);
  const [sesionToken] = useState(getOrCreateSesionToken);
  const [mesa, setMesa] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  // El restaurante existe pero no está atendiendo por Antojate (suspendido, o su
  // membresía venció y pasó la gracia). El QR impreso sigue en la mesa: hay que
  // decirle al comensal que la carta no está, no enseñarle una carta vacía.
  const [noDisponible, setNoDisponible] = useState(false);
  const [cargando, setCargando] = useState(true);
  // Features del plan del restaurante (feature flags). En demo se muestran todas.
  const [features, setFeatures] = useState(['menu', 'personalizacion', 'carrito', 'kds']);
  const [tema, setTema] = useState(null);
  const [carritoReal, setCarritoReal] = useState({ detalles: [], total: 0 });
  const [carritoDemo, setCarritoDemo] = useState({ detalles: [], total: 0 });

  const recalcularTotalDemo = (detalles) =>
    Number(detalles.reduce((acc, d) => acc + d.precio_linea, 0).toFixed(2));

  const agregarItemDemo = useCallback((item) => {
    setCarritoDemo((prev) => {
      const detalles = [...prev.detalles, item];
      return { detalles, total: recalcularTotalDemo(detalles) };
    });
  }, []);

  const actualizarItemDemo = useCallback((detalleId, cantidad) => {
    setCarritoDemo((prev) => {
      const detalles = prev.detalles.map((d) =>
        d.id === detalleId
          ? { ...d, cantidad, precio_linea: Number(((d.precio_linea / d.cantidad) * cantidad).toFixed(2)) }
          : d
      );
      return { detalles, total: recalcularTotalDemo(detalles) };
    });
  }, []);

  const eliminarItemDemo = useCallback((detalleId) => {
    setCarritoDemo((prev) => {
      const detalles = prev.detalles.filter((d) => d.id !== detalleId);
      return { detalles, total: recalcularTotalDemo(detalles) };
    });
  }, []);

  const vaciarCarritoDemo = useCallback(() => setCarritoDemo({ detalles: [], total: 0 }), []);

  const refrescarCarrito = useCallback(async () => {
    if (demoMode) return;
    try {
      const data = await api.obtenerCarrito(qrToken, sesionToken);
      setCarritoReal(data);
    } catch {
      /* silencioso: el carrito puede estar vacio aun */
    }
  }, [qrToken, sesionToken, demoMode]);

  useEffect(() => {
    (async () => {
      // Vitrina: una sola petición, porque no hay mesa que resolver. El objeto
      // `mesa` se rellena igual con el nombre del restaurante para que el resto
      // de la pantalla —título, bienvenida, cabecera— no tenga que saber por
      // dónde entró el visitante.
      if (esVitrina) {
        try {
          const config = await api.configPorSlug(slug);
          setMesa({
            restaurante_id: config.restaurante.id,
            restaurante_nombre: config.restaurante.nombre,
            logo_url: config.restaurante.logo_url,
            ciudad: config.restaurante.ciudad,
          });
          setFeatures(config.features || []);
          setTema(config.tema);
          aplicarTema(config.tema);
          setMoneda(config.restaurante?.moneda);
          setDemoMode(false);
        } catch {
          // Aquí NO se cae al modo demo: enseñar una carta inventada bajo la URL
          // de un restaurante real sería mentir. Se deja sin carta y la pantalla
          // muestra su aviso de no encontrado.
          setMesa(null);
          setDemoMode(false);
        } finally {
          setCargando(false);
        }
        return;
      }

      try {
        const data = await api.resolverMesa(qrToken);
        setMesa(data);
        setDemoMode(false);
        // Config del restaurante: features del plan + tema visual
        try {
          const config = await api.configRestaurante(qrToken);
          setFeatures(config.features || []);
          setTema(config.tema);
          aplicarTema(config.tema);
          setMoneda(config.restaurante?.moneda); // precios en la moneda del restaurante
        } catch (err) {
          // 403 = el restaurante no está activo. Cualquier otro fallo se ignora
          // como antes (backend antiguo sin /config: se asumen todas las features).
          if (err?.status === 403) setNoDisponible(true);
        }
      } catch {
        setMesa(MESA_DEMO);
        setDemoMode(true);
      } finally {
        setCargando(false);
      }
    })();
  }, [qrToken, slug, esVitrina]);

  useEffect(() => {
    if (!cargando && !demoMode && !esVitrina) refrescarCarrito();
  }, [cargando, demoMode, esVitrina, refrescarCarrito]);

  // La carta se pide por slug o por token según cómo se entró. Vive aquí y no en
  // MenuPage para que la pantalla no tenga que saber de las dos puertas.
  const cargarFeed = useCallback(
    () => (esVitrina ? api.feedPorSlug(slug) : api.feedMenu(qrToken)),
    [esVitrina, slug, qrToken]
  );

  // La vitrina NO manda eventos, y no es un olvido: `analiticas_eventos_video`
  // exige `sucursal_id`, y quien entra por /r/ no viene por ninguna sucursal.
  // Inventarle una (la primera del restaurante, por ejemplo) metería visitas de
  // Instagram dentro de las cifras de un local concreto y ensuciaría su embudo.
  // Medir la vitrina aparte pide su propia columna; hasta entonces, no se mide.
  const registrarEvento = useCallback(
    (payload) => {
      if (demoMode || esVitrina || !mesa?.sucursal_id) return;
      api
        .registrarEvento({ sucursal_id: mesa.sucursal_id, sesion_token: sesionToken, ...payload })
        .catch(() => {});
    },
    [demoMode, esVitrina, mesa, sesionToken]
  );

  // Una visita al menú. Sin esto no hay forma de contar cuánta gente abrió la carta:
  // los demás eventos cuelgan de un plato y solo cuentan a quien llegó a mirar uno.
  // Se dispara al resolverse la mesa, que ocurre una sola vez por carga.
  useEffect(() => {
    if (!mesa || demoMode) return;
    registrarEvento({ tipo_evento: 'menu_abierto' });
  }, [mesa, demoMode, registrarEvento]);

  const value = useMemo(
    () => ({
      qrToken,
      sesionToken,
      mesa,
      demoMode,
      cargando,
      noDisponible,
      features,
      tema,
      esVitrina,
      slug,
      cargarFeed,
      // En la vitrina NUNCA se puede pedir, aunque el plan incluya carrito: no hay
      // mesa a la que llevar el pedido. Toda la interfaz de carrito de MenuPage
      // cuelga de este booleano, así que con esto desaparece entera.
      puedeOrdenar: !esVitrina && features.includes('carrito'),
      carrito: demoMode ? carritoDemo : carritoReal,
      refrescarCarrito,
      registrarEvento,
      agregarItemDemo,
      actualizarItemDemo,
      eliminarItemDemo,
      vaciarCarritoDemo,
    }),
    [
      qrToken,
      sesionToken,
      mesa,
      demoMode,
      cargando,
      noDisponible,
      features,
      tema,
      esVitrina,
      slug,
      cargarFeed,
      carritoDemo,
      carritoReal,
      refrescarCarrito,
      registrarEvento,
      agregarItemDemo,
      actualizarItemDemo,
      eliminarItemDemo,
      vaciarCarritoDemo,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// El hook de lectura vive en features/menu/hooks/useSession.js
export { SessionContext };
