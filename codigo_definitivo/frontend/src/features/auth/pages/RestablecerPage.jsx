import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Link2Off } from 'lucide-react';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { Btn, Field, Input, ErrorMsg } from '@/shared/components/ui';
import { authApi } from '../services/authApi';
import PantallaAcceso from '../components/PantallaAcceso';

// Mismo mínimo que el backend (validators/comunes.js → MIN_PASSWORD). Aquí es
// solo para avisar antes de enviar; quien decide es el servidor.
const MIN_PASSWORD = 8;

// El token llega en el FRAGMENTO de la URL (#token=…): el navegador no lo manda
// nunca al servidor, así que no queda en los logs. Si no está (el usuario
// recargó después de que se borrara de la barra), se recupera de sessionStorage.
//
// Leer es PURO a propósito: va en el inicializador de useState, que React
// ejecuta dos veces en desarrollo. Borrarlo de la URL ocurre después, en un efecto.
const CLAVE_SESION = 'bitemo_reset_token';

function leerToken() {
  const delEnlace = new URLSearchParams(window.location.hash.slice(1)).get('token');
  if (delEnlace) return delEnlace;
  try {
    return sessionStorage.getItem(CLAVE_SESION);
  } catch {
    return null; // Sin almacenamiento (modo privado estricto).
  }
}

function olvidarToken() {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    // nada que limpiar
  }
}

// Paso 2 de "olvidé mi contraseña": elegir la nueva con el enlace del correo.
export default function RestablecerPage() {
  const [token] = useState(leerToken);
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  useTituloPagina('Nueva contraseña · Bitemo');

  // Se guarda para sobrevivir a una recarga y se quita de la barra de
  // direcciones, para que no quede en el historial ni en una captura.
  useEffect(() => {
    if (!token) return;
    try {
      sessionStorage.setItem(CLAVE_SESION, token);
    } catch {
      // Sin almacenamiento: solo se pierde la recarga.
    }
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (password !== confirmacion) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    setEnviando(true);
    try {
      await authApi.restablecer(token, password);
      olvidarToken();
      setListo(true);
    } catch (err) {
      // Un enlace muerto no debe volver a aparecer al recargar.
      if (err.status === 400 && err.message.includes('Pide uno nuevo')) olvidarToken();
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const volver = (
    <Link to="/login" className="hover:text-cream underline underline-offset-2">
      Volver a iniciar sesión
    </Link>
  );

  if (listo) {
    return (
      <PantallaAcceso subtitulo="Contraseña actualizada">
        <div className="text-center">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-ok-soft mb-3">
            <CheckCircle2 className="text-ok" size={20} />
          </div>
          <p className="text-sm text-cream mb-5">Listo. Ya puedes entrar con tu contraseña nueva.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2 rounded-xl text-sm font-semibold bg-boton text-botontxt hover:opacity-90"
          >
            Iniciar sesión
          </Link>
        </div>
      </PantallaAcceso>
    );
  }

  if (!token) {
    return (
      <PantallaAcceso subtitulo="Enlace no válido" pie={volver}>
        <div className="text-center">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-danger-soft mb-3">
            <Link2Off className="text-danger" size={20} />
          </div>
          <p className="text-sm text-cream">Este enlace está incompleto o ya no sirve.</p>
          <p className="text-xs text-muted mt-2 mb-5">
            Abre el enlace directamente desde el correo, o pide uno nuevo.
          </p>
          <Link to="/recuperar" className="text-sm font-semibold text-amber underline underline-offset-2">
            Pedir un enlace nuevo
          </Link>
        </div>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso subtitulo="Elige una contraseña nueva" pie={volver}>
      <form onSubmit={onSubmit}>
        <ErrorMsg error={error} />
        <Field label="Contraseña nueva">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
            autoComplete="new-password"
            autoFocus
            required
          />
        </Field>
        <Field label="Repítela">
          <Input
            type="password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Btn type="submit" className="w-full mt-2" cargando={enviando}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Btn>
        {error?.includes('Pide uno nuevo') && (
          <div className="text-center mt-4">
            <Link to="/recuperar" className="text-xs text-amber underline underline-offset-2">
              Pedir un enlace nuevo
            </Link>
          </div>
        )}
      </form>
    </PantallaAcceso>
  );
}
