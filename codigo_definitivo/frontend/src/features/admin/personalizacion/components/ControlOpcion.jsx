import { Check, Plus, Trash2 } from 'lucide-react';
import { Select } from '@/shared/components/ui';
import { REDES, enlaceSeguro } from '@/shared/tema/redes';

/**
 * Dibuja el control que corresponda a una opción del catálogo
 * (shared/tema/opciones.js). El panel no sabe qué opciones existen: las recorre.
 */
export default function ControlOpcion({ opcion, valor, onCambiar }) {
  const id = `opcion-${opcion.clave}`;

  return (
    <div className="py-4 border-b border-line last:border-0">
      <label htmlFor={id} className="block text-sm font-semibold text-cream">
        {opcion.etiqueta}
      </label>
      {opcion.ayuda && <p className="text-xs text-muted mt-0.5 mb-2.5">{opcion.ayuda}</p>}

      {opcion.tipo === 'color' && <ControlColor id={id} valor={valor} onCambiar={onCambiar} />}

      {opcion.tipo === 'opciones' && (
        <Select id={id} value={valor ?? ''} onChange={(e) => onCambiar(e.target.value)}>
          {opcion.valores.map((v) => (
            <option key={v.valor} value={v.valor}>
              {v.nombre}
              {v.recomendado ? ' ·  recomendado' : ''}
            </option>
          ))}
        </Select>
      )}

      {opcion.tipo === 'switch' && (
        <ControlSwitch
          id={id}
          encendido={valor === null || valor === undefined ? opcion.defaultEncendido : Boolean(valor)}
          onCambiar={onCambiar}
        />
      )}

      {opcion.tipo === 'rango' && (
        <ControlRango id={id} opcion={opcion} valor={valor} onCambiar={onCambiar} />
      )}

      {opcion.tipo === 'texto' && (
        <input
          id={id}
          type="text"
          value={valor ?? ''}
          maxLength={opcion.max}
          placeholder={opcion.marcador}
          // Vacío se guarda como null, no como '': es la convención del tema
          // (null = usa el valor por defecto de Antojate).
          onChange={(e) => onCambiar(e.target.value.trim() === '' ? null : e.target.value)}
          className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-cream placeholder:text-muted outline-none focus:border-amber"
        />
      )}

      {opcion.tipo === 'redes' && <ControlRedes valor={valor} onCambiar={onCambiar} />}
    </div>
  );
}

// El color se elige con la paleta del sistema; el campo de texto de al lado
// permite pegar un hex exacto de la marca.
function ControlColor({ id, valor, onCambiar }) {
  const hex = valor || '';
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={hex || '#000000'}
        onChange={(e) => onCambiar(e.target.value)}
        className="w-11 h-10 rounded-xl border border-line bg-surface cursor-pointer p-1"
        aria-label="Selector de color"
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Por defecto"
        className="flex-1 bg-surface border border-line rounded-xl px-3 py-2 text-sm text-cream font-mono placeholder:text-muted outline-none focus:border-amber"
      />
      {hex && (
        <button
          type="button"
          onClick={() => onCambiar('')}
          className="text-xs text-muted hover:text-cream px-2 py-2 shrink-0"
        >
          Restablecer
        </button>
      )}
    </div>
  );
}

function ControlSwitch({ id, encendido, onCambiar }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={encendido}
      onClick={() => onCambiar(!encendido)}
      className={`inline-flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
        encendido ? 'border-amber bg-accent-soft text-cream' : 'border-line bg-surface text-muted'
      }`}
    >
      <span
        aria-hidden
        className={`grid place-items-center w-5 h-5 rounded-md border ${
          encendido ? 'bg-amber border-transparent text-botontxt' : 'border-line'
        }`}
      >
        {encendido && <Check size={13} />}
      </span>
      {encendido ? 'Activado' : 'Desactivado'}
    </button>
  );
}

/**
 * Lista editable de redes. El valor es el JSON que guarda la columna
 * `redes_sociales`: [{ red, url }].
 *
 * Se avisa del enlace inválido AQUÍ además de en el backend porque el rechazo
 * del servidor llega al guardar, cuando ya se tocaron otras diez cosas y no
 * queda claro cuál falló.
 */
function ControlRedes({ valor, onCambiar }) {
  const lista = Array.isArray(valor) ? valor : [];

  // Una lista vacía se guarda como null: es la convención del tema y evita
  // dejar un `[]` que significa lo mismo pero se lee distinto.
  const escribir = (nueva) => onCambiar(nueva.length ? nueva : null);

  const cambiar = (i, campo, v) => escribir(lista.map((r, j) => (j === i ? { ...r, [campo]: v } : r)));

  return (
    <div className="space-y-2">
      {lista.map((red, i) => {
        const urlMal = red.url?.trim() && !enlaceSeguro(red.url);
        return (
          <div key={i} className="flex items-start gap-2">
            {/* El ancho va en el contenedor y no en el Select: `inputBase` ya
                trae w-full y dos utilidades de anchura compiten sin ganador
                previsible según el orden del CSS generado. */}
            <div className="w-36 shrink-0">
              <Select
                value={red.red || ''}
                onChange={(e) => cambiar(i, 'red', e.target.value)}
                aria-label="Red social"
              >
                {REDES.map((r) => (
                  <option key={r.clave} value={r.clave}>
                    {r.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="url"
                value={red.url || ''}
                onChange={(e) => cambiar(i, 'url', e.target.value)}
                placeholder={REDES.find((r) => r.clave === red.red)?.ejemplo || 'https://…'}
                aria-label="Enlace"
                aria-invalid={urlMal || undefined}
                className={`w-full bg-surface border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-muted outline-none focus:border-amber ${
                  urlMal ? 'border-danger' : 'border-line'
                }`}
              />
              {urlMal && (
                <p className="text-[11px] text-danger mt-1">El enlace debe empezar por https://</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => escribir(lista.filter((_, j) => j !== i))}
              aria-label={`Quitar ${red.red || 'red'}`}
              className="grid place-items-center w-9 h-9 shrink-0 rounded-xl border border-line text-muted hover:text-danger transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      {lista.length < REDES.length && (
        <button
          type="button"
          onClick={() => escribir([...lista, { red: primeraLibre(lista), url: '' }])}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-cream transition-colors"
        >
          <Plus size={13} /> Agregar red
        </button>
      )}
    </div>
  );
}

// Propone la primera red que aún no está en la lista, para no crear dos filas
// iguales que el restaurante tendría que corregir a mano.
function primeraLibre(lista) {
  const usadas = new Set(lista.map((r) => r.red));
  return (REDES.find((r) => !usadas.has(r.clave)) || REDES[0]).clave;
}

function ControlRango({ id, opcion, valor, onCambiar }) {
  const actual = valor ?? opcion.defaultNumero ?? opcion.min;
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={opcion.min}
        max={opcion.max}
        step={opcion.paso}
        value={actual}
        onChange={(e) => onCambiar(Number(e.target.value))}
        className="flex-1 accent-[var(--c-primario)]"
      />
      <span className="text-sm text-cream tabular-nums w-14 text-right">
        {actual}
        {opcion.unidad}
      </span>
    </div>
  );
}
