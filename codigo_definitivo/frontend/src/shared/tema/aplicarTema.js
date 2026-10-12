// Con extensión: así el módulo lo entienden por igual Vite y el runner de
// pruebas de Node, que exige la extensión en los imports ESM.
import { OPCIONES } from './opciones.js';

// Fuentes de Google disponibles para personalización; se cargan bajo demanda
// solo cuando el tema del restaurante las usa (la plataforma usa Geist local).
const FUENTES_GOOGLE = {
  Fraunces: 'Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700',
  Manrope: 'Manrope:wght@400;600;700',
  'Playfair Display': 'Playfair+Display:wght@400;600;700',
  Inter: 'Inter:wght@400;600;700',
};

function cargarFuente(valorFontFamily) {
  // Sin DOM (pruebas, render en servidor) no hay dónde inyectar la hoja.
  if (!valorFontFamily || typeof document === 'undefined') return;
  const familia = Object.keys(FUENTES_GOOGLE).find((f) => valorFontFamily.includes(f));
  if (!familia) return;

  const id = `fuente-tema-${familia.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${FUENTES_GOOGLE[familia]}&display=swap`;
  document.head.appendChild(link);
}

// Un valor "sin elegir" hereda el default de la plataforma. Es la regla que
// evita que un tema a medio llenar pise el diseño de Bitemo.
const sinElegir = (v) => v === undefined || v === null || v === '';

/**
 * Traduce un tema guardado a variables CSS y atributos.
 *
 * @param tema    fila de `temas_restaurante` (o el borrador del panel)
 * @param destino elemento sobre el que escribir. Por defecto <html>, pero la
 *                vista previa del panel le pasa su propio contenedor para
 *                tematizar solo ese recuadro.
 * @returns       los atributos calculados, para que quien renderiza en React
 *                pueda aplicarlos sin tocar el DOM a mano.
 */
export function aplicarTema(tema, destino) {
  const objetivo =
    destino ?? (typeof document !== 'undefined' ? document.documentElement : null);
  const atributos = {};
  if (!tema || !objetivo) return atributos;
  const escribir = objetivo;

  for (const opcion of OPCIONES) {
    const bruto = tema[opcion.clave];

    // Los switches son booleanos: `false` es una elección válida, no un vacío.
    if (opcion.tipo === 'switch') {
      if (bruto !== undefined && bruto !== null) {
        atributos[`data-${opcion.clave.replace(/_/g, '-')}`] = bruto ? 'si' : 'no';
      }
      continue;
    }

    if (sinElegir(bruto)) continue;

    // Un valor de escala ('suave', 'rapida'…) se traduce a su equivalente CSS.
    const valorCss = opcion.escala
      ? opcion.escala[bruto]
      : opcion.aCss
      ? opcion.aCss(bruto)
      : bruto;

    if (opcion.variable && valorCss !== undefined) {
      escribir.style.setProperty(opcion.variable, valorCss);
    }

    if (opcion.derivadas) {
      for (const [variable, valor] of Object.entries(opcion.derivadas(valorCss, bruto))) {
        escribir.style.setProperty(variable, valor);
      }
    }

    if (opcion.atributo) {
      escribir.setAttribute(opcion.atributo, bruto);
      atributos[opcion.atributo] = bruto;
    }

    if (opcion.clave === 'tipografia_titulos' || opcion.clave === 'tipografia_cuerpo') {
      cargarFuente(bruto);
    }
  }

  return atributos;
}

/**
 * Devuelve el tema como objeto de estilo de React, sin tocar el DOM.
 * Lo usa la vista previa del panel: así el recuadro se re-tematiza en cada
 * pulsación sin efectos secundarios sobre el resto de la página.
 */
export function estilosDeTema(tema) {
  const estilos = {};
  aplicarTema(tema, {
    style: { setProperty: (propiedad, valor) => (estilos[propiedad] = valor) },
    setAttribute: () => {},
  });
  return estilos;
}

/** Los atributos (data-modo, data-animaciones…) que corresponden a un tema. */
export function atributosDeTema(tema) {
  const recogidos = {};
  const falso = {
    style: { setProperty: () => {} },
    setAttribute: (k, v) => (recogidos[k] = v),
  };
  aplicarTema(tema, falso);
  return recogidos;
}
