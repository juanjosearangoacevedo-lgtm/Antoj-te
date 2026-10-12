import { useEffect, useState } from 'react';
import { Eye, TrendingDown } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import {
  PageTitle,
  ErrorMsg,
  Tabla,
  Badge,
  SkeletonPagina,
  Stat,
  Barras,
  Columnas,
  EstadoVacio,
} from '@/shared/components/ui';
import { formatoMoneda } from '@/shared/utils/formato';
import { useRango } from '@/features/admin/analiticas/hooks/useRango';
import SelectorRango from '@/features/admin/analiticas/components/SelectorRango';

function Seccion({ titulo, ayuda, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-sm font-semibold text-cream mb-1">{titulo}</h2>
      {ayuda && <p className="text-xs text-muted mb-3">{ayuda}</p>}
      {children}
    </section>
  );
}

export default function AnaliticasPage() {
  const { rangoId, setRangoId, query } = useRango();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);

    Promise.all([
      staffApi.analitica.resumen(query),
      staffApi.analitica.productos(query),
      staffApi.analitica.actividad(query),
    ])
      // `vigente` evita que una respuesta lenta de un rango ya abandonado pise a
      // la del rango que el usuario está mirando ahora.
      .then(([resumen, productos, actividad]) => {
        if (vigente) setDatos({ resumen, productos, actividad });
      })
      .catch((e) => vigente && setError(e.message));

    return () => {
      vigente = false;
    };
  }, [query]);

  if (error) return <ErrorMsg error={error} />;

  const selector = <SelectorRango rangoId={rangoId} onCambiar={setRangoId} />;

  if (!datos) {
    return (
      <div>
        <PageTitle descripcion="Qué miran tus comensales y qué acaban pidiendo." accion={selector}>
          Analíticas
        </PageTitle>
        <SkeletonPagina filas={4} />
      </div>
    );
  }

  const { resumen, productos, actividad } = datos;
  const conVistas = productos.productos.filter((p) => p.vistas > 0);

  return (
    <div>
      <PageTitle descripcion="Qué miran tus comensales y qué acaban pidiendo." accion={selector}>
        Analíticas
      </PageTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat etiqueta="Visitantes" valor={resumen.visitantes} detalle="Personas distintas que abrieron la carta" />
        <Stat etiqueta="Pedidos" valor={resumen.pedidos} detalle={`${resumen.cancelados} cancelados`} />
        <Stat etiqueta="Ticket promedio" valor={formatoMoneda(resumen.ticket_promedio)} detalle="Sin contar cancelados" />
        <Stat etiqueta="Conversión" valor={`${resumen.conversion}%`} detalle="De visitante a pedido" />
      </div>

      {/* Nada de "siempre va bajando": `ver_ficha` empezó a medirse el 2026-08-10 y
          sobre datos anteriores sale más bajo que los pasos que le siguen. Prometer
          una forma que el dato aún no tiene hace dudar de todo lo demás. */}
      <Seccion
        titulo="Del QR al pedido"
        ayuda="Cada paso cuenta personas distintas, no clics. Los pasos que empezaron a medirse hace poco tienen menos historia que el resto."
      >
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
          <Barras
            datos={resumen.embudo.map((p) => ({
              etiqueta: p.paso,
              valor: p.sesiones,
              nota: `(${p.porcentaje}%)`,
            }))}
            vacio="Todavía nadie ha recorrido la carta en este periodo."
          />
        </div>
      </Seccion>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Seccion titulo="Los más vistos" ayuda="Platos que más gente se paró a mirar.">
          <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
            <Barras
              datos={resumen.mas_vistos.map((p) => ({ etiqueta: p.nombre, valor: Number(p.vistas) }))}
              vacio="Aún no hay visualizaciones."
            />
          </div>
        </Seccion>

        <Seccion titulo="Los menos vistos" ayuda="Candidatos a mejorar el video, el precio o el orden en la carta.">
          <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
            {resumen.sin_vistas > 0 && (
              <p className="text-xs text-muted mb-3 flex items-center gap-1.5">
                <TrendingDown size={13} />
                {resumen.sin_vistas} plato{resumen.sin_vistas === 1 ? '' : 's'} publicado
                {resumen.sin_vistas === 1 ? '' : 's'} sin una sola visualización.
              </p>
            )}
            <Barras
              datos={resumen.menos_vistos.map((p) => ({ etiqueta: p.nombre, valor: Number(p.vistas) }))}
              vacio="Aún no hay platos publicados que analizar."
            />
          </div>
        </Seccion>
      </div>

      <Seccion titulo="Cuándo hay movimiento" ayuda="Pedidos por hora del día, en todo el periodo.">
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
          <Columnas
            datos={actividad.horas.map((h) => ({
              etiqueta: `${h.hora}:00`,
              corta: String(h.hora).padStart(2, '0'),
              valor: h.pedidos,
            }))}
            vacio="Sin pedidos en este periodo."
          />
          {actividad.cocina.pedidos_medidos > 0 && (
            <p className="text-xs text-muted mt-4 pt-4 border-t border-line">
              Tiempo medio en cocina: <strong className="text-cream">{actividad.cocina.promedio_minutos} min</strong>{' '}
              sobre {actividad.cocina.pedidos_medidos} pedido
              {actividad.cocina.pedidos_medidos === 1 ? '' : 's'}.
            </p>
          )}
        </div>
      </Seccion>

      <Seccion
        titulo="Plato por plato"
        ayuda="Vistas y fichas salen del feed; las unidades, de los pedidos reales."
      >
        {conVistas.length === 0 ? (
          <div className="bg-surface border border-line rounded-2xl shadow-sm">
            <EstadoVacio
              icono={Eye}
              titulo="Todavía no hay datos"
              mensaje="Cuando los comensales empiecen a recorrer la carta desde el QR, aquí verás qué funciona y qué no."
            />
          </div>
        ) : (
          <Tabla columnas={['Plato', 'Vistas', 'Retención', 'Fichas', 'Al carrito', 'Unidades', 'Conversión']}>
            {conVistas.map((p) => (
              <tr key={p.plato_id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-cream">{p.nombre}</div>
                  <div className="text-xs text-muted">{p.categoria}</div>
                </td>
                <td className="px-4 py-3 text-muted tabular-nums">{p.vistas}</td>
                <td className="px-4 py-3 text-muted tabular-nums">{p.retencion}%</td>
                <td className="px-4 py-3 text-muted tabular-nums">{p.fichas}</td>
                <td className="px-4 py-3 text-muted tabular-nums">{p.agregados}</td>
                <td className="px-4 py-3 text-muted tabular-nums">{p.unidades}</td>
                <td className="px-4 py-3">
                  <Badge tono={p.conversion > 0 ? 'ok' : 'neutro'}>{p.conversion}%</Badge>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>
    </div>
  );
}
