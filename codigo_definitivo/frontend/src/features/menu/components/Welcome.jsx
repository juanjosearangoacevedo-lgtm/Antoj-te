import { ConciergeBell, Check, Sparkles } from 'lucide-react';
import { redesDelTema } from '@/shared/tema/redes';

// Estados del llamado. 'enviando' y 'avisado' no se distinguen para el comensal
// más que en el texto: lo que importa es que no pueda tocar dos veces.
//
// El estado NO vive aquí: lo guarda MenuPage. Esta pantalla se desmonta al
// entrar al menú, y desde que se puede volver a ella, guardarlo dentro haría
// que el botón apareciera intacto aunque el mesero siguiera sin venir.
export const LLAMADO = { LISTO: 'listo', ENVIANDO: 'enviando', AVISADO: 'avisado', ERROR: 'error' };

export default function Welcome({
  mesa,
  tema,
  onContinuar,
  onLlamarMesero,
  llamado = LLAMADO.LISTO,
  esVitrina = false,
}) {
  const redes = redesDelTema(tema);
  // En la vitrina no se llama al mesero: quien mira la carta desde Instagram no
  // está en el local, y ese aviso llegaría a una cocina que no espera a nadie.
  const puedeLlamar =
    !esVitrina && Boolean(tema?.llamar_mesero) && typeof onLlamarMesero === 'function';

  const saludo =
    tema?.mensaje_bienvenida?.trim() ||
    `¡Bienvenido${mesa?.restaurante_nombre ? ` a ${mesa.restaurante_nombre}` : ''}!`;

  return (
    <div className="h-[100dvh] flex flex-col justify-between bg-base px-6 py-10 animate-risein">
      <div />

      <div className="text-center">
        {/* Sin mesa no se pinta "Mesa " a secas: en la vitrina se dice la ciudad,
            que además es lo que busca quien llega desde un buscador. */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs font-semibold text-amber-soft mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          {esVitrina ? mesa?.ciudad || 'Carta digital' : `Mesa ${mesa?.numero_mesa ?? ''}`}
        </span>
        <h1 className="font-display text-4xl text-cream leading-tight">{saludo}</h1>
        <p className="mt-3 text-muted text-base">¿Qué se te antoja hoy?</p>

        {redes.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            {redes.map(({ clave, nombre, icono: Icono, url }) => (
              <a
                key={clave}
                href={url}
                target="_blank"
                // noopener es obligatorio con target="_blank": sin él la página
                // abierta recibe window.opener y puede redirigir el menú.
                rel="noopener noreferrer"
                aria-label={nombre}
                title={nombre}
                className="grid place-items-center w-11 h-11 rounded-full border border-line bg-surface text-cream/80 active:scale-90 transition-transform"
              >
                <Icono className="w-4.5 h-4.5" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={onContinuar}
          className="w-full rounded-full bg-amber py-4 font-body font-bold text-lg text-botontxt active:scale-[0.98] transition-transform shadow-card"
        >
          Ver el menú
        </button>

        {puedeLlamar && (
          <button
            onClick={onLlamarMesero}
            disabled={llamado === LLAMADO.ENVIANDO || llamado === LLAMADO.AVISADO}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 font-body font-semibold text-cream active:scale-[0.98] transition-transform disabled:active:scale-100 disabled:opacity-70"
          >
            {llamado === LLAMADO.AVISADO ? (
              <>
                <Check className="w-4.5 h-4.5 text-ok" /> Ya avisamos, viene en camino
              </>
            ) : (
              <>
                <ConciergeBell className="w-4.5 h-4.5" />
                {llamado === LLAMADO.ENVIANDO ? 'Avisando…' : 'Llamar al mesero'}
              </>
            )}
          </button>
        )}

        {llamado === LLAMADO.ERROR && (
          <p className="mt-2 text-center text-xs text-chile">
            No pudimos avisar. Inténtalo otra vez o levanta la mano.
          </p>
        )}

        <p className="mt-4 text-center text-xs text-muted">
          {esVitrina
            ? 'Esta es la carta del restaurante. Para pedir, escanea el QR de tu mesa.'
            : 'No necesitas crear una cuenta — tu sesión queda ligada a esta mesa.'}
        </p>
      </div>
    </div>
  );
}
