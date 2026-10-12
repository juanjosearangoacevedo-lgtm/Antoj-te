import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';
import { PageTitle, Btn, Card, Badge, Modal, Field, Input, Textarea, ErrorMsg } from '@/shared/components/ui';
import { FEATURES_DISPONIBLES } from '@/shared/constants/features';
import { formatoPrecioPlan } from '@/shared/utils/formato';

const FORM_VACIO = { nombre: '', precio: '', descripcion: '', features: [] };

export default function PlanesPage() {
  const [planes, setPlanes] = useState([]);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null); // null | 'nuevo' | plan
  const [form, setForm] = useState(FORM_VACIO);

  const cargar = () => staffApi.planes.listar().then(setPlanes).catch((e) => setError(e.message));
  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setEditando('nuevo');
  };
  const abrirEditar = (plan) => {
    setForm({ nombre: plan.nombre, precio: plan.precio, descripcion: plan.descripcion || '', features: plan.features || [] });
    setEditando(plan);
  };

  const toggleFeature = (clave) => {
    setForm((f) => ({
      ...f,
      features: f.features.includes(clave) ? f.features.filter((x) => x !== clave) : [...f.features, clave],
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    const body = { nombre: form.nombre, precio: Number(form.precio) || 0, descripcion: form.descripcion, features: form.features };
    try {
      if (editando === 'nuevo') await staffApi.planes.crear(body);
      else await staffApi.planes.actualizar(editando.id, body);
      setEditando(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (plan) => {
    if (!confirm(`¿Eliminar el plan "${plan.nombre}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    try {
      await staffApi.planes.eliminar(plan.id);
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
            <Plus size={15} className="inline -mt-0.5 mr-1" /> Nuevo plan
          </Btn>
        }
      >
        Planes de suscripción
      </PageTitle>
      <ErrorMsg error={error} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planes.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold tracking-tight text-cream">{plan.nombre}</h2>
              <div className="flex items-center gap-1.5">
                <button onClick={() => abrirEditar(plan)} className="text-muted hover:text-amber" aria-label="Editar plan">
                  <Pencil size={15} />
                </button>
                <button onClick={() => eliminar(plan)} className="text-muted hover:text-danger" aria-label="Eliminar plan">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-cream mt-2 tabular-nums">
              {formatoPrecioPlan(plan.precio)}
              <span className="text-xs text-muted font-normal">/mes</span>
            </div>
            <p className="text-muted text-xs mt-3 mb-4 flex-1">{plan.descripcion}</p>
            <div className="space-y-1.5">
              {FEATURES_DISPONIBLES.map((f) => {
                const activa = plan.features?.includes(f.clave);
                return (
                  <div
                    key={f.clave}
                    className={`flex items-center gap-2 text-xs ${activa ? 'text-cream' : 'text-muted/50'}`}
                  >
                    {activa ? <Check size={13} className="text-ok shrink-0" /> : <X size={13} className="shrink-0" />}
                    {f.nombre}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        abierto={editando !== null}
        titulo={editando === 'nuevo' ? 'Nuevo plan' : `Editar plan ${editando?.nombre || ''}`}
        onCerrar={() => setEditando(null)}
      >
        <form onSubmit={guardar}>
          <Field label="Nombre">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </Field>
          <Field label="Precio mensual (COP)">
            <Input type="number" min="0" step="100" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
          </Field>
          <Field label="Descripción">
            <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Field>
          <div className="mb-4">
            <span className="block text-xs uppercase tracking-wide text-muted mb-2">Funcionalidades (feature flags)</span>
            <div className="space-y-2">
              {FEATURES_DISPONIBLES.map((f) => (
                <label key={f.clave} className="flex items-start gap-3 bg-surface2 border border-line rounded-xl px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.features.includes(f.clave)}
                    onChange={() => toggleFeature(f.clave)}
                    className="mt-0.5 accent-[var(--c-primario)]"
                  />
                  <span>
                    <span className="block text-sm text-cream">{f.nombre}</span>
                    <span className="block text-[11px] text-muted">{f.descripcion}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Btn type="submit" className="w-full">Guardar plan</Btn>
        </form>
      </Modal>
    </div>
  );
}
