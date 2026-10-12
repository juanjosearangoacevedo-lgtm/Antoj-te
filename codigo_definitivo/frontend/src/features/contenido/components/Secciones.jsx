// Pinta las secciones de una página de contenido.
//
// Cada tipo de bloque (párrafos, lista, pasos, comparativa) sale del mismo dato
// que escribe el HTML estático del build (seo/contenido-html.js). Aquí se le
// pone el diseño; allí se escribe con etiquetas semánticas y sin clases.

const Parrafos = ({ textos }) =>
  textos.map((t) => (
    <p key={t} className="text-muted leading-relaxed text-pretty mb-4">
      {t}
    </p>
  ));

const Lista = ({ items }) => (
  <ul className="grid gap-3 mb-4">
    {items.map((i) => (
      <li key={i} className="flex gap-3 text-muted leading-relaxed">
        <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden="true" />
        <span className="text-pretty">{i}</span>
      </li>
    ))}
  </ul>
);

// <ol> de verdad: el orden es parte de la información, no una decoración.
const Pasos = ({ items }) => (
  <ol className="grid gap-5 mb-4">
    {items.map((p, i) => (
      <li key={p.titulo} className="tarjeta-landing rounded-[1.5rem] p-5 flex gap-4">
        <span className="icono-marca inline-grid place-items-center w-9 h-9 shrink-0 rounded-xl text-sm font-bold">
          {i + 1}
        </span>
        <div>
          <h3 className="text-base font-semibold text-cream mb-1.5">{p.titulo}</h3>
          <p className="text-sm text-muted leading-relaxed text-pretty">{p.texto}</p>
        </div>
      </li>
    ))}
  </ol>
);

// La tabla se desborda en su propio contenedor: en un móvil de 360 px, tres
// columnas de texto no caben y sin esto la página entera se movería en horizontal.
const Comparativa = ({ columnas, filas }) => (
  <div className="overflow-x-auto -mx-5 px-5 mb-4">
    <table className="w-full min-w-[34rem] border-collapse text-sm">
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className="py-3 pr-4 text-left" />
          {columnas.map((c) => (
            <th key={c} scope="col" className="py-3 pr-4 text-left font-semibold text-cream">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.aspecto} className="border-b border-line align-top">
            <th scope="row" className="py-3 pr-4 text-left font-semibold text-cream">
              {f.aspecto}
            </th>
            <td className="py-3 pr-4 text-muted leading-relaxed">{f.a}</td>
            <td className="py-3 pr-4 text-muted leading-relaxed">{f.b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function Secciones({ secciones }) {
  return secciones.map((s) => (
    <section key={s.h2} className="mt-12">
      <h2 className="font-display text-2xl md:text-[1.75rem] font-bold tracking-[-0.02em] text-cream mb-4 text-balance">
        {s.h2}
      </h2>
      {s.parrafos && <Parrafos textos={s.parrafos} />}
      {s.lista && <Lista items={s.lista} />}
      {s.pasos && <Pasos items={s.pasos} />}
      {s.comparativa && <Comparativa {...s.comparativa} />}
    </section>
  ));
}
