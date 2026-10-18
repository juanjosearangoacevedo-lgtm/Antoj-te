import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, LogOut, Volume2, VolumeX, StickyNote, AlertTriangle, ConciergeBell, Check, Receipt, KeyRound } from 'lucide-react';
import CambiarPasswordModal from '@/features/auth/components/CambiarPasswordModal';
import { staffApi } from '@/shared/services/staffApi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Badge, Btn, ErrorMsg, FeatureLock } from '@/shared/components/ui';
import { esSuperadmin } from '@/shared/constants/roles';
import { FEATURES } from '@/shared/constants/features';

const COLUMNAS = [
  { estado: 'Recibido', titulo: 'Pendientes', tono: 'alerta' },
  { estado: 'En Preparación', titulo: 'En preparación', tono: 'neutro' },
  { estado: 'Listo', titulo: 'Listos', tono: 'ok' },
];

const SIGUIENTE = { Recibido: 'En Preparación', 'En Preparación': 'Listo', Listo: 'Entregado' };
const ETIQUETA_ACCION = { Recibido: 'Empezar', 'En Preparación': 'Marcar listo', Listo: 'Entregar' };

// Qué pide la mesa. El motivo lo valida el backend (llamados.service.MOTIVOS);
// aquí solo se traduce a algo que un mesero entienda de un vistazo.
const MOTIVOS = {
  mesero: { texto: 'Pide atención', icono: ConciergeBell },
  cuenta: { texto: 'Pide la cuenta', icono: Receipt },
};

function minutosDesde(fecha) {
  return Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60000));
}

// Los llamados van arriba y no en una columna: no son un paso de la cocina, son
// alguien esperando en el salón. Se atienden y desaparecen.
function BarraLlamados({ llamados, onAtender }) {
  if (!llamados.length) return null;
  return (
    <section className="mb-4 rounded-2xl border border-amber bg-accent-soft p-3">
      <div className="flex items-center gap-2 px-1 mb-2.5">
        <ConciergeBell size={15} className="text-amber" />
        <h2 className="text-sm font-semibold text-cream">
          Mesas que llaman
          <span className="text-muted font-normal ml-1.5">({llamados.length})</span>
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {llamados.map((l) => {
          const { texto, icono: Icono } = MOTIVOS[l.motivo] || MOTIVOS.mesero;
          return (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-xl bg-surface border border-line px-3 py-2 animate-risein"
            >
              <Icono size={16} className="text-amber shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-cream leading-tight">Mesa {l.numero_mesa}</p>
                <p className="text-[11px] text-muted tabular-nums">
                  {texto} · {minutosDesde(l.creado_en)} min
                </p>
              </div>
              <Btn className="!py-1.5 text-xs shrink-0" onClick={() => onAtender(l)}>
                <Check size={13} /> Atendido
              </Btn>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TarjetaPedido({ pedido, detalle, onCambiarEstado }) {
  const mins = minutosDesde(pedido.creado_en);
  const urgente = pedido.estado !== 'Listo' && mins >= 15;

  return (
    <div
      className={`bg-surface border rounded-2xl p-4 shadow-sm animate-risein ${
        urgente ? 'border-danger' : 'border-line'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-base font-bold tracking-tight text-cream">
          Mesa {pedido.numero_mesa}
          <span className="text-muted text-xs font-normal ml-2">#{pedido.id}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs tabular-nums ${
            urgente ? 'text-danger font-semibold' : 'text-muted'
          }`}
        >
          {urgente && <AlertTriangle size={12} />}
          {mins} min
        </span>
      </div>

      {detalle ? (
        <ul className="text-sm space-y-1 mb-2">
          {detalle.detalles.map((d) => (
            <li key={d.id} className="flex justify-between gap-2">
              <span className="text-cream">
                <span className="text-amber font-semibold">{d.cantidad}×</span>{' '}
                {d.plato_nombre || d.combo_nombre}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-muted text-xs mb-2">Cargando detalle…</div>
      )}

      {pedido.observaciones && (
        <div className="flex items-start gap-1.5 text-xs bg-accent-soft text-amber-soft rounded-lg px-2.5 py-1.5 mb-2">
          <StickyNote size={12} className="shrink-0 mt-0.5" />
          {pedido.observaciones}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <Btn className="flex-1 !py-1.5 text-xs" onClick={() => onCambiarEstado(pedido, SIGUIENTE[pedido.estado])}>
          {ETIQUETA_ACCION[pedido.estado]}
        </Btn>
        {pedido.estado === 'Recibido' && (
          <Btn variante="peligro" className="!py-1.5 text-xs" onClick={() => onCambiarEstado(pedido, 'Cancelado')}>
            Cancelar
          </Btn>
        )}
      </div>
    </div>
  );
}

export default function CocinaPage() {
  const { usuario, hasFeature, logout, suscripcion } = useAuth();
  // Con la membresía vencida el backend rechaza todo con 402: no tiene sentido
  // consultar cada 5 s. La pantalla lo explica y deja de preguntar.
  const bloqueada = Boolean(suscripcion?.vencida) && !esSuperadmin(usuario);
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [llamados, setLlamados] = useState([]);
  const [detalles, setDetalles] = useState({}); // pedido_id -> detalle completo
  const [error, setError] = useState(null);
  const [sonido, setSonido] = useState(true);
  // Cocineros y meseros no entran al panel: esta es su única puerta para cambiar
  // su propia contraseña.
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const idsPrevios = useRef(new Set());
  const idsLlamadosPrevios = useRef(new Set());
  const sonidoRef = useRef(sonido);
  sonidoRef.current = sonido;

  const beep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      /* sin audio */
    }
  };

  // Los llamados van en su propia carga: si fallara, el tablero de pedidos —que
  // es lo crítico— tiene que seguir refrescándose igual.
  const cargarLlamados = useCallback(async () => {
    try {
      const data = await staffApi.llamados.pendientes();
      setLlamados(data);

      const nuevos = data.filter((l) => !idsLlamadosPrevios.current.has(l.id));
      if (nuevos.length && idsLlamadosPrevios.current.size > 0 && sonidoRef.current) beep();
      idsLlamadosPrevios.current = new Set(data.map((l) => l.id));
    } catch {
      /* silencioso: no vale la pena tapar el tablero por esto */
    }
  }, []);

  const atenderLlamado = async (llamado) => {
    // Se quita de la lista al instante: el mesero ya está yendo y ver la tarjeta
    // otros cinco segundos hace dudar de si el toque funcionó.
    setLlamados((prev) => prev.filter((l) => l.id !== llamado.id));
    try {
      await staffApi.llamados.atender(llamado.id);
    } catch (e) {
      setError(e.message);
    }
    cargarLlamados();
  };

  const cargar = useCallback(async () => {
    try {
      const data = await staffApi.pedidos.listar();
      const activos = data.filter((p) => COLUMNAS.some((c) => c.estado === p.estado));
      setPedidos(activos);
      setError(null);

      // Notificar pedidos nuevos
      const nuevos = activos.filter((p) => p.estado === 'Recibido' && !idsPrevios.current.has(p.id));
      if (nuevos.length && idsPrevios.current.size > 0 && sonidoRef.current) beep();
      idsPrevios.current = new Set(activos.map((p) => p.id));

      // Cargar detalles que falten
      for (const p of activos) {
        setDetalles((prev) => {
          if (prev[p.id]) return prev;
          staffApi.pedidos
            .obtener(p.id)
            .then((det) => setDetalles((d) => ({ ...d, [p.id]: det })))
            .catch(() => {});
          return prev;
        });
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (bloqueada) return undefined;
    cargar();
    cargarLlamados();
    const timer = setInterval(() => {
      cargar();
      cargarLlamados();
    }, 5000); // casi tiempo real vía polling
    return () => clearInterval(timer);
  }, [cargar, cargarLlamados, bloqueada]);

  const cambiarEstado = async (pedido, estado) => {
    try {
      await staffApi.pedidos.cambiarEstado(pedido.id, estado);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  if (bloqueada) {
    return (
      <div className="superficie-plataforma min-h-[100dvh] bg-base p-8 grid place-items-center">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto text-danger mb-3" size={28} />
          <h1 className="text-xl font-bold text-cream mb-2">Membresía vencida</h1>
          <p className="text-sm text-muted mb-6">
            La pantalla de cocina está pausada hasta que el administrador del restaurante renueve la
            membresía de Antojate.
          </p>
          <Btn variante="secundario" onClick={logout}>
            <LogOut size={15} /> Cerrar sesión
          </Btn>
        </div>
      </div>
    );
  }

  if (usuario && !esSuperadmin(usuario) && !hasFeature(FEATURES.KDS)) {
    return (
      <div className="superficie-plataforma min-h-[100dvh] bg-base p-8 grid place-items-center">
        <div className="max-w-md">
          <FeatureLock
            titulo="Panel de cocina disponible en el Plan Pro"
            descripcion="Con el Plan Pro los pedidos de tus comensales llegan automáticamente a esta pantalla, sin meseros transcribiendo órdenes."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="superficie-plataforma min-h-[100dvh] bg-base p-4 sm:p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-accent-soft">
            <ChefHat className="text-amber" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cream">Panel de cocina</h1>
            <p className="text-[11px] text-muted">Actualización automática cada 5 segundos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSonido((s) => !s)}
            className="text-muted hover:text-cream p-2"
            title={sonido ? 'Silenciar' : 'Activar sonido'}
          >
            {sonido ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setCambiandoClave(true)}
            className="text-muted hover:text-cream p-2"
            title="Cambiar mi contraseña"
          >
            <KeyRound size={18} />
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-muted hover:text-chile p-2"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <ErrorMsg error={error} />

      <CambiarPasswordModal abierto={cambiandoClave} onCerrar={() => setCambiandoClave(false)} />

      <BarraLlamados llamados={llamados} onAtender={atenderLlamado} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNAS.map((col) => {
          const lista = pedidos
            .filter((p) => p.estado === col.estado)
            .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en)); // más antiguos primero
          return (
            <section key={col.estado} className="bg-surface2 border border-line rounded-2xl p-3">
              <div className="flex items-center justify-between px-1 mb-3">
                <h2 className="text-sm font-semibold text-cream">{col.titulo}</h2>
                <Badge tono={col.tono}>{lista.length}</Badge>
              </div>
              <div className="space-y-3 min-h-[100px]">
                {lista.length === 0 ? (
                  <div className="text-center text-muted/50 text-xs py-8">Sin pedidos</div>
                ) : (
                  lista.map((p) => (
                    <TarjetaPedido
                      key={p.id}
                      pedido={p}
                      detalle={detalles[p.id]}
                      onCambiarEstado={cambiarEstado}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
