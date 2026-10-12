import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, MessageCircle, Building2, KeyRound, UserCheck, Ban } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import {
  PageTitle,
  Card,
  Badge,
  Btn,
  Field,
  Select,
  Textarea,
  ErrorMsg,
  EstadoVacio,
  Modal,
} from '@/shared/components/ui';

// Bandeja de entrada de la plataforma: quien pide cuenta y quien solo pide info.
const ESTADOS = [
  { clave: '', etiqueta: 'Todas' },
  { clave: 'nueva', etiqueta: 'Nuevas' },
  { clave: 'contactada', etiqueta: 'Contactadas' },
  { clave: 'aprobada', etiqueta: 'Aprobadas' },
  { clave: 'rechazada', etiqueta: 'Rechazadas' },
  { clave: 'cerrada', etiqueta: 'Cerradas' },
];

// Tonos que existen en Badge: neutro | ok | alerta | peligro.
const TONO = {
  nueva: 'alerta',
  contactada: 'neutro',
  cerrada: 'neutro',
  aprobada: 'ok',
  rechazada: 'peligro',
};

// Ya resuelta: no se puede aprobar ni rechazar dos veces.
const RESUELTA = ['aprobada', 'rechazada'];

const fecha = (iso) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// El teléfono se guarda como lo escribió la persona; para wa.me hay que dejar
// solo dígitos y anteponer el indicativo si no lo trae.
const enlaceWhatsapp = (telefono) => {
  const digitos = String(telefono).replace(/\D/g, '');
  const conIndicativo = digitos.length === 10 ? `57${digitos}` : digitos;
  return `https://wa.me/${conIndicativo}`;
};

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState(null);
  const [notaAbierta, setNotaAbierta] = useState(null);
  const [nota, setNota] = useState('');
  const [planes, setPlanes] = useState([]);
  // La revisión abre un diálogo: aprobar crea un cliente y rechazar le cierra la
  // puerta. Ninguna de las dos debe pasar por tocar un botón sin querer.
  const [revisando, setRevisando] = useState(null); // { solicitud, accion }
  const [planElegido, setPlanElegido] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = (estado = filtro) => {
    setError(null);
    Promise.all([staffApi.solicitudes.listar(estado ? `?estado=${estado}` : ''), staffApi.solicitudes.resumen()])
      .then(([lista, conteo]) => {
        setSolicitudes(lista);
        setResumen(conteo);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    cargar(filtro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  // Los planes se piden una sola vez: hacen falta para elegir con cuál se aprueba.
  useEffect(() => {
    staffApi.planes.listar().then(setPlanes).catch(() => setPlanes([]));
  }, []);

  const abrirRevision = (solicitud, accion) => {
    setError(null);
    setMotivo('');
    setPlanElegido(solicitud.plan_id ? String(solicitud.plan_id) : '');
    setRevisando({ solicitud, accion });
  };

  const confirmarRevision = async () => {
    const { solicitud, accion } = revisando;
    setError(null);
    setGuardando(true);
    try {
      if (accion === 'aprobar') {
        await staffApi.solicitudes.aprobar(solicitud.id, planElegido ? Number(planElegido) : undefined);
      } else {
        await staffApi.solicitudes.rechazar(solicitud.id, motivo || undefined);
      }
      setRevisando(null);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (solicitud, estado) => {
    setError(null);
    try {
      await staffApi.solicitudes.seguimiento(solicitud.id, { estado });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const guardarNota = async (solicitud) => {
    setError(null);
    try {
      await staffApi.solicitudes.seguimiento(solicitud.id, { nota_interna: nota });
      setNotaAbierta(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageTitle descripcion="Quien pide cuenta y quien solo pide información. Aprobar crea el restaurante y su usuario administrador.">
        Solicitudes
      </PageTitle>
      <ErrorMsg error={error} />

      <div className="flex flex-wrap gap-2 mb-6">
        {ESTADOS.map(({ clave, etiqueta }) => (
          <button
            key={clave}
            onClick={() => setFiltro(clave)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-fast ${
              filtro === clave
                ? 'bg-amber text-botontxt border-amber'
                : 'bg-surface text-muted border-line hover:text-cream'
            }`}
          >
            {etiqueta}
            {resumen && clave && <span className="ml-1.5 tabular-nums opacity-70">{resumen[clave]}</span>}
          </button>
        ))}
      </div>

      {solicitudes.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay solicitudes"
          mensaje="Aquí aparecerán los restaurantes que dejen sus datos en la página pública."
        />
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 size={15} className="text-amber shrink-0" />
                    <h2 className="text-base font-bold tracking-tight text-cream">{s.restaurante_nombre}</h2>
                    <Badge tono={TONO[s.estado]}>{s.estado}</Badge>
                  </div>
                  <p className="text-[11px] text-muted mt-1">{fecha(s.creado_en)}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {/* Solo se puede convertir en cuenta lo que trae contraseña. Las
                      del formulario de contacto no la tienen, y ahí el botón no
                      aparece en vez de fallar al pulsarlo. */}
                  {s.email && !RESUELTA.includes(s.estado) && (
                    <Btn className="text-xs px-3 py-1.5" onClick={() => abrirRevision(s, 'aprobar')}>
                      <UserCheck size={13} /> Aprobar
                    </Btn>
                  )}
                  {!RESUELTA.includes(s.estado) && (
                    <Btn
                      variante="peligro"
                      className="text-xs px-3 py-1.5"
                      onClick={() => abrirRevision(s, 'rechazar')}
                    >
                      <Ban size={13} /> Rechazar
                    </Btn>
                  )}
                  {s.estado !== 'contactada' && !RESUELTA.includes(s.estado) && (
                    <Btn variante="secundario" className="text-xs px-3 py-1.5" onClick={() => cambiarEstado(s, 'contactada')}>
                      Marcar contactada
                    </Btn>
                  )}
                  {s.estado !== 'cerrada' && !RESUELTA.includes(s.estado) && (
                    <Btn variante="secundario" className="text-xs px-3 py-1.5" onClick={() => cambiarEstado(s, 'cerrada')}>
                      Cerrar
                    </Btn>
                  )}
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 mt-4 text-sm">
                <span className="inline-flex items-center gap-2 text-muted">
                  <MapPin size={14} className="shrink-0" />
                  <span className="text-cream">
                    {s.ciudad}
                    {s.direccion && <span className="text-muted"> · {s.direccion}</span>}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 text-muted">
                  <Phone size={14} className="shrink-0" />
                  <a href={enlaceWhatsapp(s.telefono)} target="_blank" rel="noopener noreferrer" className="text-cream hover:text-amber">
                    {s.telefono}
                  </a>
                  <MessageCircle size={13} className="text-ok" />
                </span>
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="w-3.5 shrink-0" />
                  Contacto: <span className="text-cream">{s.contacto_nombre}</span>
                </span>
                {s.email && (
                  <span className="inline-flex items-center gap-2 text-muted">
                    <Mail size={14} className="shrink-0" />
                    <a href={`mailto:${s.email}`} className="text-cream hover:text-amber break-all">
                      {s.email}
                    </a>
                    {/* Distingue de un vistazo quién pidió cuenta (trae clave) de
                        quién solo dejó su correo para que lo llamen. */}
                    {!RESUELTA.includes(s.estado) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber">
                        <KeyRound size={11} /> pide cuenta
                      </span>
                    )}
                  </span>
                )}
              </div>

              {s.estado === 'aprobada' && (
                <p className="text-xs text-ok mt-3 inline-flex items-center gap-1.5">
                  <UserCheck size={13} />
                  Cuenta creada · restaurante #{s.restaurante_id} · usuario #{s.usuario_id}
                  {s.revisada_en && <span className="text-muted">· {fecha(s.revisada_en)}</span>}
                </p>
              )}
              {s.estado === 'rechazada' && (
                <p className="text-xs text-danger mt-3 inline-flex items-center gap-1.5">
                  <Ban size={13} />
                  Rechazada{s.motivo_rechazo ? `: ${s.motivo_rechazo}` : ''}
                  {s.revisada_en && <span className="text-muted">· {fecha(s.revisada_en)}</span>}
                </p>
              )}

              {s.mensaje && (
                <p className="text-sm text-muted mt-4 border-l-2 border-line pl-3 leading-relaxed">{s.mensaje}</p>
              )}

              <div className="mt-4 pt-3 border-t border-line">
                {notaAbierta === s.id ? (
                  <div>
                    <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Nota interna…" />
                    <div className="flex gap-2 mt-2">
                      <Btn className="text-xs px-3 py-1.5" onClick={() => guardarNota(s)}>Guardar nota</Btn>
                      <Btn variante="fantasma" className="text-xs px-3 py-1.5" onClick={() => setNotaAbierta(null)}>
                        Cancelar
                      </Btn>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNota(s.nota_interna || '');
                      setNotaAbierta(s.id);
                    }}
                    className="text-xs text-muted hover:text-amber text-left"
                  >
                    {s.nota_interna ? `Nota: ${s.nota_interna}` : '+ Agregar nota interna'}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        abierto={Boolean(revisando)}
        titulo={revisando?.accion === 'aprobar' ? 'Aprobar la cuenta' : 'Rechazar la solicitud'}
        onCerrar={() => setRevisando(null)}
      >
        {revisando && (
          <>
            <ErrorMsg error={error} />

            {revisando.accion === 'aprobar' ? (
              <>
                <p className="text-sm text-muted leading-relaxed mb-5">
                  Se creará el restaurante <strong className="text-cream">{revisando.solicitud.restaurante_nombre}</strong>{' '}
                  y su usuario administrador{' '}
                  <strong className="text-cream">{revisando.solicitud.email}</strong>, que entrará con la contraseña
                  que eligió al solicitarla. El restaurante queda activo de inmediato.
                </p>
                <Field label="Plan">
                  <Select value={planElegido} onChange={(e) => setPlanElegido(e.target.value)}>
                    <option value="">Elige un plan</option>
                    {planes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="text-[11px] text-muted mb-5">
                  {revisando.solicitud.plan_id
                    ? 'Viene preseleccionado el que pidió en la landing. Puedes cambiarlo.'
                    : 'No eligió ninguno en la landing.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  No se creará ninguna cuenta y{' '}
                  <strong className="text-cream">{revisando.solicitud.contacto_nombre}</strong> no podrá iniciar
                  sesión. El motivo queda guardado en la solicitud, no se le envía.
                </p>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Motivo (opcional, para tu registro)"
                />
              </>
            )}

            <div className="flex gap-2 justify-end mt-6">
              <Btn variante="fantasma" onClick={() => setRevisando(null)}>
                Cancelar
              </Btn>
              <Btn
                variante={revisando.accion === 'aprobar' ? 'primario' : 'peligro'}
                cargando={guardando}
                disabled={revisando.accion === 'aprobar' && !planElegido}
                onClick={confirmarRevision}
              >
                {revisando.accion === 'aprobar' ? 'Crear la cuenta' : 'Rechazar'}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
