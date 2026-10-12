import { useEffect, useState } from 'react';
import { MessageCircle, Check, Send, Clock } from 'lucide-react';
import { Btn, Field, Input, Select, Textarea, ErrorMsg } from '@/shared/components/ui';
import { enviarSolicitud } from '@/features/landing/services/solicitudesApi';
import { usePlanes } from '@/features/landing/hooks/usePlanes';
import { WHATSAPP_URL, WHATSAPP_VISIBLE } from '@/features/landing/contenido/contacto';
import MascotaBitemo from './marca/MascotaBitemo';

const FORM_VACIO = {
  restaurante_nombre: '',
  ciudad: '',
  direccion: '',
  contacto_nombre: '',
  telefono: '',
  email: '',
  password: '',
  password_confirmacion: '',
  plan_id: '',
  mensaje: '',
  trampa: '',
};

// Un solo formulario con dos intenciones, y no dos formularios: los campos del
// restaurante son los mismos, y separarlos obligaría al superadmin a vigilar dos
// bandejas de entrada. Quien solo quiere preguntar no ve los campos de la cuenta.
const MODOS = [
  { id: 'cuenta', etiqueta: 'Quiero mi cuenta' },
  { id: 'contacto', etiqueta: 'Solo quiero información' },
];

export default function Contacto({ planPreseleccionado }) {
  const [modo, setModo] = useState('cuenta');
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);
  const { planes } = usePlanes();

  const creaCuenta = modo === 'cuenta';

  // Al pulsar "Solicitar una cuenta" en una tarjeta de precios llega su plan:
  // se preselecciona y se pasa al modo cuenta, para que no haya que repetirlo.
  useEffect(() => {
    if (!planPreseleccionado) return;
    setModo('cuenta');
    setForm((f) => ({ ...f, plan_id: String(planPreseleccionado) }));
  }, [planPreseleccionado]);

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);

    // Se comprueba aquí para avisar al instante, pero el backend lo revalida:
    // este formulario no es la única puerta a ese endpoint.
    if (creaCuenta && form.password !== form.password_confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setEnviando(true);
    try {
      // En modo contacto NO se mandan las claves: el backend distingue las dos
      // intenciones por si viene contraseña o no.
      const { password, password_confirmacion, plan_id, ...datos } = form;
      await enviarSolicitud(
        creaCuenta
          ? { ...datos, password, password_confirmacion, plan_id: plan_id || undefined }
          : datos
      );
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section id="contacto" className="border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-16 items-start">
          <div className="text-center lg:text-left">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] text-cream text-balance">
              ¿Hablamos de tu restaurante?
            </h2>
            <p className="text-muted text-base mt-4 leading-relaxed text-pretty">
              Déjanos los datos y te contactamos para mostrarte cómo se vería tu carta en video. Sin compromiso.
            </p>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-ok bg-ok-soft px-5 py-3.5 text-sm font-semibold text-cream transition-colors duration-fast hover:brightness-110"
            >
              <MessageCircle size={18} className="text-ok shrink-0" />
              <span className="text-left">
                Escríbenos por WhatsApp
                <span className="block text-xs font-normal text-muted">{WHATSAPP_VISIBLE}</span>
              </span>
            </a>

            <MascotaBitemo expresion="feliz" className="mx-auto lg:mx-0 mt-10 hidden lg:block w-36" />
          </div>

          {enviado ? (
            <div className="tarjeta-destacada rounded-[1.75rem] p-8 text-center shadow-card">
              <span
                className={`mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full ${
                  creaCuenta ? 'bg-accent-soft text-amber' : 'bg-ok-soft text-ok'
                }`}
              >
                {creaCuenta ? <Clock size={26} /> : <Check size={26} />}
              </span>
              <h3 className="font-display text-2xl font-bold text-cream mb-3">
                {creaCuenta ? 'Solicitud enviada' : `¡Listo, ${form.contacto_nombre}!`}
              </h3>
              {/* Se dice explícitamente que TODAVÍA no puede entrar. Si aquí
                  pusiera "cuenta creada", intentaría iniciar sesión, fallaría y
                  pensaría que algo se rompió. */}
              <p className="text-muted text-sm leading-relaxed max-w-sm mx-auto">
                {creaCuenta ? (
                  <>
                    Recibimos la solicitud de {form.restaurante_nombre}. La revisamos a mano y te avisamos a{' '}
                    <strong className="text-cream">{form.email}</strong> en cuanto la cuenta esté activa. Hasta
                    entonces todavía no podrás iniciar sesión.
                  </>
                ) : (
                  <>
                    Recibimos los datos de {form.restaurante_nombre}. Te contactamos al {form.telefono} muy pronto.
                    Si prefieres no esperar, escríbenos por WhatsApp.
                  </>
                )}
              </p>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-6">
                <Btn variante="secundario" className="px-6 py-3">
                  <MessageCircle size={16} />
                  Abrir WhatsApp
                </Btn>
              </a>
            </div>
          ) : (
            <form onSubmit={enviar} className="tarjeta-landing rounded-[1.75rem] p-6 sm:p-8 shadow-card">
              <div className="inline-flex rounded-xl border border-line bg-surface p-1 mb-6" role="group">
                {MODOS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModo(m.id)}
                    aria-pressed={modo === m.id}
                    className={`px-3.5 py-1.5 text-sm rounded-lg transition-colors duration-fast ${
                      modo === m.id ? 'bg-boton text-botontxt font-semibold' : 'text-muted hover:text-cream'
                    }`}
                  >
                    {m.etiqueta}
                  </button>
                ))}
              </div>

              <ErrorMsg error={error} />

              <div className="grid gap-x-5 sm:grid-cols-2">
                <Field label="Nombre del restaurante">
                  <Input value={form.restaurante_nombre} onChange={cambiar('restaurante_nombre')} required maxLength={150} />
                </Field>
                <Field label="Ciudad">
                  <Input value={form.ciudad} onChange={cambiar('ciudad')} required maxLength={100} placeholder="Medellín" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Dirección (opcional)">
                    <Input value={form.direccion} onChange={cambiar('direccion')} maxLength={255} />
                  </Field>
                </div>
                <Field label="Tu nombre">
                  <Input value={form.contacto_nombre} onChange={cambiar('contacto_nombre')} required maxLength={150} />
                </Field>
                <Field label="Teléfono / WhatsApp">
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.telefono}
                    onChange={cambiar('telefono')}
                    required
                    maxLength={30}
                    placeholder="300 000 0000"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={creaCuenta ? 'Correo (con el que entrarás)' : 'Correo (opcional)'}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={cambiar('email')}
                      required={creaCuenta}
                      maxLength={150}
                      autoComplete="email"
                    />
                  </Field>
                </div>

                {creaCuenta && (
                  <>
                    <Field label="Contraseña">
                      <Input
                        type="password"
                        value={form.password}
                        onChange={cambiar('password')}
                        required
                        minLength={8}
                        maxLength={200}
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                      />
                    </Field>
                    <Field label="Repite la contraseña">
                      <Input
                        type="password"
                        value={form.password_confirmacion}
                        onChange={cambiar('password_confirmacion')}
                        required
                        minLength={8}
                        maxLength={200}
                        autoComplete="new-password"
                      />
                    </Field>
                    {planes?.length > 0 && (
                      <div className="sm:col-span-2">
                        <Field label="Plan que te interesa">
                          <Select value={form.plan_id} onChange={cambiar('plan_id')}>
                            <option value="">Que nos lo recomienden</option>
                            {planes.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                    )}
                  </>
                )}

                <div className="sm:col-span-2">
                  <Field label="¿Algo que quieras contarnos? (opcional)">
                    <Textarea value={form.mensaje} onChange={cambiar('mensaje')} maxLength={1000} rows={3} />
                  </Field>
                </div>
              </div>

              {/* Trampa para bots: una persona nunca lo ve ni lo llena. Va oculto
                  con CSS (no con type=hidden) porque los bots rellenan lo que
                  encuentran en el DOM. aria-hidden + tabIndex lo sacan del paso
                  de quien navega con teclado o lector de pantalla. */}
              <div className="campo-trampa" aria-hidden="true">
                <label>
                  No llenes este campo
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.trampa}
                    onChange={cambiar('trampa')}
                  />
                </label>
              </div>

              <Btn type="submit" cargando={enviando} className="w-full py-3 mt-2">
                {!enviando && <Send size={16} />}
                {enviando ? 'Enviando…' : creaCuenta ? 'Solicitar mi cuenta' : 'Quiero que me contacten'}
              </Btn>

              <p className="text-[11px] text-muted text-center mt-4 leading-relaxed">
                {creaCuenta
                  ? 'Revisamos cada solicitud a mano antes de activar la cuenta. Te avisamos en cuanto esté lista.'
                  : 'Usamos estos datos únicamente para contactarte sobre Bitemo.'}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
