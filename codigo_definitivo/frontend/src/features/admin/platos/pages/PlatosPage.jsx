import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ChefHat, Clapperboard, Loader2, Link2, Clock } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import VideoUploader from '@/features/admin/platos/components/VideoUploader';
import EditorIngredientes from '@/features/admin/platos/components/EditorIngredientes';
import { PageTitle, Btn, Tabla, Badge, Modal, Field, Input, Select, Textarea, ErrorMsg, EstadoVacio, SkeletonPagina, IconBtn } from '@/shared/components/ui';

// Días con la convención de MySQL DAYOFWEEK (1=Dom … 7=Sáb), ordenados Lun→Dom para mostrar.
const DIAS_SEMANA = [
  { n: '2', label: 'Lun' },
  { n: '3', label: 'Mar' },
  { n: '4', label: 'Mié' },
  { n: '5', label: 'Jue' },
  { n: '6', label: 'Vie' },
  { n: '7', label: 'Sáb' },
  { n: '1', label: 'Dom' },
];

const FORM_VACIO = {
  categoria_id: '',
  nombre: '',
  descripcion: '',
  precio: '',
  video_url: '',
  video_guid: '',
  video_thumbnail_url: '',
  video_status: 'listo',
  imagen_url: '',
  nivel_picante: 0,
  recomendado_chef: false,
  recomendado_dias: '',
  recomendado_hora_inicio: '',
  recomendado_hora_fin: '',
  // Un plato nuevo sale también en la app salvo que el restaurante lo quite.
  en_feed: true,
};

export default function PlatosPage() {
  const [platos, setPlatos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCat, setFiltroCat] = useState('');
  const [error, setError] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [editando, setEditando] = useState(null); // null | 'nuevo' | plato
  const [form, setForm] = useState(FORM_VACIO);
  // La receta viaja aparte del form: es una tabla puente con su propio endpoint,
  // no una columna de `platos`.
  const [ingredientesPlato, setIngredientesPlato] = useState([]);

  const cargar = () => {
    const q = filtroCat ? `?categoria_id=${filtroCat}` : '';
    staffApi.platos
      .listar(q)
      .then(setPlatos)
      .catch((e) => setError(e.message))
      .finally(() => setCargado(true));
    staffApi.categorias.listar().then(setCategorias).catch(() => {});
  };
  useEffect(cargar, [filtroCat]);

  // Mientras Bunny transcodifica, consultamos el estado y marcamos el plato como 'listo' al terminar.
  useEffect(() => {
    const pendientes = platos.filter((p) => p.video_status === 'procesando' && p.video_guid);
    if (!pendientes.length) return undefined;
    const t = setInterval(async () => {
      let cambio = false;
      for (const p of pendientes) {
        try {
          const r = await staffApi.platos.estadoVideo(p.video_guid);
          if (r.estado !== 'procesando') {
            // La duración la usa la app para saber si alguien vio el video entero.
            const duracion = r.estado === 'listo' && r.duracion > 0 ? { duracion_segundos: Math.round(r.duracion) } : {};
            await staffApi.platos.actualizar(p.id, { video_status: r.estado, ...duracion });
            cambio = true;
          }
        } catch {
          /* se reintenta en el siguiente ciclo */
        }
      }
      if (cambio) cargar();
    }, 6000);
    return () => clearInterval(t);
  }, [platos]);

  const abrirNuevo = () => {
    setForm({ ...FORM_VACIO, categoria_id: filtroCat || '' });
    setIngredientesPlato([]);
    setEditando('nuevo');
  };
  const abrirEditar = (p) => {
    // El listado de platos no trae la receta (viene de la tabla puente), así que
    // se pide el detalle al abrir. Si falla, el editor arranca vacío en vez de
    // bloquear la edición del resto del plato.
    setIngredientesPlato([]);
    staffApi.platos
      .obtener(p.id)
      .then((d) => setIngredientesPlato(d.ingredientes || []))
      .catch(() => {});
    setForm({
      categoria_id: p.categoria_id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: p.precio,
      video_url: p.video_url || '',
      video_guid: p.video_guid || '',
      video_thumbnail_url: p.video_thumbnail_url || '',
      video_status: p.video_status || 'listo',
      imagen_url: p.imagen_url || '',
      nivel_picante: p.nivel_picante || 0,
      recomendado_chef: !!p.recomendado_chef,
      recomendado_dias: p.recomendado_dias || '',
      recomendado_hora_inicio: (p.recomendado_hora_inicio || '').slice(0, 5), // "HH:MM:SS" → "HH:MM"
      recomendado_hora_fin: (p.recomendado_hora_fin || '').slice(0, 5),
      en_feed: p.en_feed === undefined ? true : Boolean(p.en_feed),
    });
    setEditando(p);
  };

  // Alterna un día (número DAYOFWEEK) en la lista CSV de recomendado_dias, manteniendo el orden.
  const toggleDia = (n) => {
    const set = new Set(form.recomendado_dias ? form.recomendado_dias.split(',') : []);
    set.has(n) ? set.delete(n) : set.add(n);
    const dias = DIAS_SEMANA.filter((d) => set.has(d.n)).map((d) => d.n).join(',');
    setForm({ ...form, recomendado_dias: dias });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.video_url) {
      setError('Sube el video del plato antes de guardar.');
      return;
    }
    const body = {
      categoria_id: Number(form.categoria_id),
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: Number(form.precio) || 0,
      video_url: form.video_url,
      video_guid: form.video_guid || null,
      video_thumbnail_url: form.video_thumbnail_url || null,
      video_status: form.video_status || 'listo',
      imagen_url: form.imagen_url || null,
      nivel_picante: Number(form.nivel_picante) || 0,
      recomendado_chef: form.recomendado_chef,
      // Si no es recomendado, limpiamos la programación
      recomendado_dias: form.recomendado_chef ? form.recomendado_dias : '',
      recomendado_hora_inicio: form.recomendado_chef ? form.recomendado_hora_inicio : '',
      recomendado_hora_fin: form.recomendado_chef ? form.recomendado_hora_fin : '',
      en_feed: form.en_feed,
    };
    try {
      const plato =
        editando === 'nuevo'
          ? await staffApi.platos.crear({ ...body, orden: platos.length })
          : await staffApi.platos.actualizar(editando.id, body);

      // Va después y no en el mismo cuerpo: la receta es una tabla puente con su
      // propio endpoint, y un plato nuevo no tiene id hasta que se crea.
      // `cantidad_usada` en 1 porque el control de stock por receta todavía no
      // se usa: aquí lo que importa es QUÉ lleva el plato, no cuánto.
      await staffApi.platos.setIngredientes(
        plato.id,
        ingredientesPlato.map((i) => ({ ingrediente_id: i.id, cantidad_usada: 1 }))
      );

      setEditando(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActivo = async (p) => {
    try {
      await staffApi.platos.actualizar(p.id, { activo: !p.activo });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const mover = async (idx, dir) => {
    const a = platos[idx];
    const b = platos[idx + dir];
    if (!b) return;
    try {
      await Promise.all([
        staffApi.platos.actualizar(a.id, { orden: idx + dir }),
        staffApi.platos.actualizar(b.id, { orden: idx }),
      ]);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar el plato "${p.nombre}"?`)) return;
    try {
      await staffApi.platos.eliminar(p.id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const nombreCategoria = (id) => categorias.find((c) => c.id === id)?.nombre || `#${id}`;

  return (
    <div>
      <PageTitle
        accion={
          <Btn onClick={abrirNuevo}>
            <Plus size={15} className="inline -mt-0.5 mr-1" /> Nuevo plato
          </Btn>
        }
      >
        Carta y videos
      </PageTitle>
      <ErrorMsg error={error} />

      <div className="mb-4 max-w-xs">
        <Select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>

      {!cargado ? (
        <SkeletonPagina filas={5} />
      ) : platos.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl shadow-sm">
          <EstadoVacio
            icono={Clapperboard}
            titulo="Tu carta aún no tiene platos"
            mensaje="Crea el primero con su video vertical: es lo que verán tus comensales en el feed."
            accion={<Btn onClick={abrirNuevo}>Nuevo plato</Btn>}
          />
        </div>
      ) : (
        <Tabla columnas={['Orden', 'Plato', 'Categoría', 'Precio', 'Estado', 'Acciones']}>
          {platos.map((p, idx) => (
            <tr key={p.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => mover(idx, -1)} disabled={idx === 0} className="text-muted hover:text-amber disabled:opacity-20" aria-label="Subir">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => mover(idx, 1)} disabled={idx === platos.length - 1} className="text-muted hover:text-amber disabled:opacity-20" aria-label="Bajar">
                    <ArrowDown size={14} />
                  </button>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-cream font-medium inline-flex items-center gap-1.5">
                  {p.nombre}
                  {p.recomendado_chef ? <ChefHat size={13} className="text-amber" aria-label="Recomendado del chef" /> : null}
                </div>
                {p.video_status === 'procesando' ? (
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-amber-soft">
                    <Loader2 size={12} className="animate-spin" /> Procesando video…
                  </div>
                ) : p.video_status === 'error' ? (
                  <div className="mt-0.5"><Badge tono="peligro">Error en el video</Badge></div>
                ) : (
                  <div className="text-[11px] text-muted truncate max-w-[220px]">{p.video_url}</div>
                )}
                {p.en_feed === 0 || p.en_feed === false ? (
                  <div className="mt-0.5">
                    <Badge tono="neutro">Fuera de la app</Badge>
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted">{nombreCategoria(p.categoria_id)}</td>
              <td className="px-4 py-3 text-cream font-semibold tabular-nums">${Number(p.precio).toLocaleString()}</td>
              <td className="px-4 py-3">
                <button onClick={() => toggleActivo(p)}>
                  <Badge tono={p.activo ? 'ok' : 'neutro'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <IconBtn icono={Pencil} tam={15} etiqueta="Editar plato" onClick={() => abrirEditar(p)} />
                  <IconBtn
                    icono={Trash2}
                    tam={15}
                    etiqueta="Eliminar plato"
                    className="hover:!text-danger hover:!bg-danger-soft"
                    onClick={() => eliminar(p)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
      )}

      <Modal
        abierto={editando !== null}
        titulo={editando === 'nuevo' ? 'Nuevo plato' : `Editar ${editando?.nombre || ''}`}
        onCerrar={() => setEditando(null)}
      >
        <form onSubmit={guardar}>
          <Field label="Categoría">
            <Select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} required>
              <option value="">Selecciona…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </Field>
          <Field label="Descripción">
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Cómo se prepara, cómo se sirve, qué lo hace especial."
            />
          </Field>
          {/* Los ingredientes son su propia lista, no un párrafo dentro de la
              descripción: el comensal los abre en una sección aparte y los
              alérgenos salen de aquí. */}
          <Field label="Ingredientes">
            <EditorIngredientes
              valor={ingredientesPlato}
              onCambiar={setIngredientesPlato}
              onError={setError}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio">
              <Input type="number" min="0" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            </Field>
            <Field label="Nivel picante (0-3)">
              <Input type="number" min="0" max="3" value={form.nivel_picante} onChange={(e) => setForm({ ...form, nivel_picante: e.target.value })} />
            </Field>
          </div>
          <Field label="Video vertical del plato">
            <VideoUploader
              value={form.video_url}
              onUploaded={(d) => setForm({ ...form, ...d, video_status: 'procesando' })}
            />
          </Field>
          <details className="mb-4 -mt-2">
            <summary className="text-xs text-muted cursor-pointer inline-flex items-center gap-1.5 select-none">
              <Link2 size={12} /> o pegar una URL de video manualmente
            </summary>
            <div className="mt-2">
              <Input
                value={form.video_guid ? '' : form.video_url}
                onChange={(e) =>
                  setForm({ ...form, video_url: e.target.value, video_guid: '', video_thumbnail_url: '', video_status: 'listo' })
                }
                placeholder="https://…/video.m3u8 o .mp4"
              />
            </div>
          </details>
          <Field label="Fotografía (URL, opcional)">
            <Input value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} placeholder="https://…/foto.jpg" />
          </Field>
          <label className="flex items-center gap-2 mb-3 text-sm text-cream cursor-pointer">
            <input
              type="checkbox"
              checked={form.recomendado_chef}
              onChange={(e) => setForm({ ...form, recomendado_chef: e.target.checked })}
              className="accent-[var(--c-primario)]"
            />
            Recomendado del chef
          </label>

          {form.recomendado_chef && (
            <div className="mb-4 rounded-xl border border-line bg-surface2 p-3.5 space-y-3.5">
              <p className="text-[11px] text-muted -mb-1">
                Puedes programar cuándo se muestra como recomendado. Si dejas todo vacío, aplica siempre.
              </p>
              <div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-2">
                  <ChefHat size={13} /> Días que aplica <span className="font-normal">(vacío = todos)</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DIAS_SEMANA.map((d) => {
                    const activo = form.recomendado_dias.split(',').includes(d.n);
                    return (
                      <button
                        key={d.n}
                        type="button"
                        onClick={() => toggleDia(d.n)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          activo ? 'bg-amber text-botontxt border-transparent' : 'bg-surface text-muted border-line hover:text-cream'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-2">
                  <Clock size={13} /> Franja horaria <span className="font-normal">(vacío = todo el día)</span>
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={form.recomendado_hora_inicio}
                    onChange={(e) => setForm({ ...form, recomendado_hora_inicio: e.target.value })}
                    className="max-w-[130px]"
                  />
                  <span className="text-muted text-xs">a</span>
                  <Input
                    type="time"
                    value={form.recomendado_hora_fin}
                    onChange={(e) => setForm({ ...form, recomendado_hora_fin: e.target.value })}
                    className="max-w-[130px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Solo afecta a la app: la carta por QR y la vitrina lo siguen mostrando. */}
          <label className="flex items-start gap-2 mb-4 text-sm text-cream cursor-pointer">
            <input
              type="checkbox"
              checked={form.en_feed}
              onChange={(e) => setForm({ ...form, en_feed: e.target.checked })}
              className="mt-1 accent-[var(--c-primario)]"
            />
            <span>
              Aparece en la app
              <span className="block text-[11px] text-muted">
                Si lo desmarcas, sigue en tu carta por QR, pero no sale en el feed de la app.
              </span>
            </span>
          </label>
          <Btn type="submit" className="w-full">Guardar plato</Btn>
        </form>
      </Modal>
    </div>
  );
}
