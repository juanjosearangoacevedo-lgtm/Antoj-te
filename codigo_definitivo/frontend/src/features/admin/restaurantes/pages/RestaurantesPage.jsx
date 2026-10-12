import { useEffect, useState } from 'react';
import { Plus, Store, CalendarClock } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { PageTitle, Btn, Tabla, Badge, Modal, Field, Input, Select, ErrorMsg, EstadoVacio, SkeletonPagina } from '@/shared/components/ui';
import { formatoPrecioPlan } from '@/shared/utils/formato';
import MembresiaModal from '../components/MembresiaModal';
import { describirVencimiento } from '../utils/vencimiento';

// 'vencido' lo pone el sistema cuando se agota la gracia tras vencer la
// membresía; sale solo al pagar o al renovarla desde "Membresía".
const TONO_ESTADO = { activo: 'ok', pendiente: 'alerta', suspendido: 'peligro', vencido: 'peligro' };

export default function RestaurantesPage() {
  const [restaurantes, setRestaurantes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [error, setError] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: '', logo_url: '', plan_id: '' });
  const [membresia, setMembresia] = useState(null); // restaurante cuyo cuadro está abierto

  const cargar = () => {
    staffApi.restaurantes
      .listar()
      .then(setRestaurantes)
      .catch((e) => setError(e.message))
      .finally(() => setCargado(true));
    staffApi.planes.listar().then(setPlanes).catch(() => {});
  };
  useEffect(cargar, []);

  const crear = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await staffApi.restaurantes.crear({
        nombre: form.nombre,
        logo_url: form.logo_url || null,
        plan_id: Number(form.plan_id),
      });
      setModalNuevo(false);
      setForm({ nombre: '', logo_url: '', plan_id: '' });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarEstado = async (r, estado) => {
    try {
      await staffApi.restaurantes.cambiarEstado(r.id, estado);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarPlan = async (r, planId) => {
    try {
      await staffApi.restaurantes.cambiarPlan(r.id, Number(planId));
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageTitle
        accion={
          <Btn onClick={() => setModalNuevo(true)}>
            <Plus size={15} className="inline -mt-0.5 mr-1" /> Nuevo restaurante
          </Btn>
        }
      >
        Restaurantes
      </PageTitle>
      <ErrorMsg error={error} />

      {!cargado ? (
        <SkeletonPagina filas={4} />
      ) : restaurantes.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl shadow-sm">
          <EstadoVacio
            icono={Store}
            titulo="Sin restaurantes todavía"
            mensaje="Crea el primero para empezar a operar la plataforma."
            accion={<Btn onClick={() => setModalNuevo(true)}>Nuevo restaurante</Btn>}
          />
        </div>
      ) : (
        <Tabla columnas={['Restaurante', 'Plan', 'Estado', 'Membresía', 'Usuarios', 'Sucursales', 'Acciones']}>
          {restaurantes.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">
                <div className="text-cream font-medium">{r.nombre}</div>
                <div className="text-[11px] text-muted">#{r.id}</div>
              </td>
              <td className="px-4 py-3">
                <select
                  value={r.plan_id || ''}
                  onChange={(e) => cambiarPlan(r, e.target.value)}
                  className="bg-surface2 border border-line rounded-lg px-2 py-1 text-xs text-cream"
                >
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <Badge tono={TONO_ESTADO[r.estado] || 'neutro'}>{r.estado}</Badge>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-xs ${describirVencimiento(r).clase}`}>{describirVencimiento(r).texto}</span>
              </td>
              <td className="px-4 py-3 text-muted">{r.usuarios}</td>
              <td className="px-4 py-3 text-muted">{r.sucursales}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Btn variante="secundario" className="!px-2.5 !py-1 text-xs" onClick={() => setMembresia(r)}>
                    <CalendarClock size={13} /> Membresía
                  </Btn>
                  {r.estado !== 'activo' && r.estado !== 'vencido' && (
                    <Btn variante="secundario" className="!px-2.5 !py-1 text-xs" onClick={() => cambiarEstado(r, 'activo')}>
                      Aprobar
                    </Btn>
                  )}
                  {r.estado !== 'suspendido' && (
                    <Btn variante="peligro" className="!px-2.5 !py-1 text-xs" onClick={() => cambiarEstado(r, 'suspendido')}>
                      Suspender
                    </Btn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
      )}

      <MembresiaModal restaurante={membresia} onCerrar={() => setMembresia(null)} onCambio={cargar} />

      <Modal abierto={modalNuevo} titulo="Nuevo restaurante" onCerrar={() => setModalNuevo(false)}>
        <form onSubmit={crear}>
          <Field label="Nombre">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </Field>
          <Field label="Logo (URL)">
            <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Plan">
            <Select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} required>
              <option value="">Selecciona un plan…</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatoPrecioPlan(p.precio)}/mes
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-muted mb-3">
            Nace con 14 días de prueba gratis. Luego puedes alargarla o renovarla desde “Membresía”.
          </p>
          <Btn type="submit" className="w-full mt-2">Crear restaurante</Btn>
        </form>
      </Modal>
    </div>
  );
}
