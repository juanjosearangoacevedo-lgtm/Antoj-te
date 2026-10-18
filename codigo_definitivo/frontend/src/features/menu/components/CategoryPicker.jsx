import { ArrowLeft, Search, SearchX, X } from 'lucide-react';
import { formatoMoneda } from '@/shared/utils/formato';
import CategoryCard from './CategoryCard';
import BotonAntojate from './BotonAntojate';
import ChipAntojo from './ChipAntojo';
import TarjetaPlato from './TarjetaPlato';

// Cómo se distribuyen las categorías. El valor por defecto de la plataforma es
// 'pantalla_completa': mosaicos grandes con la foto del plato de fondo. Es la
// vista que aprovecha el espacio y da la sensación de carta en video.
const DISTRIBUCIONES = {
  pantalla_completa: 'space-y-aire',
  cuadricula: 'grid grid-cols-2 gap-aire',
  lista: 'space-y-2',
};

// La carta del restaurante: buscar, el botón ANTOJATE y las categorías. Con
// antojos activos, en vez de las categorías se ven los platos que coinciden; al
// tocar uno se abre el feed vertical en ese plato, deslizando por esa misma lista.
export default function CategoryPicker({
  categorias,
  platos = [],
  busqueda = '',
  onBuscar,
  onSeleccionar,
  onVerResultados,
  mesa,
  layout,
  previaCategoria,
  onVolverInicio,
  antojos = [],
  etiquetasAntojos,
  resultadosAntojo = [],
  recomendadosChef = [],
  onAbrirAntojate,
  onQuitarAntojo,
  onLimpiarAntojos,
  onAbrirPlato,
}) {
  // '' o ausente = el default de la plataforma, no la cuadrícula antigua.
  const distribucion = DISTRIBUCIONES[layout] ? layout : 'pantalla_completa';
  const esCompacta = distribucion !== 'pantalla_completa';
  const previa = previaCategoria || 'imagen';
  const filtrando = antojos.length > 0;

  // Medio representativo de cada categoría: el primer plato que tenga con qué.
  const medioDe = (cat) => {
    const p = platos.find((x) => x.categoria === cat.nombre && (x.video_thumbnail_url || x.imagen_url));
    if (!p) return null;
    return { imagen: p.video_thumbnail_url || p.imagen_url, video: p.video_url };
  };

  const q = busqueda.trim().toLowerCase();
  const resultados = q
    ? platos.filter((p) => `${p.nombre} ${p.descripcion || ''}`.toLowerCase().includes(q))
    : [];

  // El menú es móvil-primero: en pantallas grandes se centra en una columna en
  // vez de estirar las tarjetas a todo el ancho.
  return (
    <div className="min-h-[100dvh] bg-base px-5 pt-8 pb-28 animate-risein max-w-2xl mx-auto">
      {/* La bienvenida dejó de ser una portada: ahí viven el llamado al mesero y
          las redes del restaurante, así que hay que poder regresar. Va en esta
          pantalla y no en el feed porque es el eje del recorrido — del feed, del
          carrito y del seguimiento se vuelve aquí. */}
      <div className="flex items-center gap-3 mb-1">
        {onVolverInicio && (
          <button
            onClick={onVolverInicio}
            aria-label="Volver al inicio"
            className="grid place-items-center w-9 h-9 shrink-0 rounded-full border border-line bg-surface text-cream active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <p className="text-xs uppercase tracking-wider text-muted font-semibold">
          {mesa?.numero_mesa ? `Mesa ${mesa.numero_mesa}` : mesa?.restaurante_nombre}
        </p>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-cream mt-1 mb-4">¿Qué se te antoja hoy?</h1>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input
          value={busqueda}
          onChange={(e) => onBuscar?.(e.target.value)}
          placeholder="Buscar un plato…"
          aria-label="Buscar un plato"
          className="w-full rounded-full bg-surface border border-line pl-10 pr-10 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:border-amber transition-colors"
        />
        {busqueda && (
          <button
            onClick={() => onBuscar?.('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-cream"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {q ? (
        resultados.length === 0 ? (
          <p className="text-muted text-sm text-center mt-12">
            No encontramos platos para “{busqueda.trim()}”.
          </p>
        ) : (
          <div className="space-y-2">
            {resultados.map((p) => (
              <button
                key={p.id}
                onClick={() => onVerResultados?.(p)}
                className="w-full flex items-center gap-3 rounded-card border border-line bg-surface p-2.5 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-14 h-14 rounded-xl bg-surface2 overflow-hidden shrink-0">
                  {(p.video_thumbnail_url || p.imagen_url) && (
                    <img src={p.video_thumbnail_url || p.imagen_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-cream font-medium truncate">{p.nombre}</div>
                  <div className="text-xs text-muted truncate">{p.categoria}</div>
                </div>
                <div className="text-amber font-semibold text-sm shrink-0">{formatoMoneda(p.precio)}</div>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          {onAbrirAntojate && (
            <div className="mb-4">
              <BotonAntojate activos={antojos.length} onAbrir={onAbrirAntojate} />
            </div>
          )}

          {/* Los antojos que están filtrando la carta, siempre a la vista: nadie
              debería preguntarse por qué ve menos platos. */}
          {filtrando && (
            <div className="no-scrollbar -mx-5 mb-5 flex items-center gap-2 overflow-x-auto px-5">
              {antojos.map((id) => (
                <ChipAntojo
                  key={id}
                  etiqueta={etiquetasAntojos?.get(id) ?? id}
                  activo
                  quitable
                  onClick={() => onQuitarAntojo?.(id)}
                />
              ))}
              <button
                type="button"
                onClick={onLimpiarAntojos}
                className="shrink-0 px-2 text-sm font-semibold text-amber"
              >
                Limpiar todo
              </button>
            </div>
          )}

          {filtrando ? (
            resultadosAntojo.length === 0 ? (
              <div className="mt-10 flex flex-col items-center gap-3 text-center">
                <SearchX className="h-10 w-10 text-muted" strokeWidth={1.6} aria-hidden />
                <p className="font-display text-lg text-cream">Nada con esa combinación</p>
                <p className="max-w-xs text-sm text-muted">Prueba quitando algún antojo o elige otros.</p>
                <button
                  type="button"
                  onClick={onLimpiarAntojos}
                  className="mt-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-cream"
                >
                  Limpiar antojos
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-xl font-bold text-cream">Para tu antojo</h2>
                  <span className="text-xs text-muted">
                    {resultadosAntojo.length} {resultadosAntojo.length === 1 ? 'plato' : 'platos'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {resultadosAntojo.map((p) => (
                    <TarjetaPlato key={p.id} plato={p} onAbrir={() => onAbrirPlato?.(p, resultadosAntojo, 'Para tu antojo')} />
                  ))}
                </div>
              </>
            )
          ) : (
            <>
              <div className={DISTRIBUCIONES[distribucion]}>
                {categorias.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    categoria={cat}
                    medio={medioDe(cat)}
                    previa={previa}
                    compacta={esCompacta}
                    onSeleccionar={onSeleccionar}
                  />
                ))}
              </div>

              {recomendadosChef.length > 0 && onAbrirPlato && (
                <section className="mt-8">
                  <h2 className="mb-3 font-display text-xl font-bold text-cream">Recomendados del chef</h2>
                  <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
                    {recomendadosChef.map((p) => (
                      <TarjetaPlato
                        key={p.id}
                        plato={p}
                        className="w-40 shrink-0"
                        onAbrir={() => onAbrirPlato(p, recomendadosChef, 'Recomendados del chef')}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
