import { useEffect, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import {
  PageTitle,
  ErrorMsg,
  Tabla,
  EstadoVacio,
  Badge,
  SkeletonPagina,
  Stat,
  Barras,
} from '@/shared/components/ui';
import { formatoPrecioPlan } from '@/shared/utils/formato';

export default function DashboardGlobalPage() {
  const [stats, setStats] = useState(null);
  const [uso, setUso] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([staffApi.plataforma.estadisticas(), staffApi.analitica.plataforma()])
      .then(([s, u]) => {
        setStats(s);
        setUso(u);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorMsg error={error} />;
  if (!stats || !uso) return <SkeletonPagina filas={4} />;

  return (
    <div>
      <PageTitle descripcion="Estado global de la plataforma en tiempo real.">Dashboard</PageTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat
          etiqueta="MRR estimado"
          valor={formatoPrecioPlan(stats.mrr_estimado)}
          detalle="Planes de restaurantes activos"
        />
        <Stat
          etiqueta="Pedidos"
          valor={stats.pedidos.total}
          detalle={`${stats.pedidos.hoy || 0} hoy · ${stats.pedidos.ultimos_30_dias || 0} en 30 días`}
        />
        <Stat
          etiqueta="Restaurantes"
          valor={stats.restaurantes.total}
          detalle={`${stats.restaurantes.activos || 0} activos · ${stats.restaurantes.pendientes || 0} pendientes · ${stats.restaurantes.suspendidos || 0} suspendidos`}
        />
        <Stat etiqueta="Usuarios" valor={stats.usuarios.total} detalle="Staff en toda la plataforma" />
      </div>

      {/* Uso real, no solo altas: un restaurante que paga y no recibe una sola
          visita es el que se da de baja el mes que viene. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat etiqueta="Visitantes" valor={uso.total_visitantes} detalle="Comensales distintos · 30 días" />
        <Stat etiqueta="Pedidos" valor={uso.total_pedidos} detalle="En toda la plataforma · 30 días" />
        <Stat
          etiqueta="Sin actividad"
          valor={uso.sin_actividad.length}
          detalle="Restaurantes activos sin una sola visita"
        />
        <Stat
          etiqueta="Altas"
          valor={uso.altas_por_mes.reduce((acc, m) => acc + Number(m.altas), 0)}
          detalle="Restaurantes nuevos · 12 meses"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div>
          <h2 className="text-sm font-semibold text-cream mb-1">Quién usa más Bitemo</h2>
          <p className="text-xs text-muted mb-3">Comensales distintos en los últimos 30 días.</p>
          <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
            <Barras
              datos={uso.mas_activos.map((r) => ({
                etiqueta: r.nombre,
                valor: r.visitantes,
                nota: `· ${r.pedidos} ped.`,
              }))}
              vacio="Todavía no hay actividad registrada."
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-cream mb-1">Necesitan una llamada</h2>
          <p className="text-xs text-muted mb-3">Activos y pagando, pero sin visitas ni pedidos en 30 días.</p>
          {uso.sin_actividad.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl shadow-sm">
              <EstadoVacio
                icono={ReceiptText}
                titulo="Todos con movimiento"
                mensaje="Ningún restaurante activo lleva 30 días sin recibir una sola visita."
              />
            </div>
          ) : (
            <Tabla columnas={['Restaurante', 'Plan', 'Estado']}>
              {uso.sin_actividad.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-cream">{r.nombre}</td>
                  <td className="px-4 py-3 text-muted">{r.plan}</td>
                  <td className="px-4 py-3">
                    <Badge tono="alerta">Sin actividad</Badge>
                  </td>
                </tr>
              ))}
            </Tabla>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-semibold text-cream mb-3">Restaurantes por plan</h2>
          <Tabla columnas={['Plan', 'Precio', 'Restaurantes']}>
            {stats.por_plan.map((p) => (
              <tr key={p.plan_id}>
                <td className="px-4 py-3 font-medium text-cream">{p.plan_nombre}</td>
                <td className="px-4 py-3 text-muted tabular-nums">{formatoPrecioPlan(p.precio)}/mes</td>
                <td className="px-4 py-3">
                  <Badge tono={p.restaurantes > 0 ? 'ok' : 'neutro'}>{p.restaurantes}</Badge>
                </td>
              </tr>
            ))}
          </Tabla>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-cream mb-3">Top restaurantes (30 días)</h2>
          {stats.top_restaurantes_30_dias.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl shadow-sm">
              <EstadoVacio
                icono={ReceiptText}
                titulo="Aún no hay pedidos"
                mensaje="Cuando los comensales empiecen a ordenar, aquí verás los restaurantes con más movimiento."
              />
            </div>
          ) : (
            <Tabla columnas={['Restaurante', 'Pedidos', 'Ventas']}>
              {stats.top_restaurantes_30_dias.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-cream">{r.nombre}</td>
                  <td className="px-4 py-3 text-muted tabular-nums">{r.pedidos}</td>
                  <td className="px-4 py-3 text-muted tabular-nums">${Number(r.ventas).toLocaleString()}</td>
                </tr>
              ))}
            </Tabla>
          )}
        </div>
      </div>
    </div>
  );
}
