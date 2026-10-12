const llamadosModel = require('../models/llamados.model');
const temasModel = require('../models/temas.model');
const { NotFoundError, ForbiddenError, ConflictError } = require('../errors');

// Reglas de negocio del llamado al mesero.
//
// Motivos que la plataforma sabe interpretar. Es una regla de negocio (define
// para qué se puede llamar), por eso vive aquí y el validador de la ruta la
// reutiliza, igual que TIPOS_EVENTO en analitica.service.
const MOTIVOS = ['mesero', 'cuenta'];

// Código que devuelve MySQL cuando choca el índice UNIQUE de llamado pendiente.
// No es un fallo: significa que esa mesa ya avisó.
const DUPLICADO = 'ER_DUP_ENTRY';

/**
 * Crea el llamado desde la mesa. Es un endpoint público, así que comprueba las
 * tres cosas que el comensal no puede falsear: que el QR exista, que el
 * restaurante esté activo y que el botón esté encendido en Personalización.
 *
 * Es IDEMPOTENTE por mesa: si ya hay un llamado pendiente devuelve ese mismo en
 * vez de fallar. El comensal impaciente que toca tres veces ve "ya avisamos" y
 * la cocina sigue viendo una sola tarjeta.
 */
const crear = async (token, { sesion_token, motivo }) => {
  const mesa = await llamadosModel.mesaPorTokenQr(token);
  if (!mesa) throw new NotFoundError('Codigo QR invalido');
  if (mesa.estado !== 'activo') {
    throw new ForbiddenError('Restaurante no disponible por el momento');
  }

  const tema = await temasModel.buscarPorRestaurante(mesa.restaurante_id);
  if (!tema?.llamar_mesero) {
    throw new ForbiddenError('Este restaurante no tiene activado el llamado al mesero');
  }

  // Dos intentos y no un reintento infinito: el segundo cubre el caso en que el
  // UNIQUE choca pero un mesero atiende ese pendiente justo entre el INSERT y
  // la consulta. Encadenar más carreras seguidas no es un escenario real.
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      const id = await llamadosModel.crear({
        mesa_id: mesa.mesa_id,
        sesion_token,
        motivo: motivo || MOTIVOS[0],
      });
      return { ...(await llamadosModel.buscarPorId(id)), ya_estaba: false };
    } catch (e) {
      if (e.code !== DUPLICADO) throw e;
      const pendiente = await llamadosModel.pendienteDeMesa(mesa.mesa_id);
      if (pendiente) return { ...pendiente, ya_estaba: true };
    }
  }

  throw new ConflictError('No se pudo registrar el llamado, intenta de nuevo');
};

const listarPendientes = (restauranteId, filtros) =>
  llamadosModel.listarPendientes(restauranteId, filtros);

/**
 * Marca el llamado como atendido. `restauranteId` sale del token del staff: sin
 * esa comprobación, un admin podría atender llamados de otro restaurante
 * pasando un id cualquiera.
 */
const atender = async (id, restauranteId, usuarioId) => {
  const duenio = await llamadosModel.restauranteDeLlamado(id);
  if (duenio === null) throw new NotFoundError('Llamado no encontrado');
  // restauranteId es null cuando el superadmin no acota por restaurante: en ese
  // caso puede atender cualquiera.
  if (restauranteId && Number(duenio) !== Number(restauranteId)) {
    throw new ForbiddenError('Ese llamado es de otro restaurante');
  }

  // Si otro mesero se adelantó, el UPDATE afecta 0 filas y el estado final es
  // el mismo que se buscaba. No es un error: se devuelve la fila como quedó.
  await llamadosModel.atender(id, usuarioId);
  return llamadosModel.buscarPorId(id);
};

module.exports = { MOTIVOS, crear, listarPendientes, atender };
