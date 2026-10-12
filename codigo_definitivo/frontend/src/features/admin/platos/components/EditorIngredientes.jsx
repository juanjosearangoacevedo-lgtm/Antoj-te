import { useEffect, useRef, useState } from 'react';
import { Plus, ShieldAlert, X } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';

/**
 * Ingredientes de un plato.
 *
 * Los ingredientes NO son texto libre del plato: son insumos del restaurante
 * (tabla `ingredientes`) que varios platos comparten, y `plato_ingredientes` es
 * la tabla puente. Por eso escribir un nombre aquí busca primero en el catálogo
 * y solo crea el insumo si no existía: así "Queso crema" no acaba duplicado
 * ocho veces con la marca de alérgeno puesta en unos sí y en otros no.
 *
 * El componente trabaja sobre la lista del plato ({ id, nombre, es_alergeno }) y
 * es el padre quien la guarda al enviar el formulario, porque un plato nuevo
 * todavía no tiene id al que colgarle la receta.
 */
export default function EditorIngredientes({ valor = [], onCambiar, onError }) {
  const [catalogo, setCatalogo] = useState([]);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef(null);

  useEffect(() => {
    staffApi.ingredientes.listar().then(setCatalogo).catch(() => setCatalogo([]));
  }, []);

  const yaEsta = (nombre) => valor.some((i) => i.nombre.toLowerCase() === nombre.toLowerCase());

  const agregar = async () => {
    const nombre = texto.trim();
    if (!nombre || ocupado) return;
    if (yaEsta(nombre)) {
      setTexto('');
      return;
    }

    setOcupado(true);
    try {
      // Comparación sin distinguir mayúsculas: quien escribe "queso crema" se
      // refiere al mismo insumo que "Queso Crema".
      let ingrediente = catalogo.find((i) => i.nombre.toLowerCase() === nombre.toLowerCase());
      if (!ingrediente) {
        ingrediente = await staffApi.ingredientes.crear({ nombre, es_alergeno: false });
        setCatalogo((c) => [...c, ingrediente]);
      }
      onCambiar([...valor, ingrediente]);
      setTexto('');
      entrada.current?.focus();
    } catch (e) {
      onError?.(e.message);
    } finally {
      setOcupado(false);
    }
  };

  // El alérgeno es del INSUMO, no de este plato: marcarlo aquí lo corrige en
  // todos los platos que lo usan, que es justo lo que se espera de un alérgeno.
  const alternarAlergeno = async (ingrediente) => {
    const nuevo = !ingrediente.es_alergeno;
    onCambiar(valor.map((i) => (i.id === ingrediente.id ? { ...i, es_alergeno: nuevo } : i)));
    try {
      await staffApi.ingredientes.actualizar(ingrediente.id, { es_alergeno: nuevo });
      setCatalogo((c) => c.map((i) => (i.id === ingrediente.id ? { ...i, es_alergeno: nuevo } : i)));
    } catch (e) {
      onCambiar(valor); // se revierte: la base mandó que no
      onError?.(e.message);
    }
  };

  const sugerencias = catalogo.filter((i) => !yaEsta(i.nombre));

  return (
    <div>
      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {valor.map((ing) => (
            <span
              key={ing.id}
              className={`inline-flex items-center gap-1.5 rounded-full border pl-2.5 pr-1 py-1 text-xs ${
                ing.es_alergeno ? 'border-danger text-cream bg-danger/10' : 'border-line text-cream bg-surface2'
              }`}
            >
              {ing.nombre}
              <button
                type="button"
                onClick={() => alternarAlergeno(ing)}
                title={ing.es_alergeno ? 'Marcado como alérgeno' : 'Marcar como alérgeno'}
                aria-pressed={Boolean(ing.es_alergeno)}
                className={`grid place-items-center w-5 h-5 rounded-full transition-colors ${
                  ing.es_alergeno ? 'text-danger' : 'text-muted hover:text-cream'
                }`}
              >
                <ShieldAlert size={12} />
              </button>
              <button
                type="button"
                onClick={() => onCambiar(valor.filter((i) => i.id !== ing.id))}
                aria-label={`Quitar ${ing.nombre}`}
                className="grid place-items-center w-5 h-5 rounded-full text-muted hover:text-danger transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={entrada}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          // Enter agrega el ingrediente; sin este preventDefault enviaría el
          // formulario del plato entero, que es lo último que se quiere aquí.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          list="catalogo-ingredientes"
          placeholder="Escribe un ingrediente y pulsa Enter"
          className="flex-1 bg-surface border border-line rounded-xl px-3 py-2 text-sm text-cream placeholder:text-muted outline-none focus:border-amber"
        />
        <datalist id="catalogo-ingredientes">
          {sugerencias.map((i) => (
            <option key={i.id} value={i.nombre} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={agregar}
          disabled={!texto.trim() || ocupado}
          className="grid place-items-center w-10 rounded-xl border border-line text-muted hover:text-cream disabled:opacity-40 transition-colors"
          aria-label="Agregar ingrediente"
        >
          <Plus size={16} />
        </button>
      </div>

      <p className="text-[11px] text-muted mt-1.5">
        El comensal los ve en “Ingredientes”, separados de la descripción. El escudo marca los
        alérgenos.
      </p>
    </div>
  );
}
