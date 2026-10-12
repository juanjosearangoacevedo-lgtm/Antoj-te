import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, Copy, ExternalLink, Download, Printer, QrCode } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { urlMesa, generarQrDataUrl, descargarDataUrl, imprimirTarjetas } from '@/shared/utils/qr';
import { copiarTexto } from '@/shared/utils/compartir';
import { PageTitle, Btn, Card, Modal, Field, Input, ErrorMsg, EstadoVacio, Badge } from '@/shared/components/ui';

export default function MesasPage() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalActiva, setSucursalActiva] = useState(null);
  const [mesas, setMesas] = useState([]);
  const [qrs, setQrs] = useState({}); // mesa_id -> dataUrl
  const [error, setError] = useState(null);
  const [modalSucursal, setModalSucursal] = useState(false);
  const [modalMesa, setModalMesa] = useState(false);
  const [formSucursal, setFormSucursal] = useState({ nombre: '', direccion: '', telefono: '' });
  const [numeroMesa, setNumeroMesa] = useState('');
  const [copiada, setCopiada] = useState(null);

  const cargarSucursales = () =>
    staffApi.sucursales
      .listar()
      .then((s) => {
        setSucursales(s);
        if (s.length && !sucursalActiva) setSucursalActiva(s[0].id);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    cargarSucursales();
  }, []);

  useEffect(() => {
    if (!sucursalActiva) return;
    staffApi.mesas.porSucursal(sucursalActiva).then(setMesas).catch((e) => setError(e.message));
  }, [sucursalActiva]);

  // Genera la imagen QR de cada mesa (en el navegador, sin backend)
  useEffect(() => {
    (async () => {
      const nuevos = {};
      for (const mesa of mesas) {
        try {
          nuevos[mesa.id] = await generarQrDataUrl(urlMesa(mesa.codigo_qr_token));
        } catch {
          /* sin QR para esta mesa */
        }
      }
      setQrs(nuevos);
    })();
  }, [mesas]);

  const recargarMesas = () =>
    sucursalActiva && staffApi.mesas.porSucursal(sucursalActiva).then(setMesas).catch(() => {});

  const crearSucursal = async (e) => {
    e.preventDefault();
    try {
      await staffApi.sucursales.crear(formSucursal);
      setModalSucursal(false);
      setFormSucursal({ nombre: '', direccion: '', telefono: '' });
      cargarSucursales();
    } catch (err) {
      setError(err.message);
    }
  };

  const crearMesa = async (e) => {
    e.preventDefault();
    try {
      await staffApi.mesas.crear({ sucursal_id: sucursalActiva, numero_mesa: numeroMesa });
      setModalMesa(false);
      setNumeroMesa('');
      recargarMesas();
    } catch (err) {
      setError(err.message);
    }
  };

  // Copiar va por `copiarTexto`, el mismo respaldo endurecido que usa el menú
  // del comensal. Esta pantalla tenía su propia copia de la lógica y se quedó
  // en la versión anterior al arreglo del iPhone: `textarea.select()` no
  // selecciona nada en iOS Safari, así que execCommand copiaba una cadena
  // vacía. Y como no se miraba lo que devolvía, la interfaz marcaba "copiada"
  // igual — el peor final posible: crees que tienes el enlace y pegas nada.
  const copiar = async (mesa) => {
    const url = urlMesa(mesa.codigo_qr_token);
    if (await copiarTexto(url)) {
      setCopiada(mesa.id);
      setTimeout(() => setCopiada(null), 1800);
    } else {
      setError('No se pudo copiar el enlace. Cópialo a mano: ' + url);
    }
  };

  const descargarQr = (mesa) => {
    if (!qrs[mesa.id]) return;
    descargarDataUrl(qrs[mesa.id], `qr-mesa-${mesa.numero_mesa}.png`);
  };

  // El navegador bloquea la ventana de impresión sin avisar. Si eso pasa hay
  // que decirlo: si no, el botón parece roto.
  const AVISO_EMERGENTE =
    'Tu navegador bloqueó la ventana de impresión. Permite las ventanas emergentes de este sitio e inténtalo de nuevo.';

  const imprimirUna = (mesa) => {
    if (!qrs[mesa.id]) return;
    const ok = imprimirTarjetas('Menú digital', [{ numero: mesa.numero_mesa, dataUrl: qrs[mesa.id] }]);
    if (!ok) setError(AVISO_EMERGENTE);
  };

  const imprimirTodas = () => {
    const tarjetas = mesas
      .filter((m) => qrs[m.id])
      .map((m) => ({ numero: m.numero_mesa, dataUrl: qrs[m.id] }));
    if (!tarjetas.length) return;
    if (!imprimirTarjetas('Menú digital', tarjetas)) setError(AVISO_EMERGENTE);
  };

  const regenerar = async (mesa) => {
    if (!confirm('¿Regenerar el QR? El código anterior dejará de funcionar.')) return;
    await staffApi.mesas.regenerarQr(mesa.id).catch((e) => setError(e.message));
    recargarMesas();
  };

  const eliminarMesa = async (mesa) => {
    if (!confirm(`¿Eliminar la mesa ${mesa.numero_mesa}?`)) return;
    await staffApi.mesas.eliminar(mesa.id).catch((e) => setError(e.message));
    recargarMesas();
  };

  return (
    <div>
      <PageTitle
        accion={
          <div className="flex gap-2">
            {mesas.length > 0 && (
              <Btn variante="secundario" onClick={imprimirTodas}>
                <Printer size={15} className="inline -mt-0.5 mr-1" /> Imprimir todas
              </Btn>
            )}
            <Btn variante="secundario" onClick={() => setModalSucursal(true)}>
              <Plus size={15} className="inline -mt-0.5 mr-1" /> Sucursal
            </Btn>
            <Btn onClick={() => setModalMesa(true)} disabled={!sucursalActiva}>
              <Plus size={15} className="inline -mt-0.5 mr-1" /> Mesa
            </Btn>
          </div>
        }
      >
        Sucursales y códigos QR
      </PageTitle>
      <ErrorMsg error={error} />

      {sucursales.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl shadow-sm">
          <EstadoVacio
            icono={QrCode}
            titulo="Sin sucursales todavía"
            mensaje="Crea tu primera sucursal para generar mesas con código QR."
            accion={<Btn onClick={() => setModalSucursal(true)}>Nueva sucursal</Btn>}
          />
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {sucursales.map((s) => (
              <button
                key={s.id}
                onClick={() => setSucursalActiva(s.id)}
                className={`px-4 py-2 rounded-xl text-sm border transition-colors duration-fast ${
                  sucursalActiva === s.id
                    ? 'bg-accent-soft border-amber text-amber-soft font-semibold'
                    : 'bg-surface border-line text-muted hover:text-cream hover:border-muted'
                }`}
              >
                {s.nombre}
              </button>
            ))}
          </div>

          {mesas.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl shadow-sm">
              <EstadoVacio
                icono={QrCode}
                titulo="Esta sucursal aún no tiene mesas"
                mensaje="Cada mesa genera su propio código QR para que los comensales abran el menú."
                accion={<Btn onClick={() => setModalMesa(true)}>Nueva mesa</Btn>}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mesas.map((mesa) => (
                <Card key={mesa.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-base font-bold tracking-tight text-cream">Mesa {mesa.numero_mesa}</div>
                    <Badge tono="ok">QR activo</Badge>
                  </div>

                  {qrs[mesa.id] && (
                    <div className="bg-white rounded-xl p-3 mb-3 grid place-items-center">
                      <img src={qrs[mesa.id]} alt={`QR mesa ${mesa.numero_mesa}`} className="w-36 h-36" />
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Btn variante="secundario" className="!px-2.5 !py-1.5 text-xs" onClick={() => descargarQr(mesa)}>
                      <Download size={13} className="inline -mt-0.5 mr-1" /> Descargar
                    </Btn>
                    <Btn variante="secundario" className="!px-2.5 !py-1.5 text-xs" onClick={() => imprimirUna(mesa)}>
                      <Printer size={13} className="inline -mt-0.5 mr-1" /> Imprimir
                    </Btn>
                    <Btn variante="secundario" className="!px-2.5 !py-1.5 text-xs" onClick={() => copiar(mesa)}>
                      <Copy size={13} className="inline -mt-0.5 mr-1" />
                      {copiada === mesa.id ? '¡Copiado!' : 'Enlace'}
                    </Btn>
                    <a href={urlMesa(mesa.codigo_qr_token)} target="_blank" rel="noreferrer">
                      <Btn variante="secundario" className="!px-2.5 !py-1.5 text-xs">
                        <ExternalLink size={13} className="inline -mt-0.5 mr-1" /> Abrir
                      </Btn>
                    </a>
                    <Btn variante="secundario" className="!px-2.5 !py-1.5 text-xs" onClick={() => regenerar(mesa)}>
                      <RefreshCw size={13} />
                    </Btn>
                    <Btn variante="peligro" className="!px-2.5 !py-1.5 text-xs" onClick={() => eliminarMesa(mesa)}>
                      <Trash2 size={13} />
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal abierto={modalSucursal} titulo="Nueva sucursal" onCerrar={() => setModalSucursal(false)}>
        <form onSubmit={crearSucursal}>
          <Field label="Nombre">
            <Input value={formSucursal.nombre} onChange={(e) => setFormSucursal({ ...formSucursal, nombre: e.target.value })} required />
          </Field>
          <Field label="Dirección">
            <Input value={formSucursal.direccion} onChange={(e) => setFormSucursal({ ...formSucursal, direccion: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <Input value={formSucursal.telefono} onChange={(e) => setFormSucursal({ ...formSucursal, telefono: e.target.value })} />
          </Field>
          <Btn type="submit" className="w-full mt-2">Crear sucursal</Btn>
        </form>
      </Modal>

      <Modal abierto={modalMesa} titulo="Nueva mesa" onCerrar={() => setModalMesa(false)}>
        <form onSubmit={crearMesa}>
          <Field label="Número de mesa">
            <Input value={numeroMesa} onChange={(e) => setNumeroMesa(e.target.value)} placeholder="Ej. 12" required />
          </Field>
          <Btn type="submit" className="w-full mt-2">Crear mesa con QR</Btn>
        </form>
      </Modal>
    </div>
  );
}
