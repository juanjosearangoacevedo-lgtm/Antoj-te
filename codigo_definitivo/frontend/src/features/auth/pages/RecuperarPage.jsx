import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { Btn, Field, Input, ErrorMsg } from '@/shared/components/ui';
import { authApi } from '../services/authApi';
import PantallaAcceso from '../components/PantallaAcceso';

// Paso 1 de "olvidé mi contraseña": pedir el enlace por correo.
//
// La respuesta es la misma exista o no la cuenta, a propósito (si dijera "ese
// correo no existe", el formulario serviría para descubrir quién es cliente).
// Por eso la pantalla de éxito habla en condicional.
export default function RecuperarPage() {
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || '');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useTituloPagina('Recuperar contraseña · Antojate');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await authApi.recuperar(email);
      setEnviado(true);
    } catch (err) {
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

  if (enviado) {
    return (
      <PantallaAcceso subtitulo="Revisa tu correo" pie={volver}>
        <div className="text-center">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-ok-soft mb-3">
            <MailCheck className="text-ok" size={20} />
          </div>
          <p className="text-sm text-cream">
            Si <span className="font-semibold break-all">{email}</span> tiene una cuenta en Antojate, te
            enviamos un enlace para elegir una contraseña nueva.
          </p>
          <p className="text-xs text-muted mt-3">
            El enlace vale por una hora. Si no lo ves en unos minutos, revisa la carpeta de spam o
            promociones.
          </p>
        </div>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso subtitulo="Recupera el acceso a tu panel" pie={volver}>
      <form onSubmit={onSubmit}>
        <p className="text-sm text-muted mb-4">
          Escribe el correo con el que entras y te enviaremos un enlace para elegir una contraseña nueva.
        </p>
        <ErrorMsg error={error} />
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@restaurante.com"
            autoComplete="email"
            autoFocus
            required
          />
        </Field>
        <Btn type="submit" className="w-full mt-2" cargando={enviando}>
          {enviando ? 'Enviando…' : 'Enviar enlace'}
        </Btn>
      </form>
    </PantallaAcceso>
  );
}
