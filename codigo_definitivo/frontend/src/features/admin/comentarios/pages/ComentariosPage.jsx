import { useEffect, useState } from 'react';
import { Eye, EyeOff, Flag, MessageSquare, Trash2 } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { PageTitle, Card, Badge, Btn, ErrorMsg, EstadoVacio, SkeletonPagina } from '@/shared/components/ui';

// Lo que comentan en la app sobre los platos del restaurante.
//
// Moderar es obligatorio para tener comentarios en una app de tienda (App
// Store 1.2): quien comenta puede ser reportado y bloqueado desde la app, y el
// restaurante revisa aquí. Un comentario con tres reportes se oculta solo hasta
// que alguien lo mire; ocultar no borra, así que se puede devolver.

const FILTROS = [
  { clave: 'reportados', etiqueta: 'Con reportes', query: '?reportados=1' },
  { clave: 'todos', etiqueta: 'Todos', query: '' },
  { clave: 'ocultos', etiqueta: 'Ocultos', query: '?estado=oculto' },
];

const MOTIVOS = { spam: 'spam', ofensivo: 'ofensivo', acoso: 'acoso', falso: 'falso', otro: 'otro' };

const fecha = (valor) =>
  new Date(String(valor).replace(' ', 'T')).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ComentariosPage() {
  const [filtro, setFiltro] = useState('reportados');
  const [comentarios, setComentarios] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const cargar = (clave = filtro) => {
    setError(null);
    const { query } = FILTROS.find((f) => f.clave === clave);
    staffApi.comentarios
      .listar(query)
      .then(setComentarios)
      .catch((e) => setError(e.message))
      .finally(() => setCargado(true));
  };

  useEffect(() => {
    setCargado(false);
    cargar(filtro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const moderar = async (c, estado) => {
    setOcupado(c.id);
    setError(null);
    try {
      await staffApi.comentarios.moderar(c.id, estado);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (c) => {
    if (!confirm('¿Borrar este comentario? No se puede deshacer.')) return;
    setOcupado(c.id);
    setError(null);
    try {
      await staffApi.comentarios.eliminar(c.id);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div>
      <PageTitle descripcion="Lo que la gente escribe en la app sobre tus platos. Puedes ocultar un comentario (y devolverlo después) o borrarlo.">
        Comentarios de la app
      </PageTitle>
      <ErrorMsg error={error} />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTROS.map(({ clave, etiqueta }) => (
          <button
            key={clave}
            onClick={() => setFiltro(clave)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-fast ${
              filtro === clave ? 'bg-amber text-botontxt border-amber' : 'bg-surface text-muted border-line hover:text-cream'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {!cargado ? (
        <SkeletonPagina filas={4} />
      ) : comentarios.length === 0 ? (
        <EstadoVacio
          icono={MessageSquare}
          titulo={filtro === 'reportados' ? 'Nada por revisar' : 'Todavía no hay comentarios'}
          mensaje={
            filtro === 'reportados'
              ? 'Cuando alguien reporte un comentario sobre tus platos, aparecerá aquí.'
              : 'Aquí verás lo que la gente escribe sobre tus platos en la app.'
          }
        />
      ) : (
        <div className="space-y-3">
          {comentarios.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
                    <span className="font-semibold text-cream">{c.plato.nombre}</span>
                    <span>·</span>
                    <span>{c.autor.nombre}</span>
                    <span>·</span>
                    <span>{fecha(c.creado_en)}</span>
                    {c.estado === 'oculto' ? <Badge tono="neutro">Oculto</Badge> : null}
                    {c.reportes > 0 ? (
                      <Badge tono="alerta">
                        <Flag size={11} className="inline -mt-0.5 mr-1" />
                        {c.reportes} {c.reportes === 1 ? 'reporte' : 'reportes'}
                        {c.motivos.length ? ` · ${c.motivos.map((m) => MOTIVOS[m] ?? m).join(', ')}` : ''}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-cream whitespace-pre-line break-words">{c.texto}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {c.estado === 'oculto' ? (
                    <Btn variante="secundario" className="text-xs px-3 py-1.5" cargando={ocupado === c.id} onClick={() => moderar(c, 'visible')}>
                      <Eye size={13} /> {c.reportes > 0 ? 'Dejarlo visible' : 'Mostrar'}
                    </Btn>
                  ) : (
                    <>
                      {c.reportes > 0 ? (
                        <Btn variante="secundario" className="text-xs px-3 py-1.5" cargando={ocupado === c.id} onClick={() => moderar(c, 'visible')}>
                          <Eye size={13} /> Está bien
                        </Btn>
                      ) : null}
                      <Btn variante="secundario" className="text-xs px-3 py-1.5" cargando={ocupado === c.id} onClick={() => moderar(c, 'oculto')}>
                        <EyeOff size={13} /> Ocultar
                      </Btn>
                    </>
                  )}
                  <Btn variante="peligro" className="text-xs px-3 py-1.5" disabled={ocupado === c.id} onClick={() => eliminar(c)}>
                    <Trash2 size={13} /> Borrar
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
