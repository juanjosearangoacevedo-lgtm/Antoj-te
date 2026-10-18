import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTituloPagina } from '@/shared/hooks/useTituloPagina';
import { Btn, Field, Input, ErrorMsg } from '@/shared/components/ui';
import { esOperacion } from '@/shared/constants/roles';
import PantallaAcceso from '../components/PantallaAcceso';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Sin esto la pestaña heredaría el título de venta de index.html, que es lo
  // que ve un mesero al entrar a trabajar.
  useTituloPagina('Entrar · Antojate');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const usuario = await login(email, password);
      // Cocineros y meseros no tienen panel: van directo a la pantalla de cocina.
      navigate(esOperacion(usuario) ? '/cocina' : '/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso
      subtitulo="Inicia sesión en tu panel"
      pie={
        // Enlace normal y no <Link>: la landing es otra página ya escrita en HTML
        // y así el navegador baja solo hasta el formulario (#contacto).
        <>
          ¿Aún no tienes cuenta?{' '}
          <a href="/#contacto" className="font-semibold text-amber hover:underline">
            Solicítala aquí
          </a>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <ErrorMsg error={error} />
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@restaurante.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>
        <Btn type="submit" className="w-full mt-2" cargando={enviando}>
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </Btn>
        <div className="text-center mt-4">
          {/* Lleva el correo ya escrito: quien acaba de fallar la clave no
              tiene por qué teclearlo otra vez. Va en el estado de la
              navegación, no en la URL, para que no quede en el historial. */}
          <Link
            to="/recuperar"
            state={{ email }}
            className="text-xs text-muted hover:text-cream underline underline-offset-2"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
    </PantallaAcceso>
  );
}
