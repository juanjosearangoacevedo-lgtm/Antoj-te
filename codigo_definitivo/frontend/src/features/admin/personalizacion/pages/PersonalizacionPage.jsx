import { useState } from 'react';
import { Smartphone, Clapperboard, RotateCcw, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageTitle, Card, Btn, ErrorMsg, FeatureLock, SkeletonPagina } from '@/shared/components/ui';
import { FEATURES } from '@/shared/constants/features';
import { GRUPOS, OPCIONES } from '@/shared/tema/opciones';
import ControlOpcion from '../components/ControlOpcion';
import VistaPreviaMenu from '../components/VistaPreviaMenu';
import { useTemaBorrador } from '../hooks/useTemaBorrador';

export default function PersonalizacionPage() {
  const { hasFeature } = useAuth();
  const {
    borrador,
    cargando,
    guardandose,
    error,
    confirmacion,
    hayCambios,
    cambiar,
    descartar,
    restablecerTodo,
    guardar,
  } = useTemaBorrador();

  const [grupoActivo, setGrupoActivo] = useState(GRUPOS[0].clave);
  const [pantallaPrevia, setPantallaPrevia] = useState('categorias');

  if (!hasFeature(FEATURES.PERSONALIZACION)) {
    return (
      <FeatureLock
        titulo="Personalización visual disponible desde el Plan Intermedio"
        descripcion="Adapta colores, tipografías, animaciones y la distribución del menú a la identidad de tu restaurante, sin tocar código."
      />
    );
  }

  if (cargando || !borrador) return <SkeletonPagina filas={5} />;

  // Una opción puede depender de otra feature del plan (el llamado al mesero se
  // atiende en el panel de cocina). Ofrecerla sin ella sería vender un botón que
  // el restaurante no puede ver: mejor no mostrarla.
  const disponible = (o) => !o.requiereFeature || hasFeature(o.requiereFeature);
  const opcionesDelGrupo = OPCIONES.filter((o) => o.grupo === grupoActivo && disponible(o));
  // Un grupo cuyas opciones dependan todas de una feature ausente se queda vacío
  // y su pestaña no debe aparecer.
  const gruposVisibles = GRUPOS.filter((g) => OPCIONES.some((o) => o.grupo === g.clave && disponible(o)));
  const grupo = GRUPOS.find((g) => g.clave === grupoActivo);

  return (
    <div>
      <PageTitle
        descripcion="Cada cambio se ve al instante en la vista previa. Nada se publica hasta que guardas."
        accion={
          <div className="flex items-center gap-2">
            {hayCambios && (
              <Btn variante="fantasma" onClick={descartar} disabled={guardandose}>
                Descartar
              </Btn>
            )}
            <Btn onClick={guardar} cargando={guardandose} disabled={!hayCambios}>
              {confirmacion ? (
                <>
                  <Check size={15} /> Guardado
                </>
              ) : (
                'Guardar cambios'
              )}
            </Btn>
          </div>
        }
      >
        Personalización
      </PageTitle>

      <ErrorMsg error={error} />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ------------------------------ Controles ------------------------------ */}
        <div className="min-w-0">
          {/* Grupos: navegación por pestañas para no abrumar con 20 controles */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
            {gruposVisibles.map((g) => (
              <button
                key={g.clave}
                onClick={() => setGrupoActivo(g.clave)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-fast ${
                  grupoActivo === g.clave
                    ? 'bg-surface text-cream border border-line shadow-sm'
                    : 'text-muted hover:text-cream hover:bg-surface2 border border-transparent'
                }`}
              >
                {g.titulo}
              </button>
            ))}
          </div>

          <Card>
            <p className="text-sm text-muted mb-1">{grupo.descripcion}</p>
            {opcionesDelGrupo.map((opcion) => (
              <ControlOpcion
                key={opcion.clave}
                opcion={opcion}
                valor={borrador[opcion.clave]}
                onCambiar={(valor) => cambiar(opcion.clave, valor)}
              />
            ))}
          </Card>

          <button
            onClick={restablecerTodo}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-cream mt-4 transition-colors"
          >
            <RotateCcw size={13} />
            Restablecer toda la personalización al diseño de Bitemo
          </button>
        </div>

        {/* --------------------------- Vista previa --------------------------- */}
        <div className="lg:sticky lg:top-20">
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Smartphone size={13} /> Vista previa
            </span>
            <div className="flex gap-1">
              {[
                { clave: 'categorias', icono: Smartphone, etiqueta: 'Categorías' },
                { clave: 'plato', icono: Clapperboard, etiqueta: 'Plato' },
              ].map(({ clave, icono: Icono, etiqueta }) => (
                <button
                  key={clave}
                  onClick={() => setPantallaPrevia(clave)}
                  title={etiqueta}
                  aria-label={etiqueta}
                  className={`inline-grid place-items-center w-8 h-8 rounded-lg transition-colors duration-fast ${
                    pantallaPrevia === clave ? 'bg-surface text-cream' : 'text-muted hover:text-cream'
                  }`}
                >
                  <Icono size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Marco de teléfono: recuerda que el comensal ve esto en su celular */}
          <div className="mx-auto w-[300px] rounded-[2rem] border-[6px] border-line bg-black overflow-hidden shadow-card">
            <div className="h-[540px]">
              <VistaPreviaMenu tema={borrador} pantalla={pantallaPrevia} />
            </div>
          </div>

          <p className="text-[11px] text-muted text-center mt-3 max-w-[300px] mx-auto">
            Las fotos son de muestra. En el menú real se usan las de tus platos.
          </p>
        </div>
      </div>
    </div>
  );
}
