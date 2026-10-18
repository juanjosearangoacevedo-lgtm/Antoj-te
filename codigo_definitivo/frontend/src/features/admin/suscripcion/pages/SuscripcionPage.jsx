import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, CreditCard, FlaskConical } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageTitle, Card, Btn, Badge, ErrorMsg, Tabla, SkeletonPagina } from '@/shared/components/ui';
import { formatoPrecioPlan } from '@/shared/utils/formato';

// Suscripción del restaurante y pago por Wompi.
//
// Pagar = pedirle al backend una URL firmada del checkout y mandar allí al
// navegador. Wompi lo devuelve aquí con ?id=<transacción>, y esta pantalla le
// pide al backend que confirme con Wompi cómo terminó. La fecha
// de vencimiento solo la mueve el backend; aquí nada se da por pagado.

const METODOS = {
  CARD: 'Tarjeta',
  NEQUI: 'Nequi',
  PSE: 'PSE',
  BANCOLOMBIA_TRANSFER: 'Bancolombia',
  BANCOLOMBIA_QR: 'QR Bancolombia',
  DAVIPLATA: 'Daviplata',
};

const ESTADOS_PAGO = {
  pendiente: { texto: 'En proceso', tono: 'alerta' },
  aprobado: { texto: 'Aprobado', tono: 'ok' },
  rechazado: { texto: 'Rechazado', tono: 'peligro' },
  anulado: { texto: 'Anulado', tono: 'peligro' },
  error: { texto: 'Con error', tono: 'peligro' },
  abandonado: { texto: 'Sin completar', tono: 'neutro' },
};

// Un pago se crea al pulsar "Pagar", antes de ir a Wompi. Si la persona cierra
// el checkout sin pagar, se queda 'pendiente' para siempre: Wompi no avisa de lo
// que nunca empezó. Pasada una hora (PSE, lo más lento, se resuelve en minutos)
// se muestra como "Sin completar" en vez de un "En proceso" eterno.
const UNA_HORA = 60 * 60 * 1000;
function estadoVisible(pago) {
  if (pago.estado !== 'pendiente') return ESTADOS_PAGO[pago.estado] || ESTADOS_PAGO.pendiente;
  const creado = new Date(String(pago.creado_en).replace(' ', 'T')).getTime();
  return Date.now() - creado > UNA_HORA ? ESTADOS_PAGO.abandonado : ESTADOS_PAGO.pendiente;
}

// PSE y algunas transferencias tardan en confirmarse. Se pregunta cada 5 s
// durante un minuto; si aún no hay respuesta, el webhook lo cerrará igual y el
// historial lo reflejará la próxima vez que se abra la pantalla.
const INTERVALO_CONSULTA = 5000;
const MAX_CONSULTAS = 12;

const formatoFecha = (valor) =>
  valor
    ? new Date(String(valor).replace(' ', 'T')).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

function estadoMembresia(s) {
  if (!s) return { texto: 'Sin suscripción', tono: 'neutro' };
  if (s.vencida) return { texto: 'Vencida', tono: 'peligro' };
  if (s.dias_restantes === null) return { texto: 'Sin vencimiento', tono: 'ok' };
  if (s.por_vencer) return { texto: 'Por vencer', tono: 'alerta' };
  return { texto: 'Activa', tono: 'ok' };
}

// Aviso con el resultado del pago al volver de Wompi.
function ResultadoPago({ resultado }) {
  if (!resultado) return null;
  const { estado, suscripcion, agotado } = resultado;

  if (estado === 'consultando' || (estado === 'pendiente' && !agotado)) {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm bg-accent-soft text-amber-soft">
        <Clock size={16} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Confirmando tu pago…</span>
          <p className="opacity-90 mt-0.5">
            Estamos esperando la confirmación de Wompi. Con PSE puede tardar un par de minutos.
          </p>
        </div>
      </div>
    );
  }

  if (estado === 'pendiente') {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm bg-accent-soft text-amber-soft">
        <Clock size={16} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Tu pago sigue en proceso</span>
          <p className="opacity-90 mt-0.5">
            Cuando Wompi lo confirme, tu membresía se extiende sola. No hace falta que pagues de nuevo.
          </p>
        </div>
      </div>
    );
  }

  if (estado === 'aprobado') {
    const hasta = formatoFecha(suscripcion?.fecha_fin);
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm bg-ok-soft text-ok">
        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Pago aprobado. ¡Gracias!</span>
          {hasta && <p className="opacity-90 mt-0.5">Tu membresía queda activa hasta el {hasta}.</p>}
        </div>
      </div>
    );
  }

  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm bg-danger-soft text-danger">
      <XCircle size={16} className="shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold">El pago no se completó</span>
        <p className="opacity-90 mt-0.5">No se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago.</p>
      </div>
    </div>
  );
}

function OpcionPago({ titulo, detalle, precio, ahorro, onPagar, cargando, deshabilitado }) {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="text-sm font-semibold text-cream">{titulo}</div>
        <div className="text-xs text-muted mt-0.5">{detalle}</div>
      </div>
      <div className="text-2xl font-bold tracking-tight text-cream">{formatoPrecioPlan(precio)}</div>
      {ahorro > 0 && <div className="text-xs text-ok">Ahorras {formatoPrecioPlan(ahorro)}</div>}
      <Btn onClick={onPagar} cargando={cargando} disabled={deshabilitado} className="mt-auto">
        <CreditCard size={16} /> Pagar {formatoPrecioPlan(precio)}
      </Btn>
    </Card>
  );
}

export default function SuscripcionPage() {
  const { refrescarSesion } = useAuth();
  const [params, setParams] = useSearchParams();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [resultado, setResultado] = useState(null);
  const vigente = useRef(true);

  const cargar = useCallback(() => {
    return staffApi.pagos
      .resumen()
      .then((r) => vigente.current && setDatos(r))
      .catch((e) => vigente.current && setError(e.message));
  }, []);

  useEffect(() => {
    vigente.current = true;
    cargar();
    return () => {
      vigente.current = false;
    };
  }, [cargar]);

  // Vuelta del checkout. Los parámetros se guardan al montar y se limpian de la
  // URL para que recargar la página no vuelva a mostrar el aviso. Se guardan en
  // estado y no se leen de `params` en el efecto: limpiarlos cambiaría sus
  // dependencias y la limpieza del efecto cortaría la consulta a medias.
  const [transaccionId] = useState(() => params.get('id'));
  useEffect(() => {
    if (!transaccionId) return undefined;
    setParams({}, { replace: true });
    setResultado({ estado: 'consultando' });

    let intentos = 0;
    let temporizador;
    const consultar = async () => {
      intentos += 1;
      try {
        const r = await staffApi.pagos.consultar(transaccionId);
        if (!vigente.current) return;
        const agotado = r.estado === 'pendiente' && intentos >= MAX_CONSULTAS;
        setResultado({ ...r, agotado });
        if (r.estado === 'pendiente' && !agotado) {
          temporizador = setTimeout(consultar, INTERVALO_CONSULTA);
          return;
        }
        // Terminó: el aviso del panel y el historial tienen que enterarse.
        cargar();
        refrescarSesion().catch(() => {});
      } catch (e) {
        if (vigente.current) {
          setResultado(null);
          setError(e.message);
        }
      }
    };
    consultar();
    return () => clearTimeout(temporizador);
    // Solo al montar: es la llegada desde Wompi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pagar = async (periodo) => {
    setError(null);
    setPagando(periodo);
    try {
      const { url } = await staffApi.pagos.iniciar(periodo);
      window.location.assign(url);
    } catch (e) {
      setError(e.message);
      setPagando(null);
    }
  };

  if (!datos && !error) return <SkeletonPagina />;

  const suscripcion = datos?.suscripcion;
  const membresia = estadoMembresia(suscripcion);
  const plan = datos?.plan;
  const ahorroAnual = plan?.precio_anual ? plan.precio * 12 - plan.precio_anual : 0;
  const puedePagar = Boolean(datos?.disponible && plan);

  return (
    <div>
      <PageTitle descripcion="Tu plan, cuándo vence y el pago de la membresía.">Suscripción</PageTitle>

      <ResultadoPago resultado={resultado} />
      <ErrorMsg error={error} />

      {datos && (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted">Plan actual</div>
                <div className="text-lg font-semibold text-cream">{plan?.nombre || 'Sin plan'}</div>
              </div>
              <Badge tono={membresia.tono}>{membresia.texto}</Badge>
            </div>
            {suscripcion?.fecha_fin && (
              <p className="text-sm text-muted mt-3">
                {suscripcion.vencida ? 'Venció el ' : 'Vence el '}
                <span className="text-cream">{formatoFecha(suscripcion.fecha_fin)}</span>
                {!suscripcion.vencida && suscripcion.dias_restantes !== null && (
                  <>
                    {' '}
                    ({suscripcion.dias_restantes === 0
                      ? 'hoy'
                      : `en ${suscripcion.dias_restantes} día${suscripcion.dias_restantes === 1 ? '' : 's'}`}
                    )
                  </>
                )}
              </p>
            )}
            {suscripcion?.vencida && (
              <p className="text-sm text-danger mt-2">
                {suscripcion.carta_apagada
                  ? 'Tu carta pública y tus QR están apagados. Se reactivan en cuanto se confirme el pago.'
                  : `Tu panel está bloqueado. Tu carta pública sigue visible para tus clientes${
                      suscripcion.gracia_hasta ? ` hasta el ${formatoFecha(suscripcion.gracia_hasta)}` : ''
                    }; después se apaga.`}
              </p>
            )}
          </Card>

          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-cream">Renovar</h2>
            {datos.sandbox && (
              <Badge tono="alerta">
                <span className="inline-flex items-center gap-1">
                  <FlaskConical size={11} /> Modo de prueba
                </span>
              </Badge>
            )}
          </div>

          {!datos.disponible && (
            <p className="text-sm text-muted mb-4">
              El pago en línea se activará muy pronto. Mientras tanto, escríbele al equipo de Antojate para renovar.
            </p>
          )}

          {plan && plan.precio > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 mb-3">
              <OpcionPago
                titulo="Mensual"
                detalle="Suma 1 mes a tu membresía"
                precio={plan.precio}
                onPagar={() => pagar('mensual')}
                cargando={pagando === 'mensual'}
                deshabilitado={!puedePagar || pagando !== null}
              />
              {plan.precio_anual && (
                <OpcionPago
                  titulo="Anual"
                  detalle="Suma 12 meses a tu membresía"
                  precio={plan.precio_anual}
                  ahorro={ahorroAnual}
                  onPagar={() => pagar('anual')}
                  cargando={pagando === 'anual'}
                  deshabilitado={!puedePagar || pagando !== null}
                />
              )}
            </div>
          )}
          <p className="text-xs text-muted mb-8">
            Pagas con Nequi, PSE, tarjeta o Bancolombia en la página segura de Wompi. Si renuevas antes de
            tiempo no pierdes días: el periodo se suma a tu fecha actual.
          </p>

          <h2 className="text-sm font-semibold text-cream mb-3">Historial de pagos</h2>
          {datos.pagos.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay pagos en línea.</p>
          ) : (
            <Tabla columnas={['Fecha', 'Periodo', 'Monto', 'Medio', 'Estado']}>
              {datos.pagos.map((p) => {
                const est = estadoVisible(p);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{formatoFecha(p.creado_en)}</td>
                    <td className="px-4 py-3 capitalize">{p.periodo}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatoPrecioPlan(p.monto)}</td>
                    <td className="px-4 py-3 text-muted">{METODOS[p.metodo] || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tono={est.tono}>{est.texto}</Badge>
                    </td>
                  </tr>
                );
              })}
            </Tabla>
          )}
        </>
      )}
    </div>
  );
}
