import { useEffect, useState } from 'react';
import { Check, X, Copy, ExternalLink } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  PageTitle,
  Card,
  Btn,
  Field,
  Input,
  Select,
  Textarea,
  Badge,
  ErrorMsg,
} from '@/shared/components/ui';
import { MONEDAS, formatoMoneda } from '@/shared/utils/formato';
import { urlVitrina } from '@/shared/utils/qr';
import { copiarTexto } from '@/shared/utils/compartir';

const TONO_ESTADO = { activo: 'ok', pendiente: 'alerta', suspendido: 'peligro' };

export default function MiRestaurantePage() {
  const { usuario, plan, features, estadoRestaurante } = useAuth();
  const [restaurante, setRestaurante] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    logo_url: '',
    moneda: 'COP',
    slug: '',
    ciudad: '',
    descripcion: '',
  });
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState(null);

  // `copiarTexto` ya trae el respaldo para cuando no hay contexto seguro: sobre
  // HTTP plano `navigator.clipboard` no existe, y en desarrollo no se nota
  // porque localhost sí cuenta como seguro.
  const copiarEnlace = async () => {
    setErrorCopia(null);
    const ok = await copiarTexto(urlVitrina(restaurante.slug));
    if (!ok) {
      setErrorCopia('No pudimos copiarlo. Selecciona el enlace y cópialo a mano.');
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  useEffect(() => {
    if (!usuario.restaurante_id) return;
    staffApi.restaurantes
      .obtener(usuario.restaurante_id)
      .then((r) => {
        setRestaurante(r);
        setForm({
          nombre: r.nombre || '',
          logo_url: r.logo_url || '',
          moneda: r.moneda || 'COP',
          slug: r.slug || '',
          ciudad: r.ciudad || '',
          descripcion: r.descripcion || '',
        });
      })
      .catch((e) => setError(e.message));
  }, [usuario.restaurante_id]);

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    try {
      const r = await staffApi.restaurantes.actualizar(usuario.restaurante_id, {
        nombre: form.nombre,
        logo_url: form.logo_url || null,
        moneda: form.moneda,
        slug: form.slug || undefined,
        ciudad: form.ciudad || null,
        descripcion: form.descripcion || null,
      });
      setRestaurante(r);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageTitle>Mi restaurante</PageTitle>
      <ErrorMsg error={error} />

      {/* Va arriba del todo: es lo que el restaurante pega en su Instagram, y si
          queda enterrado entre los ajustes nadie descubre que existe. */}
      {restaurante?.slug && (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-cream mb-1">Tu carta en internet</h2>
          <p className="text-xs text-muted mb-4">
            Compártela en Instagram, TikTok o WhatsApp. Se ve la carta completa con los videos;
            para pedir, el comensal escanea el QR de su mesa.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-xl bg-surface2 border border-line px-3.5 py-2.5 text-sm text-cream">
              {urlVitrina(restaurante.slug)}
            </code>
            <Btn variante="secundario" onClick={copiarEnlace}>
              {copiado ? <Check size={15} className="text-ok" /> : <Copy size={15} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Btn>
            <a href={urlVitrina(restaurante.slug)} target="_blank" rel="noopener noreferrer">
              <Btn variante="secundario">
                <ExternalLink size={15} /> Abrir
              </Btn>
            </a>
          </div>
          {errorCopia && <p className="mt-2 text-xs text-chile">{errorCopia}</p>}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-cream mb-4">Información</h2>
          <form onSubmit={guardar}>
            <Field label="Nombre del restaurante">
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </Field>
            <Field label="Logo (URL)">
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Ciudad">
              <Input
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                placeholder="Medellín"
                maxLength={100}
              />
            </Field>
            <p className="-mt-2 mb-4 text-[11px] text-muted">
              Sale en el título de tu carta pública. La gente busca «restaurante en Medellín», no
              solo el nombre.
            </p>
            <Field label="Descripción">
              <Textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={2}
                maxLength={300}
                placeholder="Cocina del Caribe con producto del día, en el centro de Cartagena."
              />
            </Field>
            <p className="-mt-2 mb-4 text-[11px] text-muted">
              Es lo que se lee bajo tu nombre en Google y al compartir el enlace. Escribe algo tuyo:
              si lo dejas vacío se genera solo con tus platos.
            </p>
            <Field label="Moneda del menú">
              <Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
                {Object.entries(MONEDAS).map(([codigo, m]) => (
                  <option key={codigo} value={codigo}>{m.etiqueta}</option>
                ))}
              </Select>
            </Field>
            <div className="-mt-2 mb-4 rounded-xl bg-surface2 border border-line px-3.5 py-2.5">
              <div className="text-[11px] text-muted mb-0.5">Así se verán tus precios en el menú:</div>
              <div className="text-cream font-semibold">
                {formatoMoneda(MONEDAS[form.moneda]?.ejemplo ?? 0, form.moneda)}
                <span className="text-muted font-normal"> · </span>
                {formatoMoneda((MONEDAS[form.moneda]?.ejemplo ?? 0) * 1.5, form.moneda)}
              </div>
              <div className="text-[11px] text-muted mt-1">
                Cambia el símbolo y el formato, no convierte los valores. Ingresa cada precio en tu moneda.
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Btn type="submit">Guardar cambios</Btn>
              {guardado && (
                <span className="inline-flex items-center gap-1 text-ok text-sm">
                  <Check size={14} /> Guardado
                </span>
              )}
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted mb-2">Estado</div>
            <Badge tono={TONO_ESTADO[estadoRestaurante] || 'neutro'}>{estadoRestaurante || '—'}</Badge>
            {estadoRestaurante === 'pendiente' && (
              <p className="text-[11px] text-muted mt-2">Tu restaurante está pendiente de aprobación por el equipo de Antojate.</p>
            )}
            {estadoRestaurante === 'suspendido' && (
              <p className="text-[11px] text-danger mt-2">Tu restaurante está suspendido. Contacta a soporte.</p>
            )}
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted mb-2">Mi plan</div>
            <div className="text-lg font-bold tracking-tight text-cream mb-3">{plan?.nombre || 'Sin plan'}</div>
            <ul className="space-y-1.5 text-xs">
              {[
                ['menu', 'Gestión de carta y videos'],
                ['personalizacion', 'Personalización visual'],
                ['carrito', 'Carrito y pedidos automáticos'],
                ['kds', 'Panel de cocina en tiempo real'],
              ].map(([flag, nombre]) => {
                const activa = features.includes(flag);
                return (
                  <li key={flag} className={`flex items-center gap-2 ${activa ? 'text-cream' : 'text-muted/50'}`}>
                    {activa ? <Check size={13} className="text-ok shrink-0" /> : <X size={13} className="shrink-0" />}
                    {nombre}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
