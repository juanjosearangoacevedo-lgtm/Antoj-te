import { useState } from 'react';
import { Check, KeyRound } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { Modal, Field, Input, Btn, ErrorMsg } from '@/shared/components/ui';
import { setToken } from '@/shared/services/token';

// Debe coincidir con passwordNueva en backend/src/validators/comunes.js. Se
// comprueba aquí además de allí para avisar mientras se escribe, no al enviar.
const MIN = 8;

/**
 * Cambio de contraseña, en dos modos:
 *
 *   sin `usuario`  → la propia. Pide la ACTUAL, porque un token robado no debe
 *                    bastar para quedarse con la cuenta.
 *   con `usuario`  → la de otra persona del equipo. No pide la actual: quien
 *                    restablece es un admin y no tiene por qué saberla.
 */
export default function CambiarPasswordModal({ abierto, onCerrar, usuario }) {
  const esPropia = !usuario;
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const limpiar = () => {
    setActual('');
    setNueva('');
    setRepetida('');
    setError(null);
    setListo(false);
  };

  const cerrar = () => {
    limpiar();
    onCerrar();
  };

  // Se comprueba aquí y no solo con `required`: el navegador no sabe comparar
  // dos campos entre sí, y una clave mal tecleada dos veces deja fuera al dueño
  // de la cuenta sin que nadie se entere hasta el siguiente intento de entrar.
  const noCoinciden = repetida.length > 0 && nueva !== repetida;
  const corta = nueva.length > 0 && nueva.length < MIN;
  const puedeEnviar =
    nueva.length >= MIN && nueva === repetida && (!esPropia || actual.length > 0) && !enviando;

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (esPropia) {
        // Cambiar la clave cierra todas las sesiones de la cuenta, esta incluida;
        // el backend devuelve un token nuevo para que quien la cambió siga dentro.
        const { token } = await staffApi.cambiarPassword(actual, nueva);
        if (token) setToken(token);
      } else await staffApi.usuarios.restablecerPassword(usuario.id, nueva);
      setListo(true);
      setTimeout(cerrar, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      titulo={esPropia ? 'Cambiar mi contraseña' : `Restablecer la contraseña de ${usuario?.nombre}`}
      onCerrar={cerrar}
    >
      {listo ? (
        <div className="py-6 text-center">
          <div className="grid place-items-center w-12 h-12 mx-auto rounded-full bg-accent-soft mb-3">
            <Check className="text-ok" size={22} />
          </div>
          <p className="text-cream font-semibold">Contraseña actualizada</p>
          <p className="text-sm text-muted mt-1">
            {esPropia
              ? 'Úsala la próxima vez que entres.'
              : `${usuario?.nombre} ya puede entrar con la nueva.`}
          </p>
        </div>
      ) : (
        <form onSubmit={enviar}>
          <ErrorMsg error={error} />

          {esPropia && (
            <Field label="Contraseña actual">
              <Input
                type="password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
          )}

          <Field label="Contraseña nueva">
            <Input
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password"
              minLength={MIN}
              invalido={corta || undefined}
              required
            />
          </Field>
          {corta && (
            <p className="text-[11px] text-danger -mt-2 mb-3">Al menos {MIN} caracteres.</p>
          )}

          <Field label="Repite la contraseña nueva">
            <Input
              type="password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              autoComplete="new-password"
              invalido={noCoinciden || undefined}
              required
            />
          </Field>
          {noCoinciden && (
            <p className="text-[11px] text-danger -mt-2 mb-3">Las dos no coinciden.</p>
          )}

          {!esPropia && (
            <p className="text-[11px] text-muted mb-4">
              Dísela en persona y pídele que la cambie desde su propia sesión.
            </p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Btn type="button" variante="fantasma" onClick={cerrar} disabled={enviando}>
              Cancelar
            </Btn>
            <Btn type="submit" cargando={enviando} disabled={!puedeEnviar}>
              <KeyRound size={15} /> Guardar
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}
