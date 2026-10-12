import { NavLink } from 'react-router-dom';

export function NavItem({ to, icono: Icono, children, fin = false, aviso = 0 }) {
  return (
    <NavLink
      to={to}
      end={fin || to === '/admin'}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap shrink-0 transition-colors duration-fast ${
          isActive
            ? 'bg-surface text-cream font-semibold shadow-sm'
            : 'text-muted hover:text-cream hover:bg-surface2'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-amber" />
          )}
          {Icono && <Icono size={17} />}
          <span>{children}</span>
          {/* Contador de cosas sin atender. No hay sistema de notificaciones ni
              correo: esta cifra es lo único que le dice al superadmin que hay
              alguien esperando, sin tener que abrir la pantalla a ver. */}
          {aviso > 0 && (
            <span
              className="ml-auto min-w-5 px-1.5 h-5 grid place-items-center rounded-full bg-boton text-botontxt text-[11px] font-bold tabular-nums"
              aria-label={`${aviso} sin atender`}
            >
              {aviso > 99 ? '99+' : aviso}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
