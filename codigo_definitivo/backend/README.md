# Backend — Menú Digital SaaS (Video Vertical)

Backend en Node.js + Express + MySQL (mysql2 puro, sin ORM) para el SaaS de menú
digital interactivo descrito en `menu_digital_saas.sql`. Cubre: autenticación,
gestión multi-tenant, menú (categorías/platos/combos/modificadores/ingredientes),
carrito persistente anónimo, pedidos con KDS (tiempos de cocina), recomendaciones IA
y analítica del embudo de conversión de video.

## 1. Instalación

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales de MySQL
```

Antes de correr el backend, crea la base de datos con el script
`menu_digital_saas.sql` (en MySQL Workbench o por consola):

```bash
mysql -u root -p < menu_digital_saas.sql
```

## 2. Datos iniciales obligatorios

La tabla `roles` no trae datos por defecto en el script SQL, así que hay que
sembrarla, y luego crear el primer usuario superadmin (no existe endpoint
público de registro por seguridad — se crea por CLI):

```bash
npm run seed:roles
npm run create:superadmin -- "Nombre Admin" admin@ejemplo.com claveSegura123
```

## 3. Levantar el servidor

```bash
npm run dev     # con nodemon, recarga automática
npm start        # produccion
```

Por defecto queda en `http://localhost:3000`. Prueba de salud: `GET /health`.

## 4. Autenticación

```
POST /api/auth/login   { "email": "...", "password": "..." }
→ { "token": "...", "usuario": { ... } }
```

Todas las rutas de staff (todo excepto `/api/public/*` y `/api/auth/login`)
requieren el header:

```
Authorization: Bearer <token>
```

### Roles (`role_nombre`)
- `superadmin` — administra planes y todos los restaurantes (tenants).
- `admin_restaurante` — administra su propio restaurante (menú, sucursales, staff, analítica).
- `cocinero` — usa el KDS (tablero de cocina) e inventario.
- `mesero` — usa el KDS para ver/entregar pedidos.

Los usuarios no-superadmin están automáticamente restringidos a su propio
`restaurante_id` (tomado del token) en todos los listados y creaciones.

## 5. Estructura de carpetas

Arquitectura **por capas**. Cada petición las atraviesa siempre en el mismo orden,
así que cuando algo falla, el tipo de fallo dice en qué carpeta buscar:

```
ruta → middlewares → validador → controller → service → model → MySQL
```

```
src/
  app.js                 App Express (middlewares + montaje de rutas)
  server.js              Punto de entrada (listen)
  config/db.js           Pool de conexión MySQL
  middlewares/
    auth.js               authenticate, authorize(...roles), resolveRestauranteId
    features.js           feature flags del plan (+ caché) para staff y público
    validar.js            aplica un esquema Zod y corta con 400 si no cuadra
    asyncHandler.js       wrapper para errores async
    errorHandler.js       manejador global de errores
  errors/
    ApiError.js           clase base (statusCode, message, details)
    index.js              BadRequest(400) · Unauthorized(401) · Forbidden(403)
                          NotFound(404) · Conflict(409)
  validators/
    <recurso>.validator.js  esquemas Zod por operación
    comunes.js            piezas compartidas (id, texto, sesionToken…)
  utils/
    jwt.js                sign/verify
  routes/
    <recurso>.routes.js    rutas + middlewares + validador de cada recurso
    index.js              monta todas las rutas bajo /api
    public.routes.js       flujo del comensal sin login (QR, menú, carrito, pedidos)
  controllers/
    <recurso>.controller.js   request/response. Nada más
  services/
    <recurso>.service.js   reglas de negocio. NO contiene SQL
  models/
    <recurso>.model.js     acceso a datos. Todo el SQL vive aquí
```

**Las dos reglas que sostienen la separación:**

1. **Los models no lanzan `ApiError`.** Devuelven la fila, `null`, o el número de filas
   afectadas. Quien decide que "no encontrado" significa 404 es el service.
2. **Los services no escriben SQL.** Si un service necesita una consulta nueva, se le
   agrega un método al model.

Los models reciben un parámetro `db` opcional (por defecto el pool). Así un service
que abre una transacción les pasa la conexión y todas las consultas viajan dentro:

```js
const conn = await pool.getConnection();
await conn.beginTransaction();
const pedidoId = await pedidosModel.crear({ ... }, conn);   // ← misma transacción
await carritoModel.eliminar(carrito.id, conn);
await conn.commit();
```

Hoy solo tres services abren transacciones: `carrito` (checkout), `pedidos`
(cambio de estado + bitácora) y `restaurantes` (cambio de plan).

## 6. Mapa de endpoints (staff, requieren JWT)

| Recurso | Rutas |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Planes (superadmin) | CRUD `/api/planes` |
| Restaurantes | CRUD `/api/restaurantes` |
| Roles | `GET /api/roles` |
| Usuarios (staff) | CRUD `/api/usuarios` |
| Sucursales | CRUD `/api/sucursales` |
| Mesas | `GET /api/mesas/sucursal/:sucursalId`, CRUD `/api/mesas`, `POST /api/mesas/:id/regenerar-qr` |
| Categorías | CRUD `/api/categorias` |
| Ingredientes | CRUD `/api/ingredientes`, `PATCH /api/ingredientes/:id/stock` |
| Platos | CRUD `/api/platos`, `PUT /api/platos/:id/ingredientes`, `PUT /api/platos/:id/grupos-modificadores` |
| Combos | CRUD `/api/combos`, `PUT /api/combos/:id/items` |
| Modificadores | CRUD `/api/modificadores/grupos`, CRUD `/api/modificadores/opciones` |
| Pedidos / KDS | `GET /api/pedidos` (filtros `estado`, `sucursal_id`), `GET /api/pedidos/:id`, `PATCH /api/pedidos/:id/estado` |
| Recomendaciones IA | `POST /api/recomendaciones`, `DELETE /api/recomendaciones/:id` |
| Analítica | `GET /api/analitica/embudo-conversion`, `GET /api/analitica/top-platos`, `GET /api/analitica/tiempos-cocina` |

## 7. Mapa de endpoints públicos (comensal, sin login)

Todo bajo `/api/public`. El comensal se identifica con un `sesion_token`
(UUID generado en el cliente/app, sin registro) y un `token` de QR de mesa.

| Acción | Ruta |
|---|---|
| Resolver mesa al escanear QR | `GET /api/public/mesas/:token` |
| Feed de video del menú | `GET /api/public/:token/menu` |
| Detalle de un plato | `GET /api/public/platos/:platoId` |
| Recomendaciones de un plato | `GET /api/public/platos/:platoId/recomendaciones` |
| Ver carrito | `GET /api/public/:token/carrito/:sesionToken` |
| Agregar al carrito | `POST /api/public/:token/carrito` |
| Editar línea de carrito | `PUT /api/public/carrito/detalle/:detalleId` |
| Quitar línea de carrito | `DELETE /api/public/carrito/detalle/:detalleId` |
| Checkout (crea el pedido) | `POST /api/public/:token/carrito/checkout` |
| Like/unlike | `POST /api/public/favoritos` |
| Ver mis favoritos | `GET /api/public/favoritos/:sesionToken` |
| Registrar evento de video | `POST /api/public/eventos` |
| Ver mis pedidos | `GET /api/public/pedidos/:sesionToken` |

### Ejemplo de flujo completo del comensal

```bash
# 1. Escanea QR
GET /api/public/mesas/<token-qr>

# 2. Ve el feed de video del menu
GET /api/public/<token-qr>/menu

# 3. Agrega un plato con modificadores
POST /api/public/<token-qr>/carrito
{
  "sesion_token": "uuid-generado-en-el-cliente",
  "plato_id": 5,
  "cantidad": 2,
  "notas_instrucciones": "sin cebolla",
  "modificadores": [12, 15]
}

# 4. Revisa el carrito
GET /api/public/<token-qr>/carrito/<sesion_token>

# 5. Hace checkout -> crea el pedido y congela precios
POST /api/public/<token-qr>/carrito/checkout
{ "sesion_token": "...", "observaciones": "mesa junto a la ventana" }

# 6. Sigue el estado de su pedido
GET /api/public/pedidos/<sesion_token>
```

## 7 bis. API de la app móvil (`/api/app/v1`)

La app móvil del comensal (`codigo_definitivo/movil/`) habla por su propio
prefijo, **versionado**: una app publicada no se actualiza a la fuerza, así que
el día que un contrato tenga que romperse nacerá `/v2` y `/v1` seguirá
respondiendo. `/api/public` no se toca.

**Identidad separada del staff.** El comensal vive en la tabla `comensales` (no
en `usuarios`), y su token se firma con una clave derivada de `JWT_SECRET`: un
token de comensal no verifica en `authenticate` (staff) ni al revés. El access
token dura 15 minutos y se renueva con un refresh token que rota en cada uso (en
la base solo su hash). Detalle en `utils/jwt.js` y
`services/sesionesComensal.service.js`.

Cabeceras que manda la app en cada petición: `X-Dispositivo` (UUID del teléfono,
no es una credencial), `X-Plataforma` (`ios` | `android`) y, con sesión,
`Authorization: Bearer <access token>`.

| Acción | Ruta | Sesión |
|---|---|---|
| Versión mínima admitida de la app | `GET /api/app/v1/config` | — |
| Crear cuenta (abre sesión) | `POST /api/app/v1/auth/registro` | — |
| Entrar | `POST /api/app/v1/auth/login` | — |
| Renovar el access token | `POST /api/app/v1/auth/refresh` `{ refresh_token }` | — |
| Cerrar sesión en este teléfono | `POST /api/app/v1/auth/logout` `{ refresh_token }` | — |
| Pedir código para restablecer la clave | `POST /api/app/v1/auth/recuperar` | — |
| Restablecer con el código (abre sesión) | `POST /api/app/v1/auth/restablecer` | — |
| Ver / editar la cuenta | `GET` · `PUT /api/app/v1/cuenta` | comensal |
| Cambiar la clave (cierra las demás sesiones) | `PUT /api/app/v1/cuenta/password` | comensal |
| Pedir / confirmar código de verificación del correo | `POST /api/app/v1/cuenta/verificacion` · `/verificacion/confirmar` | comensal |
| Borrar la cuenta (pide la clave) | `DELETE /api/app/v1/cuenta` `{ password }` | comensal |

Los códigos por correo son de 6 dígitos, vencen en 15 minutos, admiten 5
intentos y se pueden pedir 3 por hora y cuenta. Sin `RESEND_API_KEY` no se envían:
en desarrollo se escriben en la consola del backend.

### El feed y su capa social (fase 2)

Nada de esto exige cuenta salvo comentar, reportar y bloquear. Sin sesión, los
"me gusta" y los guardados son del teléfono (`X-Dispositivo`); al entrar o
registrarse pasan a la cuenta.

| Acción | Ruta | Sesión |
|---|---|---|
| Página del feed (antojos opcionales, cursor opaco) | `GET /api/app/v1/feed?antojo=…&cursor=…&limite=12` | opcional |
| Cuántos platos coinciden con unos antojos | `GET /api/app/v1/feed/conteo?antojo=…` | opcional |
| Opciones de la hoja ANTOJATE y restaurantes | `GET /api/app/v1/feed/opciones` | opcional |
| Un plato con la forma del feed | `GET /api/app/v1/platos/:id` | opcional |
| Me gusta / quitarlo (idempotente) | `POST` · `DELETE /api/app/v1/platos/:id/me-gusta` | opcional |
| Comentarios de un plato | `GET /api/app/v1/platos/:id/comentarios?cursor=…` | opcional |
| Comentar | `POST /api/app/v1/platos/:id/comentarios` `{ texto }` | comensal |
| Borrar un comentario propio | `DELETE /api/app/v1/comentarios/:id` | comensal |
| Reportar un comentario | `POST /api/app/v1/reportes` `{ comentario_id, motivo }` | comensal |
| Bloquear a quien escribió un comentario | `POST /api/app/v1/bloqueos` `{ comentario_id }` | comensal |
| Guardados: ver, guardar, quitar | `GET` · `POST /api/app/v1/guardados` · `DELETE /guardados/:id` | opcional |
| Señales del feed, por lotes de hasta 50 | `POST /api/app/v1/eventos` `{ eventos }` | opcional |

Los antojos son los mismos ids que arma la app (`categoria:postres`, `chef`,
`sabor:picante`, `precio:25000`, `restaurante:<slug>`): dentro de un tipo basta
una opción, entre tipos hay que cumplirlas todas, y un id desconocido no filtra.
El orden es lo más reciente primero, sin dos platos seguidos del mismo
restaurante mientras haya otro; el cursor fija el momento en que empezó la
sesión de feed, así que paginar no repite platos. Detalle en
`services/feed.service.js` y `services/feed/orden.js`.

Quien tiene sesión no ve los comentarios de las personas que bloqueó ni los que
reportó, y el `total` de `GET …/comentarios` cuenta lo que esa persona ve, para
que cuadre con la lista. El número de comentarios del feed es otro: el de todo
el mundo.

En el panel, `GET /api/comentarios` (`?reportados=1`, `?estado=oculto`),
`PATCH /api/comentarios/:id` `{ estado }` y `DELETE /api/comentarios/:id` dejan
moderar lo que se comenta sobre los platos del restaurante. Un comentario con
tres reportes de personas distintas se oculta solo hasta que alguien lo revise.

Para desarrollar con más de un restaurante: `node scripts/seedDesarrolloApp.js`
crea dos restaurantes ficticios (`prueba-app-*`) que reutilizan los videos del
demo, y `--borrar` los quita. No corre con `NODE_ENV=production`.

## 8. Notas de diseño

- **Multi-tenant por `restaurante_id`**: casi todos los controladores de staff
  usan `resolveRestauranteId(req)` — el superadmin puede operar sobre cualquier
  restaurante indicándolo explícitamente; el resto queda anclado a su propio
  tenant vía el JWT.
- **Precios congelados**: `detalles_pedido.precio_unitario` y
  `pedido_detalle_modificadores.precio_cobrado` se graban en el momento del
  checkout, para que cambios futuros en el menú no alteren pedidos históricos.
- **Transacciones**: el checkout del carrito y el cambio de estado de pedidos
  usan transacciones reales (`beginTransaction`/`commit`/`rollback`) para
  garantizar consistencia (ej. no crear un pedido a medias).
- **KDS**: cada cambio de estado queda en `pedido_tiempos_estados`, lo que
  permite calcular tiempos de cocina reales (ver `/api/analitica/tiempos-cocina`).
- **Inventario**: `PATCH /api/ingredientes/:id/stock` ajusta el stock de forma
  atómica y evita que quede negativo directamente a nivel de SQL.
