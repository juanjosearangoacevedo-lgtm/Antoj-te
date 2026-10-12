import { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, Users } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import CambiarPasswordModal from '@/features/auth/components/CambiarPasswordModal';
import { PageTitle, Btn, Tabla, Badge, Modal, Field, Input, Select, ErrorMsg, EstadoVacio, SkeletonPagina, IconBtn } from '@/shared/components/ui';
import { ROLES, esSuperadmin } from '@/shared/constants/roles';

const FORM_VACIO = { nombre: '', email: '', password: '', role_id: '', restaurante_id: '' };

const TONO_ROL = {
  [ROLES.SUPERADMIN]: 'peligro',
  [ROLES.ADMIN_RESTAURANTE]: 'alerta',
};

// Superadmin: gestiona administradores de cada restaurante.
// Admin restaurante: gestiona su propio equipo (cocineros, meseros).
export default function UsuariosPage() {
  const { usuario } = useAuth();
  const esSuper = esSuperadmin(usuario);

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [error, setError] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  // Usuario al que se le está restableciendo la clave, o null.
  const [restableciendo, setRestableciendo] = useState(null);

  const cargar = () => {
    staffApi.usuarios
      .listar()
      .then(setUsuarios)
      .catch((e) => setError(e.message))
      .finally(() => setCargado(true));
    staffApi.roles().then(setRoles).catch(() => {});
    if (esSuper) staffApi.restaurantes.listar().then(setRestaurantes).catch(() => {});
  };
  useEffect(cargar, []);

  // El admin de restaurante no puede crear superadmins ni otros con rol superior
  const rolesPermitidos = roles.filter((r) =>
    esSuper ? true : [ROLES.COCINERO, ROLES.MESERO, ROLES.ADMIN_RESTAURANTE].includes(r.nombre_rol)
  );

  const crear = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await staffApi.usuarios.crear({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        role_id: Number(form.role_id),
        ...(esSuper && form.restaurante_id ? { restaurante_id: Number(form.restaurante_id) } : {}),
      });
      setModal(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (u) => {
    if (!confirm(`¿Eliminar al usuario ${u.nombre}?`)) return;
    try {
      await staffApi.usuarios.eliminar(u.id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageTitle
        accion={
          <Btn onClick={() => setModal(true)}>
            <Plus size={15} className="inline -mt-0.5 mr-1" /> Nuevo usuario
          </Btn>
        }
      >
        {esSuper ? 'Usuarios de la plataforma' : 'Mi equipo'}
      </PageTitle>
      <ErrorMsg error={error} />

      {!cargado ? (
        <SkeletonPagina filas={4} />
      ) : usuarios.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl shadow-sm">
          <EstadoVacio
            icono={Users}
            titulo={esSuper ? 'Sin usuarios registrados' : 'Tu equipo está vacío'}
            mensaje="Crea el primer usuario para dar acceso al panel."
            accion={<Btn onClick={() => setModal(true)}>Nuevo usuario</Btn>}
          />
        </div>
      ) : (
        <Tabla columnas={['Usuario', 'Email', 'Rol', esSuper ? 'Restaurante' : null, ''].filter(Boolean)}>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 text-cream">{u.nombre}</td>
              <td className="px-4 py-3 text-muted">{u.email}</td>
              <td className="px-4 py-3">
                <Badge tono={TONO_ROL[u.nombre_rol] || 'neutro'}>
                  {u.nombre_rol}
                </Badge>
              </td>
              {esSuper && <td className="px-4 py-3 text-muted">{u.restaurante_id ? `#${u.restaurante_id}` : '—'}</td>}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {/* La propia no se restablece desde aquí: va por la llave de la
                      cabecera, que sí pide la contraseña actual. */}
                  {u.id !== usuario.id && (
                    <>
                      <IconBtn
                        icono={KeyRound}
                        tam={15}
                        etiqueta={`Restablecer la contraseña de ${u.nombre}`}
                        onClick={() => setRestableciendo(u)}
                      />
                      <IconBtn
                        icono={Trash2}
                        tam={15}
                        etiqueta="Eliminar usuario"
                        className="hover:!text-danger hover:!bg-danger-soft"
                        onClick={() => eliminar(u)}
                      />
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
      )}

      <Modal abierto={modal} titulo="Nuevo usuario" onCerrar={() => setModal(false)}>
        <form onSubmit={crear}>
          <Field label="Nombre">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </Field>
          <Field label="Rol">
            <Select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} required>
              <option value="">Selecciona un rol…</option>
              {rolesPermitidos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre_rol}
                </option>
              ))}
            </Select>
          </Field>
          {esSuper && (
            <Field label="Restaurante (vacío = usuario global)">
              <Select value={form.restaurante_id} onChange={(e) => setForm({ ...form, restaurante_id: e.target.value })}>
                <option value="">— Sin restaurante —</option>
                {restaurantes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Btn type="submit" className="w-full mt-2">Crear usuario</Btn>
        </form>
      </Modal>

      <CambiarPasswordModal
        abierto={!!restableciendo}
        usuario={restableciendo}
        onCerrar={() => setRestableciendo(null)}
      />
    </div>
  );
}
