const planesModel = require('../models/planes.model');
const { NotFoundError, ConflictError } = require('../errors');
const { clearFeatureCache } = require('../middlewares/features');

// Cada plan se devuelve siempre con la lista de features que habilita y con su
// texto comercial.
async function conFeatures(plan) {
  const [features, caracteristicas] = await Promise.all([
    planesModel.featuresDePlan(plan.id),
    planesModel.caracteristicasDePlan(plan.id),
  ]);
  return { ...plan, features, caracteristicas };
}

// Vista PÚBLICA de un plan: la landing no necesita saber qué interruptores
// técnicos enciende cada plan ni cuándo se creó, así que no se los mandamos.
// Se enumera lo que SÍ sale, no lo que se quita: así un campo interno que se
// añada mañana no se publica solo por existir.
async function publico(plan) {
  return {
    id: plan.id,
    nombre: plan.nombre,
    slug: plan.slug,
    descripcion: plan.descripcion,
    precio: Number(plan.precio),
    precio_anual: plan.precio_anual === null ? null : Number(plan.precio_anual),
    limite_platos: plan.limite_platos,
    limite_usuarios: plan.limite_usuarios,
    destacado: Boolean(plan.destacado),
    orden: plan.orden,
    caracteristicas: await planesModel.caracteristicasDePlan(plan.id),
  };
}

// Los límites aceptan null ("sin límite") como valor legítimo, así que hay que
// distinguirlo de "no vino en el cuerpo". El model no puede: para él ambos
// llegarían como null y COALESCE conservaría el valor viejo.
function resolverLimites(datos, previo) {
  const decidir = (nuevo, actual) => (nuevo === undefined ? actual : nuevo);
  return {
    limitePlatos: decidir(datos.limite_platos, previo.limite_platos),
    limiteUsuarios: decidir(datos.limite_usuarios, previo.limite_usuarios),
  };
}

// Cambiar las features de un plan afecta a todos sus restaurantes, así que hay
// que invalidar la caché para que vuelvan a leerlas.
async function reemplazarFeatures(planId, features) {
  await planesModel.reemplazarFeatures(planId, features);
  clearFeatureCache();
}

const listar = async () => {
  const planes = await planesModel.listar();
  return Promise.all(planes.map(conFeatures));
};

const obtener = async (id) => {
  const plan = await planesModel.buscarPorId(id);
  if (!plan) throw new NotFoundError('Plan no encontrado');
  return conFeatures(plan);
};

// Lo que consume la landing. Solo planes a la venta, en el orden configurado.
const listarPublicos = async () => {
  const planes = await planesModel.listarActivos();
  return Promise.all(planes.map(publico));
};

// Del nombre sale el slug si no lo mandaron: nadie quiere escribirlo a mano, y
// dejarlo vacío rompería el enlace de la landing.
// Mapa explícito en vez de normalizar Unicode: son las únicas letras acentuadas
// del español y así el archivo no depende de rangos de bytes que se corrompen al
// copiarlo entre editores. Sin esto, "Básico" saldría como "ba-sico".
const SIN_TILDE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

function aSlug(texto) {
  return texto
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (l) => SIN_TILDE[l])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const crear = async (datos) => {
  const { features, caracteristicas, ...plan } = datos;
  plan.slug = plan.slug ? aSlug(plan.slug) : aSlug(plan.nombre);

  let id;
  try {
    id = await planesModel.crear(plan);
  } catch (err) {
    if (planesModel.esSlugDuplicado(err)) {
      throw new ConflictError(`Ya existe un plan con el identificador "${plan.slug}"`);
    }
    throw err;
  }

  if (features !== undefined) await reemplazarFeatures(id, features);
  if (caracteristicas !== undefined) await planesModel.reemplazarCaracteristicas(id, caracteristicas);
  return conFeatures(await planesModel.buscarPorId(id));
};

const actualizar = async (id, datos) => {
  const { features, caracteristicas, ...plan } = datos;
  const previo = await planesModel.buscarPorId(id);
  if (!previo) throw new NotFoundError('Plan no encontrado');
  if (plan.slug) plan.slug = aSlug(plan.slug);

  try {
    await planesModel.actualizar(id, plan, resolverLimites(datos, previo));
  } catch (err) {
    if (planesModel.esSlugDuplicado(err)) {
      throw new ConflictError(`Ya existe un plan con el identificador "${plan.slug}"`);
    }
    throw err;
  }

  if (features !== undefined) await reemplazarFeatures(id, features);
  if (caracteristicas !== undefined) await planesModel.reemplazarCaracteristicas(id, caracteristicas);
  return conFeatures(await planesModel.buscarPorId(id));
};

const eliminar = async (id) => {
  // No se puede borrar un plan que algún restaurante o suscripción esté usando
  // (rompería las llaves foráneas). Avisamos con un mensaje claro en vez de reventar.
  const uso = await planesModel.contarUsos(id);
  if (uso.restaurantes > 0) {
    throw new ConflictError(
      `No se puede eliminar este plan: ${uso.restaurantes} restaurante(s) lo están usando. Reasígnalos a otro plan primero.`
    );
  }
  if (uso.suscripciones > 0) {
    throw new ConflictError(
      `No se puede eliminar este plan: tiene ${uso.suscripciones} suscripción(es) asociada(s).`
    );
  }

  await planesModel.reemplazarFeatures(id, []);
  const eliminados = await planesModel.eliminar(id);
  if (eliminados === 0) throw new NotFoundError('Plan no encontrado');
  clearFeatureCache();
};

module.exports = { listar, listarPublicos, obtener, crear, actualizar, eliminar };
