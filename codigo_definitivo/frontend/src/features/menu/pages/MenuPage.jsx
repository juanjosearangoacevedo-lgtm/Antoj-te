import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/features/menu/hooks/useSession';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { formatoMoneda, monedaActiva } from '@/shared/utils/formato';
import { api } from '@/features/menu/services/menu.api';
import { CATEGORIAS_DEMO, PLATOS_DEMO } from '@/features/menu/data/mock';
import {
  construirGrupos,
  delChef,
  filtrar,
  opcionesElegibles,
  seleccionVigente,
} from '@/features/menu/logica/antojos';

import Welcome, { LLAMADO } from '@/features/menu/components/Welcome';
import CategoryPicker from '@/features/menu/components/CategoryPicker';
import VideoFeed from '@/features/menu/components/VideoFeed';
import DishInfoSheet from '@/features/menu/components/DishInfoSheet';
import AddToCartSheet from '@/features/menu/components/AddToCartSheet';
import MiniCartBar from '@/features/menu/components/MiniCartBar';
import CartView from '@/features/menu/components/CartView';
import OrderTracking from '@/features/menu/components/OrderTracking';
import HojaAntojate from '@/features/menu/components/HojaAntojate';

const VISTAS = {
  WELCOME: 'welcome',
  CATEGORIAS: 'categorias',
  FEED: 'feed',
  CARRITO: 'carrito',
  SEGUIMIENTO: 'seguimiento',
};

// Plato al que apunta un enlace compartido (/menu?mesa=…&plato=N). Se lee una
// sola vez al montar: después el comensal navega y la URL deja de mandar.
function platoDeLaUrl() {
  return new URLSearchParams(window.location.search).get('plato');
}

export default function MenuPage() {
  const { mesa, demoMode, cargando, noDisponible, qrToken, sesionToken, carrito, puedeOrdenar, tema, esVitrina, cargarFeed, refrescarCarrito, registrarEvento, agregarItemDemo, actualizarItemDemo, eliminarItemDemo, vaciarCarritoDemo } = useSession();

  const [vista, setVista] = useState(VISTAS.WELCOME);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [platosTodos, setPlatosTodos] = useState([]);
  const [favoritosIds, setFavoritosIds] = useState(new Set());
  const [busqueda, setBusqueda] = useState('');

  const [platoInfo, setPlatoInfo] = useState(null);
  const [tipoInfo, setTipoInfo] = useState(null);
  const [platoAAgregar, setPlatoAAgregar] = useState(null);
  const [pedidoActivo, setPedidoActivo] = useState(null);

  const [platoCompartido] = useState(platoDeLaUrl);
  const compartidoAplicado = useRef(false);
  const [estadoLlamado, setEstadoLlamado] = useState(LLAMADO.LISTO);

  // Lo que el comensal eligió con ANTOJATE. Vive aquí y no en la carta para que
  // siga igual al ir y volver entre la carta, el feed y el carrito.
  const [antojos, setAntojos] = useState([]);
  const [hojaAntojateAbierta, setHojaAntojateAbierta] = useState(false);
  // El feed abierto desde una tarjeta: desliza por esa lista (los resultados del
  // antojo o los recomendados del chef) y arranca en el plato tocado.
  const [secuencia, setSecuencia] = useState(null);
  const [platoInicial, setPlatoInicial] = useState(null);

  // En la pestaña va la marca del restaurante, no la de Antojate.
  useTituloPagina(mesa?.restaurante_nombre ? `${mesa.restaurante_nombre} · Menú` : null);

  useEffect(() => {
    if (cargando || !mesa) return;
    if (demoMode) {
      setCategorias(CATEGORIAS_DEMO);
      setPlatosTodos(PLATOS_DEMO);
      return;
    }
    cargarFeed()
      .then((platos) => {
        setPlatosTodos(platos);
        const cats = Array.from(new Set(platos.map((p) => p.categoria))).map((nombre, i) => ({
          id: i + 1,
          nombre,
        }));
        setCategorias(cats);
      })
      .catch(() => {
        // En la vitrina no se cae a la carta de demostración: bajo la URL de un
        // restaurante real, enseñar platos inventados sería engañar a quien llegó
        // desde un buscador.
        if (esVitrina) return;
        setCategorias(CATEGORIAS_DEMO);
        setPlatosTodos(PLATOS_DEMO);
      });
  }, [cargando, mesa, demoMode, esVitrina, cargarFeed]);

  // Enlace compartido: en cuanto hay carta, se salta la bienvenida y el
  // selector de categorías y se entra al feed de la categoría de ese plato.
  // Quien recibe un enlace quiere ver ESE plato, no el menú desde el principio.
  useEffect(() => {
    if (compartidoAplicado.current || !platoCompartido || !platosTodos.length) return;
    const plato = platosTodos.find((p) => String(p.id) === String(platoCompartido));
    compartidoAplicado.current = true; // aunque no exista: no se reintenta
    if (!plato) return;
    setCategoriaActiva({ id: plato.categoria_id, nombre: plato.categoria });
    setVista(VISTAS.FEED);
  }, [platoCompartido, platosTodos]);

  // ANTOJATE: las opciones salen de la carta real; lo guardado que ya no existe
  // (una categoría que el restaurante quitó) no cuenta.
  const grupos = useMemo(
    () => construirGrupos(platosTodos, { moneda: monedaActiva(), formatear: (v) => formatoMoneda(v) }),
    [platosTodos]
  );
  const etiquetasAntojos = useMemo(() => opcionesElegibles(grupos), [grupos]);
  const antojosActivos = useMemo(() => seleccionVigente(antojos, etiquetasAntojos), [antojos, etiquetasAntojos]);
  const resultadosAntojo = useMemo(() => filtrar(platosTodos, antojosActivos), [platosTodos, antojosActivos]);
  const recomendadosChef = useMemo(() => delChef(platosTodos), [platosTodos]);

  const q = busqueda.trim().toLowerCase();
  // El feed muestra, en este orden: la lista desde la que se tocó un plato, los
  // resultados de búsqueda si hay término, o la categoría activa.
  const platosDelFeed = secuencia
    ? secuencia.platos
    : q
    ? platosTodos.filter((p) => `${p.nombre} ${p.descripcion || ''}`.toLowerCase().includes(q))
    : categoriaActiva
    ? platosTodos.filter((p) => p.categoria === categoriaActiva.nombre)
    : [];

  const abrirCategoria = (cat) => {
    setBusqueda('');
    setSecuencia(null);
    setPlatoInicial(null);
    setCategoriaActiva(cat);
    setVista(VISTAS.FEED);
  };

  // Desde la búsqueda, el feed arranca en el plato que se tocó, no en el primero.
  const verResultadosBusqueda = (plato) => {
    setSecuencia(null);
    setPlatoInicial(plato?.id ?? null);
    setCategoriaActiva(null);
    setVista(VISTAS.FEED);
  };

  // Desde una tarjeta: el feed desliza por esa misma lista y arranca en el plato.
  const abrirPlato = (plato, lista, titulo) => {
    setBusqueda('');
    setSecuencia({ platos: lista, titulo });
    setPlatoInicial(plato.id);
    setVista(VISTAS.FEED);
  };

  // Vuelve a la pantalla de la que se vino. La búsqueda se conserva: si el feed
  // se abrió desde los resultados, se regresa a esos mismos resultados (abrir una
  // categoría o una tarjeta ya la limpia, así que en esos casos llega vacía).
  const volverALaCarta = () => {
    setSecuencia(null);
    setPlatoInicial(null);
    setVista(VISTAS.CATEGORIAS);
  };

  const toggleFavorito = useCallback(
    async (plato) => {
      // Se calcula antes de invertirlo: el evento solo tiene sentido al MARCAR.
      // Contando también el "quitar favorito", un plato que gusta y otro que se
      // marca y se desmarca sin parar daban la misma cifra.
      const marcando = !favoritosIds.has(plato.id);

      setFavoritosIds((prev) => {
        const next = new Set(prev);
        if (next.has(plato.id)) next.delete(plato.id);
        else next.add(plato.id);
        return next;
      });
      if (demoMode) return;
      try {
        await api.toggleFavorito({ sesion_token: sesionToken, plato_id: plato.id });
        if (marcando) registrarEvento({ plato_id: plato.id, tipo_evento: 'click_favorito' });
      } catch {
        /* silencioso */
      }
    },
    [demoMode, sesionToken, registrarEvento, favoritosIds]
  );

  // El estado del llamado vive aquí y no en Welcome: esa pantalla se desmonta al
  // entrar al menú, y como ahora se puede volver a ella, guardarlo dentro haría
  // que el botón se viera intacto aunque el mesero siguiera sin llegar.
  //
  // En demo no hay a quién avisar: se simula para que el botón se pueda mostrar
  // sin escribir llamados de mentira en la base de un restaurante.
  const llamarMesero = useCallback(async () => {
    setEstadoLlamado(LLAMADO.ENVIANDO);
    try {
      if (!demoMode) await api.llamarMesero(qrToken, { sesion_token: sesionToken });
      // No vuelve a 'listo': el llamado sigue vivo hasta que alguien lo atiende,
      // y un botón que se rearma invita a llamar otra vez sin necesidad.
      setEstadoLlamado(LLAMADO.AVISADO);
    } catch {
      setEstadoLlamado(LLAMADO.ERROR);
    }
  }, [demoMode, qrToken, sesionToken]);

  const abrirInfo = (plato, tipo) => {
    setPlatoInfo(plato);
    setTipoInfo(tipo);
    // El paso del video a la ficha: es lo que separa "lo vio pasar" de "le interesó".
    registrarEvento({ plato_id: plato.id, tipo_evento: 'ver_ficha' });
  };

  const agregarAlCarritoDesdeInfo = async (plato) => {
    setPlatoInfo(null);
    setPlatoAAgregar(plato);
  };

  const confirmarAgregarCarrito = async (payload) => {
    if (demoMode) {
      const plato = platosTodos.find((p) => p.id === payload.plato_id);
      agregarItemDemo({
        id: Date.now(),
        plato_id: plato.id,
        plato_nombre: plato.nombre,
        plato_precio: plato.precio,
        cantidad: payload.cantidad,
        notas_instrucciones: payload.notas_instrucciones,
        modificadores: [],
        precio_linea: Number((plato.precio * payload.cantidad).toFixed(2)),
      });
      return;
    }
    await api.agregarAlCarrito(qrToken, { sesion_token: sesionToken, ...payload });
    await refrescarCarrito();
  };

  const actualizarCantidadCarrito = async (detalle, nuevaCantidad) => {
    if (demoMode) {
      actualizarItemDemo(detalle.id, nuevaCantidad);
      return;
    }
    await api.actualizarLinea(detalle.id, { sesion_token: sesionToken, cantidad: nuevaCantidad });
    await refrescarCarrito();
  };

  const eliminarDelCarrito = async (detalle) => {
    if (demoMode) {
      eliminarItemDemo(detalle.id);
      return;
    }
    await api.eliminarLinea(detalle.id, sesionToken);
    await refrescarCarrito();
  };

  const enviarPedido = async (observaciones) => {
    if (demoMode) {
      setPedidoActivo({ id: Math.floor(Math.random() * 9000) + 1000, estado: 'Recibido', total: carrito.total });
      vaciarCarritoDemo();
      setVista(VISTAS.SEGUIMIENTO);
      return;
    }
    // `compra_exitosa` ya NO se registra aquí: lo hace el backend dentro de la
    // transacción del pedido, así que no se pierde si esta pestaña se cierra.
    const pedido = await api.checkout(qrToken, { sesion_token: sesionToken, observaciones });
    await refrescarCarrito();
    setPedidoActivo(pedido);
    setVista(VISTAS.SEGUIMIENTO);
  };

  if (cargando) {
    return (
      <div className="h-[100dvh] grid place-items-center bg-base">
        <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    );
  }

  // QR de un restaurante que no está atendiendo por Antojate (suspendido, o su
  // membresía venció y pasó la gracia). El comensal no tiene la culpa: se le dice
  // con claridad, sin mencionar pagos, y se le sugiere pedir la carta en persona.
  if (noDisponible) {
    return (
      <div className="h-[100dvh] grid place-items-center bg-base px-8 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream mb-3">Carta no disponible</h1>
          <p className="text-muted text-sm leading-relaxed max-w-sm">
            {mesa?.restaurante_nombre ? `La carta digital de ${mesa.restaurante_nombre}` : 'Esta carta digital'} no
            está disponible en este momento. Pide la carta al personal del restaurante.
          </p>
        </div>
      </div>
    );
  }

  // Vitrina con slug que no existe (enlace viejo, restaurante dado de baja). No
  // hay carta que enseñar, así que se dice y se ofrece la salida.
  if (esVitrina && !mesa) {
    return (
      <div className="h-[100dvh] grid place-items-center bg-base px-8 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream mb-3">Carta no disponible</h1>
          <p className="text-muted text-sm leading-relaxed max-w-sm">
            Este restaurante no tiene una carta pública en Antojate, o cambió su dirección.
          </p>
          <a href="/" className="inline-block mt-6 text-sm font-semibold text-amber hover:underline">
            Ir a Antojate
          </a>
        </div>
      </div>
    );
  }

  const cantidadItemsCarrito = carrito?.detalles?.length || 0;
  const totalCarrito = carrito?.total || 0;

  return (
    <div className="font-body">
      {demoMode && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber text-botontxt text-center text-[11px] font-semibold py-1">
          Modo demo — conecta el backend para datos reales
        </div>
      )}

      {/* Quien llega por /r/ no está en el restaurante: hay que decirle cómo se
          pide de verdad, o se quedará esperando un botón que no va a aparecer. */}
      {esVitrina && (
        <div className="fixed bottom-0 left-0 right-0 z-[55] bg-surface border-t border-line px-5 py-3 text-center">
          <p className="text-[13px] text-muted leading-snug">
            Estás viendo la carta.{' '}
            <span className="text-cream font-semibold">Escanea el QR de tu mesa para pedir.</span>
          </p>
        </div>
      )}

      {vista === VISTAS.WELCOME && (
        <Welcome
          mesa={mesa}
          tema={tema}
          esVitrina={esVitrina}
          onContinuar={() => setVista(VISTAS.CATEGORIAS)}
          onLlamarMesero={llamarMesero}
          llamado={estadoLlamado}
        />
      )}

      {vista === VISTAS.CATEGORIAS && (
        <>
          <CategoryPicker
            categorias={categorias}
            platos={platosTodos}
            busqueda={busqueda}
            onBuscar={setBusqueda}
            onSeleccionar={abrirCategoria}
            onVerResultados={verResultadosBusqueda}
            mesa={mesa}
            layout={tema?.layout_categorias}
            previaCategoria={tema?.preview_categoria}
            onVolverInicio={() => {
              setBusqueda('');
              setVista(VISTAS.WELCOME);
            }}
            antojos={antojosActivos}
            etiquetasAntojos={etiquetasAntojos}
            resultadosAntojo={resultadosAntojo}
            recomendadosChef={recomendadosChef}
            onAbrirAntojate={platosTodos.length ? () => setHojaAntojateAbierta(true) : null}
            onQuitarAntojo={(id) => setAntojos((a) => a.filter((x) => x !== id))}
            onLimpiarAntojos={() => setAntojos([])}
            onAbrirPlato={abrirPlato}
          />
          {puedeOrdenar && (
            <MiniCartBar
              cantidadItems={cantidadItemsCarrito}
              total={totalCarrito}
              onAbrir={() => setVista(VISTAS.CARRITO)}
            />
          )}
        </>
      )}

      {vista === VISTAS.FEED && (
        <>
          <VideoFeed
            platos={platosDelFeed}
            categoriaNombre={
              secuencia ? secuencia.titulo : q ? `Resultados: “${busqueda.trim()}”` : categoriaActiva?.nombre
            }
            favoritosIds={favoritosIds}
            onVolver={volverALaCarta}
            onToggleFavorito={toggleFavorito}
            onAbrirInfo={abrirInfo}
            onAgregarCarrito={puedeOrdenar ? setPlatoAAgregar : null}
            registrarEvento={registrarEvento}
            platoInicialId={platoInicial ?? platoCompartido}
          />
          {puedeOrdenar && (
            <MiniCartBar
              cantidadItems={cantidadItemsCarrito}
              total={totalCarrito}
              onAbrir={() => setVista(VISTAS.CARRITO)}
            />
          )}
        </>
      )}

      {vista === VISTAS.CARRITO && puedeOrdenar && (
        <CartView
          carrito={carrito}
          mesa={mesa}
          onVolver={() => setVista(VISTAS.CATEGORIAS)}
          onActualizarCantidad={actualizarCantidadCarrito}
          onEliminar={eliminarDelCarrito}
          onEnviarPedido={enviarPedido}
        />
      )}

      {vista === VISTAS.SEGUIMIENTO && pedidoActivo && (
        <OrderTracking
          pedidoInicial={pedidoActivo}
          mesa={mesa}
          sesionToken={sesionToken}
          demoMode={demoMode}
          onVolverAlMenu={() => setVista(VISTAS.CATEGORIAS)}
        />
      )}

      <DishInfoSheet
        plato={platoInfo}
        tipoInicial={tipoInfo}
        onClose={() => setPlatoInfo(null)}
        demoMode={demoMode}
        onAgregarCarrito={puedeOrdenar ? agregarAlCarritoDesdeInfo : null}
        qrToken={qrToken}
      />

      <AddToCartSheet
        plato={platoAAgregar}
        onClose={() => setPlatoAAgregar(null)}
        onConfirmar={confirmarAgregarCarrito}
        demoMode={demoMode}
      />

      <HojaAntojate
        abierta={hojaAntojateAbierta}
        grupos={grupos}
        platos={platosTodos}
        seleccion={antojosActivos}
        onCerrar={() => setHojaAntojateAbierta(false)}
        onAplicar={(nuevos) => {
          setAntojos(nuevos);
          setHojaAntojateAbierta(false);
        }}
      />
    </div>
  );
}
