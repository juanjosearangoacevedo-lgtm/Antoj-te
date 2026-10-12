import { useEffect, useState } from 'react';
import { CalendarPlus, CalendarCheck, RefreshCw, Ban, Infinity as Infinito } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { Modal, Field, Input, Btn, ErrorMsg } from '@/shared/components/ui';
import { describirVencimiento } from '../utils/vencimiento';

// Ajustes manuales de la membresía de un restaurante (solo superadmin): alargar
// la prueba, registrar un pago hecho por fuera de Wompi (efectivo,
// transferencia), cortar el acceso o dejar una cuenta de cortesía sin fecha.
//
// Cada acción es un botón propio y no un formulario con selector: son pocas,
// con consecuencias distintas, y así se ve de un vistazo qué hace cada una.
export default function MembresiaModal({ restaurante, onCerrar, onCambio }) {
  const [dias, setDias] = useState('14');
  const [fecha, setFecha] = useState('');
  const [trabajando, setTrabajando] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    setTrabajando(null);
    setFecha(restaurante?.fecha_fin ? String(restaurante.fecha_fin).slice(0, 10) : '');
  }, [restaurante]);

  if (!restaurante) return null;

  const aplicar = async (clave, cambio, confirmar) => {
    if (confirmar && !window.confirm(confirmar)) return;
    setError(null);
    setTrabajando(clave);
    try {
      await staffApi.restaurantes.ajustarSuscripcion(restaurante.id, cambio);
      onCambio();
      onCerrar();
    } catch (e) {
      setError(e.message);
    } finally {
      setTrabajando(null);
    }
  };

  const ocupado = trabajando !== null;
  const venc = describirVencimiento(restaurante);

  return (
    <Modal abierto titulo={`Membresía · ${restaurante.nombre}`} onCerrar={onCerrar}>
      <ErrorMsg error={error} />
      <p className="text-sm text-muted mb-5">
        Estado actual: <span className={`font-semibold ${venc.clase}`}>{venc.texto}</span>
      </p>

      <div className="space-y-5">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Sumar días</h3>
          <p className="text-xs text-muted mb-2">
            Se suman a la fecha actual si aún no llegó, o a hoy si ya venció.
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              max="730"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              className="!w-24"
              aria-label="Días a sumar"
            />
            <Btn
              variante="secundario"
              cargando={trabajando === 'dias'}
              disabled={ocupado || !(Number(dias) >= 1)}
              onClick={() => aplicar('dias', { accion: 'sumar_dias', dias: Number(dias) })}
            >
              <CalendarPlus size={15} /> Sumar {dias || 0} días
            </Btn>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Renovar</h3>
          <p className="text-xs text-muted mb-2">
            Para un pago recibido por fuera de Wompi (efectivo, transferencia). Suma el periodo igual
            que un pago en línea.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn
              variante="secundario"
              cargando={trabajando === 'mes'}
              disabled={ocupado}
              onClick={() => aplicar('mes', { accion: 'renovar', periodo: 'mensual' })}
            >
              <RefreshCw size={15} /> 1 mes
            </Btn>
            <Btn
              variante="secundario"
              cargando={trabajando === 'anio'}
              disabled={ocupado}
              onClick={() => aplicar('anio', { accion: 'renovar', periodo: 'anual' })}
            >
              <RefreshCw size={15} /> 1 año
            </Btn>
          </div>
        </section>

        <section>
          <Field label="Vence el">
            <div className="flex gap-2">
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="!w-auto" />
              <Btn
                variante="secundario"
                cargando={trabajando === 'fecha'}
                disabled={ocupado || !fecha}
                onClick={() => aplicar('fecha', { accion: 'fijar_fecha', fecha })}
              >
                <CalendarCheck size={15} /> Fijar fecha
              </Btn>
            </div>
          </Field>
        </section>

        <section className="border-t border-line pt-4 flex flex-wrap gap-2">
          <Btn
            variante="peligro"
            cargando={trabajando === 'vencer'}
            disabled={ocupado}
            onClick={() =>
              aplicar(
                'vencer',
                { accion: 'vencer' },
                `¿Vencer ya la membresía de ${restaurante.nombre}? Su panel se bloquea al instante y su carta pública se apaga en 7 días si no paga.`
              )
            }
          >
            <Ban size={15} /> Vencer ahora
          </Btn>
          <Btn
            variante="fantasma"
            cargando={trabajando === 'sin'}
            disabled={ocupado}
            onClick={() =>
              aplicar(
                'sin',
                { accion: 'sin_vencimiento' },
                `¿Dejar a ${restaurante.nombre} sin fecha de vencimiento? No se le pedirá pagar nunca. Úsalo solo para cuentas de demostración o cortesía.`
              )
            }
          >
            <Infinito size={15} /> Sin vencimiento
          </Btn>
        </section>
      </div>
    </Modal>
  );
}
