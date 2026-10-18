require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const seoRoutes = require('./routes/seo.routes');
const errorHandler = require('./middlewares/errorHandler');
const { ApiError } = require('./errors');

const app = express();

// En producción Express queda detrás de Nginx (ver frontend/nginx.conf), que
// reenvía la IP real en X-Forwarded-For. Sin esto, `req.ip` sería la IP del
// contenedor de Nginx —la misma para todo el mundo— y el límite de envíos del
// formulario público bloquearía a todos en cuanto uno agotara su cupo.
// El 1 es el número de proxies de confianza: solo Nginx.
app.set('trust proxy', 1);

app.use(helmet());

// CORS cerrado por defecto.
//
// En produccion el navegador pide /api al MISMO origen (Nginx enruta), asi que
// no hace falta ninguna cabecera CORS: sin origenes configurados no se emite
// ninguna y solo funciona el mismo origen, que es exactamente lo que queremos.
// Antes habia un `cors()` pelado, que responde Access-Control-Allow-Origin: *
// y deja que cualquier web de Internet lea la API.
//
// En desarrollo si es cross-origin (Vite en 5173 contra el backend en 3000),
// de ahi los origenes locales por defecto. CORS_ORIGENES permite anadir mas
// (una app movil, un panel aparte) sin tocar codigo.
const origenes = (process.env.CORS_ORIGENES || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const origenesDev = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const origenesPermitidos =
  origenes.length > 0 ? origenes : process.env.NODE_ENV === 'production' ? false : origenesDev;
app.use(cors({ origin: origenesPermitidos }));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Tope explicito del cuerpo. El de por defecto de express.json ya es 100kb,
// pero conviene que este escrito: ningun endpoint de Antojate recibe mas que un
// tema visual con sus JSON, y el video no pasa por aqui (va directo a Bunny).
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', routes);

// Paginas publicas que se sirven ya escritas en HTML (/r/:slug), mas sitemap y
// llms.txt. Van en la raiz y no bajo /api porque las pide un buscador, no el
// frontend. Nginx solo reenvia estas tres rutas aqui; el resto lo sirve el.
//
// helmet pone una CSP pensada para JSON. Estas si son HTML y las mira un
// rastreador, asi que se le quita el X-Frame-Options que impediria la vista
// previa incrustada, y se deja pasar la fuente de Google que usa la marca.
app.use(seoRoutes);

app.use((req, res, next) => next(new ApiError(404, 'Ruta no encontrada')));
app.use(errorHandler);

module.exports = app;
