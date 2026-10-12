import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut } from 'lucide-react';
import { Badge, IconBtn } from '@/shared/components/ui';
import TemaToggle from '@/shared/components/TemaToggle';
import CambiarPasswordModal from '@/features/auth/components/CambiarPasswordModal';
import { ROLES } from '@/shared/constants/roles';

const ETIQUETA_ROL = {
  [ROLES.SUPERADMIN]: 'Superadmin',
  [ROLES.ADMIN_RESTAURANTE]: 'Administrador',
};

// Barra superior: plan contratado, quién está conectado, tema y salida.
export default function AdminHeader({ usuario, plan, esSuper, onLogout }) {
  const navigate = useNavigate();
  const [cambiandoClave, setCambiandoClave] = useState(false);

  return (
    <header className="h-14 shrink-0 border-b border-line flex items-center justify-end gap-4 px-4 md:px-8 sticky top-0 bg-base/85 backdrop-blur z-10">
      {!esSuper && plan && <Badge tono="alerta">Plan {plan.nombre}</Badge>}
      <div className="text-right leading-tight">
        <div className="text-sm font-semibold text-cream">{usuario.nombre}</div>
        <div className="text-[11px] text-muted">
          {ETIQUETA_ROL[usuario.role_nombre] || usuario.role_nombre}
        </div>
      </div>
      <TemaToggle />
      <IconBtn
        icono={KeyRound}
        etiqueta="Cambiar mi contraseña"
        onClick={() => setCambiandoClave(true)}
      />
      <IconBtn
        icono={LogOut}
        etiqueta="Cerrar sesión"
        onClick={() => {
          onLogout();
          navigate('/login');
        }}
      />

      <CambiarPasswordModal abierto={cambiandoClave} onCerrar={() => setCambiandoClave(false)} />
    </header>
  );
}
