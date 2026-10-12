import { Search, ArrowRight, Utensils, Heart, Info } from 'lucide-react';
import { estilosDeTema, atributosDeTema } from '@/shared/tema/aplicarTema';

const CATEGORIAS_MUESTRA = [
  { id: 1, nombre: 'Entradas' },
  { id: 2, nombre: 'Platos Fuertes' },
  { id: 3, nombre: 'Postres' },
];

/**
 * Vista previa en vivo del menú del comensal.
 *
 * Renderiza el mismo lenguaje visual que ve el cliente, pero con los tokens del
 * borrador aplicados SOLO dentro de este recuadro (no toca el resto del panel).
 * Por eso usa `estilosDeTema`, que devuelve las variables CSS como estilo de
 * React en vez de escribirlas en <html>.
 */
export default function VistaPreviaMenu({ tema, pantalla = 'categorias' }) {
  const estilos = estilosDeTema(tema);
  const atributos = atributosDeTema(tema);

  const layout = tema.layout_categorias || 'pantalla_completa';
  const previa = tema.preview_categoria || 'imagen';
  const conMedio = previa !== 'ninguna';
  const enCuadricula = layout === 'cuadricula';
  const compacta = layout !== 'pantalla_completa';
  const mostrarPrecio = tema.mostrar_precio_feed === null || tema.mostrar_precio_feed === undefined
    ? true
    : Boolean(tema.mostrar_precio_feed);

  return (
    <div
      {...atributos}
      style={{ ...estilos, background: 'var(--c-base)', color: 'var(--c-cream)', fontFamily: 'var(--font-body)' }}
      className="h-full overflow-y-auto no-scrollbar px-4 pt-5 pb-6"
    >
      {pantalla === 'categorias' ? (
        <>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--c-muted)' }}>
            Mesa 4
          </p>
          <h2 className="text-xl font-bold mt-0.5 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Explora el menú
          </h2>

          <div
            className="flex items-center gap-2 rounded-full px-3 py-2 mb-4 text-[11px]"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', color: 'var(--c-muted)' }}
          >
            <Search className="w-3 h-3" />
            Buscar un plato…
          </div>

          <div className={enCuadricula ? 'grid grid-cols-2' : ''} style={{ gap: 'var(--espaciado)', display: enCuadricula ? 'grid' : 'grid' }}>
            {CATEGORIAS_MUESTRA.map((cat, i) => (
              <TarjetaCategoria
                key={cat.id}
                nombre={cat.nombre}
                indice={i}
                conMedio={conMedio}
                animada={previa === 'animacion'}
                compacta={compacta}
              />
            ))}
          </div>
        </>
      ) : (
        <VistaPreviaPlato mostrarPrecio={mostrarPrecio} />
      )}
    </div>
  );
}

// Degradados de muestra: la vista previa no descarga las fotos reales del
// restaurante, pero conserva la proporción y el overlay para juzgar legibilidad.
const MUESTRAS = [
  'linear-gradient(135deg, #6e8f5c, #2f3d28)',
  'linear-gradient(135deg, #c4703a, #4a2618)',
  'linear-gradient(135deg, #a34a5e, #3d1a24)',
];

function TarjetaCategoria({ nombre, indice, conMedio, animada, compacta }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: compacta ? '4.5rem' : 'var(--alto-categoria)',
        borderRadius: 'var(--radio-tarjetas)',
        border: '1px solid var(--c-line)',
        background: conMedio ? undefined : 'var(--c-surface)',
        boxShadow: 'var(--sombra-md)',
      }}
    >
      {conMedio && (
        <div
          className={`absolute inset-0 ${animada ? 'previa-animada' : ''}`}
          style={{ background: MUESTRAS[indice % MUESTRAS.length] }}
        />
      )}
      {conMedio && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, #000, transparent)',
            opacity: 'var(--overlay-categoria)',
          }}
        />
      )}
      <div className="relative h-full flex flex-col justify-end p-3">
        {!conMedio && (
          <span
            className="grid place-items-center w-8 h-8 rounded-lg mb-auto"
            style={{ background: 'var(--accent-soft)', color: 'var(--c-primario)' }}
          >
            <Utensils className="w-4 h-4" />
          </span>
        )}
        <span
          className={`font-bold ${compacta ? 'text-sm' : 'text-lg'}`}
          style={{ fontFamily: 'var(--font-display)', color: conMedio ? '#fff' : 'var(--c-cream)' }}
        >
          {nombre}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[10px] mt-0.5"
          style={{ color: conMedio ? 'rgba(255,255,255,.8)' : 'var(--c-muted)' }}
        >
          Ver en video <ArrowRight className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
}

// Segunda pantalla: cómo se ve un plato en el feed, con el botón principal.
function VistaPreviaPlato({ mostrarPrecio }) {
  return (
    <div
      className="relative overflow-hidden h-full min-h-[18rem]"
      style={{ borderRadius: 'var(--radio-tarjetas)', background: 'linear-gradient(160deg, #c4703a, #241009)' }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)', opacity: 0.7 }} />

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        {[Heart, Info].map((Icono, i) => (
          <span key={i} className="grid place-items-center w-8 h-8 rounded-full bg-white/15 text-white">
            <Icono className="w-4 h-4" />
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
          Doble Bitemo Burger
        </div>
        {mostrarPrecio && (
          <div className="font-semibold text-sm mt-0.5" style={{ color: 'var(--c-primario-soft)' }}>
            $ 32.000
          </div>
        )}
        <p className="text-white/75 text-[11px] mt-1 line-clamp-2">
          Dos carnes selladas a la plancha, doble cheddar y pan brioche.
        </p>
        <BotonPrevia />
      </div>
    </div>
  );
}

// Refleja `estilo_botones` y `forma_botones` del borrador.
function BotonPrevia() {
  return (
    <div
      className="mt-3 text-center text-sm font-semibold py-2"
      style={{ borderRadius: 'var(--radio-boton)', background: 'var(--c-boton)', color: 'var(--c-boton-texto)' }}
      data-estilo-boton
    >
      Agregar
    </div>
  );
}
