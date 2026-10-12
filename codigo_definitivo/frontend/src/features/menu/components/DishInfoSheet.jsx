import { useEffect, useState } from 'react';
import { ChefHat, Flame, ShieldAlert, Share2, Sparkles, Copy, Check, Link2, MessageCircle } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { formatoMoneda } from '@/shared/utils/formato';
import { compartirEnlace, copiarTexto, enlaceWhatsApp } from '@/shared/utils/compartir';
import { api } from '@/features/menu/services/menu.api';
import { recomendacionesDemo } from '@/features/menu/data/mock';

const NIVELES = ['Sin picante', 'Suave', 'Medio', 'Picante', 'Muy picante', 'Extremo'];

// Cada botón de la columna del feed abre SU sección, no todas a la vez. Antes
// esta hoja pintaba siempre lo mismo pasara lo que pasara, así que "Ingredientes"
// y "Descripción" mostraban exactamente el mismo contenido.
const TITULOS = {
  ingredientes: 'Ingredientes',
  descripcion: 'Descripción',
  picante: 'Nivel de picante',
  chef: 'Recomendación del chef',
  compartir: 'Compartir',
};

export default function DishInfoSheet({ plato, tipoInicial, onClose, demoMode, onAgregarCarrito, qrToken }) {
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [ingredientes, setIngredientes] = useState(null); // null = todavía sin resolver

  const tipo = tipoInicial || 'descripcion';

  // Las recomendaciones solo acompañan a la descripción: en las demás secciones
  // son ruido.
  useEffect(() => {
    if (!plato || tipo !== 'descripcion') return;
    if (demoMode) {
      setRecomendaciones(recomendacionesDemo(plato.id));
      return;
    }
    api
      .recomendaciones(plato.id)
      .then(setRecomendaciones)
      .catch(() => setRecomendaciones([]));
  }, [plato, demoMode, tipo]);

  // Los ingredientes NO vienen en el feed (platos.model.feedPorRestaurante
  // devuelve solo lo que se pinta sobre el video), así que hay que pedir el
  // detalle del plato. En demo llegan dentro del propio objeto.
  useEffect(() => {
    if (!plato || tipo !== 'ingredientes') return;
    if (plato.ingredientes) {
      setIngredientes(plato.ingredientes);
      return;
    }
    let vigente = true;
    setIngredientes(null);
    api
      .detallePlato(plato.id)
      .then((d) => vigente && setIngredientes(d.ingredientes || []))
      .catch(() => vigente && setIngredientes([]));
    return () => {
      vigente = false;
    };
  }, [plato, tipo]);

  if (!plato) return null;

  return (
    <BottomSheet open={!!plato} onClose={onClose} title={plato.nombre}>
      <h4 className="text-xs uppercase tracking-wide text-muted font-semibold mb-3">{TITULOS[tipo]}</h4>

      {tipo === 'descripcion' && (
        <>
          <p className="text-cream/80 text-sm mb-5">
            {plato.descripcion || 'Este plato todavía no tiene descripción.'}
          </p>
          <Recomendaciones lista={recomendaciones} onAgregarCarrito={onAgregarCarrito} />
        </>
      )}

      {tipo === 'ingredientes' && <Ingredientes lista={ingredientes} />}

      {tipo === 'picante' && (
        <div className="flex items-center gap-2 rounded-xl bg-chile/10 border border-chile/25 px-3 py-2.5">
          <Flame className="w-4.5 h-4.5 text-chile shrink-0" />
          <span className="text-sm text-cream">
            <strong>{NIVELES[plato.nivel_picante] || NIVELES[0]}</strong>
          </span>
        </div>
      )}

      {tipo === 'chef' && (
        <div className="flex items-center gap-2 rounded-xl bg-accent-soft border border-amber px-3 py-2.5">
          <ChefHat className="w-4.5 h-4.5 text-amber shrink-0" />
          <span className="text-sm text-cream">Este plato es una recomendación especial del chef.</span>
        </div>
      )}

      {tipo === 'compartir' && <Compartir plato={plato} qrToken={qrToken} />}
    </BottomSheet>
  );
}

// ---------------------------------------------------------------- secciones ---

function Ingredientes({ lista }) {
  if (lista === null) {
    return (
      <div className="flex flex-wrap gap-2" aria-busy="true" aria-label="Cargando ingredientes">
        {['w-24', 'w-32', 'w-20'].map((ancho) => (
          <span key={ancho} className={`skeleton h-7 rounded-full ${ancho}`} />
        ))}
      </div>
    );
  }

  if (!lista.length) {
    return (
      <p className="text-sm text-muted">
        Este plato todavía no tiene sus ingredientes cargados. Pregúntale a tu mesero si necesitas
        saber si contiene algo en particular.
      </p>
    );
  }

  const alergenos = lista.filter((i) => i.es_alergeno);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {lista.map((ing) => (
          <span
            key={ing.id}
            className="text-xs rounded-full border border-line bg-surface2 px-3 py-1.5 text-cream/90"
          >
            {ing.nombre}
          </span>
        ))}
      </div>
      {alergenos.length > 0 && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-muted">
          <ShieldAlert className="w-3.5 h-3.5 text-chile shrink-0 mt-0.5" />
          <span>Contiene alérgenos: {alergenos.map((a) => a.nombre).join(', ')}.</span>
        </div>
      )}
    </>
  );
}

function Recomendaciones({ lista, onAgregarCarrito }) {
  if (!lista.length) return null;
  return (
    <div className="mb-2">
      <h4 className="text-xs uppercase tracking-wide text-muted font-semibold mb-2 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber" /> Si te gusta esto, prueba también
      </h4>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {lista.map((r) => (
          <button
            key={r.id}
            onClick={() => onAgregarCarrito?.(r)}
            className="shrink-0 w-32 rounded-xl overflow-hidden border border-line bg-surface2 text-left active:scale-95 transition-transform"
          >
            <div className="h-20 w-full bg-black/40 relative">
              <video src={r.video_url} muted className="h-full w-full object-cover" />
            </div>
            <div className="p-2">
              <p className="text-xs text-cream line-clamp-2">{r.nombre}</p>
              <p className="text-[11px] font-mono text-amber-soft mt-0.5">{formatoMoneda(r.precio)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * El enlace lleva la mesa Y el plato: quien lo recibe cae directamente en ese
 * video, no en el inicio del menú. Conserva la mesa a propósito, porque sin ella
 * el menú no sabe de qué restaurante es la carta.
 */
function Compartir({ plato, qrToken }) {
  const [estado, setEstado] = useState(null);

  const url = `${window.location.origin}/menu?mesa=${encodeURIComponent(qrToken || 'demo')}&plato=${plato.id}`;
  const texto = `Mira este plato: ${plato.nombre}`;

  // navigator.share SOLO existe en contexto seguro. Servido por IP sobre HTTP no
  // está, así que el menú del sistema no se puede ofrecer siempre: se muestra
  // cuando el navegador lo tiene, porque abre todas las apps del teléfono y gana
  // a cualquier lista que dibujemos nosotros.
  const hayNativo = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const compartirNativo = async () => {
    const resultado = await compartirEnlace({ titulo: plato.nombre, texto, url });
    if (resultado === 'cancelado') return;
    setEstado(resultado);
    if (resultado === 'copiado') setTimeout(() => setEstado(null), 2500);
  };

  const copiar = async () => {
    const ok = await copiarTexto(url);
    setEstado(ok ? 'copiado' : 'fallo');
    if (ok) setTimeout(() => setEstado(null), 2500);
  };

  return (
    <div className="py-1">
      <p className="text-cream text-center mb-1">Comparte {plato.nombre} con quien te acompaña</p>
      <p className="text-sm text-muted text-center mb-5">Abrirá el menú directamente en este plato.</p>

      {/* WhatsApp va primero y es un <a>, no un botón: es solo una URL, así que
          no depende del portapapeles ni de contexto seguro. Es el único camino
          que funciona igual en un iPhone sobre HTTP, donde execCommand('copy')
          falla incluso con el dedo del usuario. */}
      <a
        href={enlaceWhatsApp(`${texto}\n${url}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber py-3.5 font-bold text-botontxt active:scale-[0.98] transition-transform"
      >
        <MessageCircle className="w-4.5 h-4.5" />
        Enviar por WhatsApp
      </a>

      <div className="mt-2.5 flex gap-2">
        <button
          onClick={copiar}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-semibold text-cream active:scale-[0.98] transition-transform"
        >
          {estado === 'copiado' ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
          {estado === 'copiado' ? 'Copiado' : 'Copiar enlace'}
        </button>

        {hayNativo && (
          <button
            onClick={compartirNativo}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-semibold text-cream active:scale-[0.98] transition-transform"
          >
            <Share2 className="w-4 h-4" />
            Más opciones
          </button>
        )}
      </div>

      {estado === 'fallo' && (
        <p className="mt-3 text-xs text-muted text-center">
          Tu navegador no dejó copiarlo. Manténlo pulsado sobre el enlace de abajo para copiarlo a
          mano.
        </p>
      )}

      {/* El enlace visible es el respaldo del respaldo: si ni WhatsApp ni copiar
          sirven, siempre queda seleccionarlo con el dedo. */}
      <p className="mt-4 flex items-start gap-1.5 text-[11px] text-muted break-all select-all">
        <Link2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {url}
      </p>
    </div>
  );
}
