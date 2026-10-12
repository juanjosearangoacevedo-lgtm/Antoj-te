require('dotenv').config();
const app = require('./app');
const { asegurarConfiguracion } = require('./utils/jwt');

const PORT = process.env.PORT || 3000;

// Se comprueba ANTES de escuchar. Un servidor que acepta peticiones con un
// secreto ausente o debil es peor que uno que no arranca: parece que funciona.
try {
  asegurarConfiguracion();
} catch (err) {
  console.error(`[arranque] ${err.message}`);
  process.exit(1);
}

// Un fallo no capturado deja el proceso en estado desconocido: puede seguir
// aceptando peticiones con la mitad del estado roto. Se registra y se sale, y
// que la politica de reinicio de Docker levante un proceso limpio.
const morirCon = (motivo) => (err) => {
  console.error(
    JSON.stringify({ nivel: 'fatal', motivo, mensaje: err?.message, stack: err?.stack })
  );
  process.exit(1);
};
process.on('uncaughtException', morirCon('uncaughtException'));
process.on('unhandledRejection', morirCon('unhandledRejection'));

const servidor = app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

// Cada hora apaga la carta pública de los restaurantes cuya gracia tras vencer
// ya terminó (ver services/suscripciones.service.js).
require('./services/suscripciones.service').programarVencimientos();

// Sin esto, una conexion lenta puede mantener ocupado al proceso
// indefinidamente (Slowloris). Nginx ya corta por su lado, pero el backend no
// debe depender de que alguien mas lo proteja.
servidor.headersTimeout = 20_000;
servidor.requestTimeout = 30_000;

// SIGTERM es lo que manda `docker compose restart/stop`: cerrar ordenado evita
// cortar peticiones en curso a mitad de una transaccion.
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor…');
  servidor.close(() => process.exit(0));
});
