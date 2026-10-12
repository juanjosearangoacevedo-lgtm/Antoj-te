const plataformaModel = require('../models/plataforma.model');

// Superadmin: estadísticas globales de toda la plataforma.
// Las consultas son independientes entre sí, así que van en paralelo.
const estadisticas = async () => {
  const [restaurantes, porPlan, usuarios, pedidos, mrr, topRestaurantes] = await Promise.all([
    plataformaModel.conteoRestaurantes(),
    plataformaModel.restaurantesPorPlan(),
    plataformaModel.conteoUsuarios(),
    plataformaModel.resumenPedidos(),
    plataformaModel.mrrEstimado(),
    plataformaModel.topRestaurantes30Dias(),
  ]);

  return {
    restaurantes,
    por_plan: porPlan,
    usuarios,
    pedidos,
    mrr_estimado: mrr,
    top_restaurantes_30_dias: topRestaurantes,
  };
};

module.exports = { estadisticas };
