import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ListTree } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { PageTitle, Btn, Tabla, Badge, Modal, Field, Input, ErrorMsg, EstadoVacio, SkeletonPagina, IconBtn } from '@/shared/components/ui';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [editando, setEditando] = useState(null); // null | 'nuevo' | categoria
  const [nombre, setNombre] = useState('');

  const cargar = () =>
    staffApi.categorias
      .listar()
      .then(setCategorias)
      .catch((e) => setError(e.message))
      .finally(() => setCargado(true));
  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setNombre('');
    setEditando('nuevo');
  };
  const abrirEditar = (cat) => {
    setNombre(cat.nombre);
    setEditando(cat);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editando === 'nuevo') await staffApi.categorias.crear({ nombre, orden: categorias.length });
      else await staffApi.categorias.actualizar(editando.id, { nombre });
      setEditando(null);
      setNombre('');
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActiva = async (cat) => {
    try {
      await staffApi.categorias.actualizar(cat.id, { activo: !cat.activo });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  // Intercambia el orden con la categoría vecina
  const mover = async (idx, dir) => {
    const a = categorias[idx];
    const b = categorias[idx + dir];
    if (!b) return;
    try {
      await Promise.all([
        staffApi.categorias.actualizar(a.id, { orden: idx + dir }),
        staffApi.categorias.actualizar(b.id, { orden: idx }),
      ]);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}" y todos sus platos?`)) return;
    try {
      await staffApi.categorias.eliminar(cat.id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageTitle
        accion={
          <Btn onClick={abrirNuevo}>
            <Plus size={15} className="inline -mt-0.5 mr-1" /> Nueva categoría
          </Btn>
        }
      >
        Categorías de la carta
      </PageTitle>
      <ErrorMsg error={error} />

      {!cargado ? (
        <SkeletonPagina filas={4} />
      ) : categorias.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl shadow-sm">
          <EstadoVacio
            icono={ListTree}
            titulo="Tu carta empieza aquí"
            mensaje="Crea tu primera categoría (ej. Entradas, Platos fuertes, Bebidas…)."
            accion={<Btn onClick={abrirNuevo}>Nueva categoría</Btn>}
          />
        </div>
      ) : (
        <Tabla columnas={['Orden', 'Categoría', 'Estado', 'Acciones']}>
          {categorias.map((cat, idx) => (
            <tr key={cat.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => mover(idx, -1)} disabled={idx === 0} className="text-muted hover:text-amber disabled:opacity-20" aria-label="Subir">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => mover(idx, 1)} disabled={idx === categorias.length - 1} className="text-muted hover:text-amber disabled:opacity-20" aria-label="Bajar">
                    <ArrowDown size={14} />
                  </button>
                  <span className="text-muted text-xs ml-1">{idx + 1}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-cream font-medium">{cat.nombre}</td>
              <td className="px-4 py-3">
                <button onClick={() => toggleActiva(cat)}>
                  <Badge tono={cat.activo ? 'ok' : 'neutro'}>{cat.activo ? 'Activa' : 'Inactiva'}</Badge>
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <IconBtn icono={Pencil} tam={15} etiqueta="Editar categoría" onClick={() => abrirEditar(cat)} />
                  <IconBtn
                    icono={Trash2}
                    tam={15}
                    etiqueta="Eliminar categoría"
                    className="hover:!text-danger hover:!bg-danger-soft"
                    onClick={() => eliminar(cat)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
      )}

      <Modal
        abierto={editando !== null}
        titulo={editando === 'nuevo' ? 'Nueva categoría' : 'Editar categoría'}
        onCerrar={() => setEditando(null)}
      >
        <form onSubmit={guardar}>
          <Field label="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Postres" required />
          </Field>
          <Btn type="submit" className="w-full mt-2">
            {editando === 'nuevo' ? 'Crear categoría' : 'Guardar cambios'}
          </Btn>
        </form>
      </Modal>
    </div>
  );
}
