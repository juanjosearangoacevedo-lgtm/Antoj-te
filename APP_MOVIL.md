# Antojate — App móvil: auditoría técnica y propuesta

**Fecha:** 29 de septiembre de 2026
**Código auditado:** `92332b9`, rama `claude/en-que-vamos-b3c2c9`: es lo que corre en producción. Cuando se escribió, esta rama y `main` estaban en `995b4e3`, 8 commits por detrás; D1 ya lo resolvió (ver riesgo R4).
**Estado:** auditoría aprobada el 29 de septiembre de 2026, con **todas las recomendaciones aceptadas** (D1–D7 y las de cada fase en la §22). **Fase 1 implementada y probada en un emulador de Android** (ver [Anexo A](#anexo-a-archivos-de-la-fase-1)). **Fase 2 (el feed) implementada el 12 y 13 de octubre de 2026, con el saneo de D2 cerrado antes** (ver [Anexo C](#anexo-c-fase-2-el-feed)).
**Método:** lectura del código real (rutas, controllers, services, models, migraciones, frontend, Nginx, Docker) más verificaciones de solo lectura contra producción: `GET /api/public/directorio`, el CDN de Bunny y `/.well-known/`. Cada afirmación sale de un archivo o de una prueba concreta.

## Índice

- [0. Resumen ejecutivo](#0-resumen-ejecutivo)
- [1. Stack actual](#1-stack-actual)
- [2. Arquitectura](#2-arquitectura)
- [3. Estructura de carpetas](#3-estructura-de-carpetas)
- [4. Backend existente](#4-backend-existente)
- [5. API existente: convenciones](#5-api-existente-convenciones)
- [6. Endpoints disponibles](#6-endpoints-disponibles)
- [7. Modelos](#7-modelos)
- [8. Autenticación](#8-autenticación)
- [9. Sistema de restaurantes](#9-sistema-de-restaurantes)
- [10. Sistema de platos](#10-sistema-de-platos)
- [11. Sistema de videos](#11-sistema-de-videos)
- [12. Sistema de reservas](#12-sistema-de-reservas)
- [13. Sistema de disponibilidad](#13-sistema-de-disponibilidad)
- [14. Sistema de domicilios](#14-sistema-de-domicilios)
- [15. Datos de ubicación](#15-datos-de-ubicación)
- [16. Qué reutiliza la app directamente](#16-qué-reutiliza-la-app-directamente)
- [17. Qué necesita endpoints nuevos](#17-qué-necesita-endpoints-nuevos)
- [18. Qué necesita cambios en el backend y en el panel](#18-qué-necesita-cambios-en-el-backend-y-en-el-panel)
- [19. Riesgos técnicos](#19-riesgos-técnicos)
- [20. Dependencias nuevas](#20-dependencias-nuevas)
- [21. Arquitectura React Native propuesta](#21-arquitectura-react-native-propuesta)
- [22. Plan de implementación por fases](#22-plan-de-implementación-por-fases)
- [Anexo A. Archivos de la Fase 1](#anexo-a-archivos-de-la-fase-1)
- [Anexo B. Matriz de datos](#anexo-b-matriz-de-datos-qué-necesita-la-app-y-si-existe)
- [Anexo C. Fase 2: el feed](#anexo-c-fase-2-el-feed)

---

## 0. Resumen ejecutivo

Antojate hoy es un SaaS de **carta digital con video para el comensal que ya está sentado**: escanea el QR de su mesa, ve la carta como feed vertical, pide, y la cocina lo recibe en el KDS. Alrededor hay panel del restaurante, superadmin, landing con planes, vitrina pública `/r/:slug` y directorio SEO.

La app que describe el brief es **otro producto sobre la misma base**: descubrimiento entre restaurantes, fuera del local, que termina en una reserva o un domicilio. La auditoría se resume en cinco puntos:

1. **Se reutiliza el corazón del contenido.** `platos` ya es la unidad de contenido con video vertical; el pipeline de Bunny (subida TUS directa, HLS adaptativo, miniaturas) funciona en producción; hay endpoints públicos de perfil, carta, ficha de plato y recomendaciones. No hace falta almacenamiento de video ni sistema de restaurantes paralelo.
2. **Casi todo lo demás no existe en el backend:** cuentas de comensal, feed entre restaurantes, paginación, búsqueda, taxonomía (antojos, ocasiones, características), ubicación geográfica, horarios, capacidad y plano de mesas, reservas, disponibilidad, domicilios, comentarios, guardados y notificaciones. Buscando en todo el repo no aparece ni una línea de código sobre reservas, domicilios (solo un texto de una guía), coordenadas, horarios de apertura, comentarios de usuarios o notificaciones push.
3. **Lo nuevo necesita datos que hoy nadie captura**, y el brief prohíbe inventarlos. El panel web del restaurante tiene que crecer (plano, horarios, ubicación, características, reservas, domicilio); sin eso la app no tendría qué mostrar. Por eso cada fase del plan tiene tres frentes: **backend, panel y app**.
4. **El riesgo número uno es de producto, no técnico:** en producción hay **un solo restaurante publicable**, Casa Bitemo (el demo: 11 platos, sin ciudad, sin descripción, sin logo; verificado hoy en `/api/public/directorio`). Un feed que mezcla restaurantes necesita catálogo. La app se puede construir en paralelo, pero su lanzamiento depende de cuántos restaurantes reales tengan contenido.
5. **Riesgos técnicos que comprobé hoy:**
   - **Bunny bloquea todo lo que llega sin `Referer`.** Playlist, variantes, segmentos `.ts` y miniaturas responden **403**; con `Referer: https://bitemo.co/` responden **200**. Un reproductor nativo no manda `Referer` por defecto, pero `expo-video` y `expo-image` permiten añadirlo, y el código de `expo-video` lo aplica a todas las peticiones del video (lo comprobé leyendo el paquete). **En Android ya está comprobado** (emulador con Expo Go, Fase 1): con `Referer` el video se reproduce y la miniatura carga; sin él, el reproductor falla con 403. Falta el iPhone.
   - **`/.well-known/` responde 403 en producción**: la regla `location ~ /\.` de Nginx niega toda ruta que empiece por punto. Sin corregirla no hay enlaces universales (compartir un plato y que abra la app).
   - **Los frenos de tasa muy probablemente cuentan la IP de Cloudflare, no la del usuario** (`trust proxy 1` en Express + Cloudflare delante + Nginx sin `real_ip`). Con tráfico de app, el freno de login bloquearía a todos los usuarios que salen por el mismo nodo de Cloudflare.
   - **Los contenedores corren en UTC y no hay zona horaria configurada en ninguna parte.** Las reservas dependen de la hora local; hay que resolverlo antes de construirlas.

### 0.1 Relación con el plan del 14 de septiembre

Ya existe un plan para esta misma app: `PLAN-VISUAL-COMMERCE.md`, en el worktree `visual-commerce-architecture-20b1ed` (rama `feat/fase-1-saneo-esquema`). **Nunca se commiteó**, y en esa copia de trabajo hay además una **Fase 1 de saneo del esquema a medio hacer**, también sin commitear: la migración `2026-09-15_saneo_esquema.sql` (registro de migraciones, columnas que le faltan a `ingredientes`, índice único en `favoritos`) y cambios en `favoritos.model.js`, `favoritos.service.js`, `ingredientes.validator.js`, `init-db.sh` y `DESPLIEGUE.md`.

Este informe no parte de cero: **actualiza y amplía** ese plan.

- **Se mantiene** lo de fondo, porque lo sigo compartiendo: el feed se construye sobre `platos` y no sobre una tabla de contenidos nueva; el comensal es una identidad separada de `usuarios`; la app habla por un prefijo propio y versionado (`/api/app/v1`) sin tocar `/api/public`; la garantía contra la doble reserva vive en la base (`reserva_slots` con `PRIMARY KEY (mesa_id, inicio_slot)`); el plano es una rejilla de enteros por área; Expo + EAS Build; comentarios implican reportes, bloqueos y moderación.
- **Quedó desactualizado** porque el código cambió el 28 y 29 de septiembre: ya existe recuperar contraseña por correo (Resend), ya existe revocación de sesiones (`usuarios.sesion_version`), ya hay dos `FOR UPDATE` en el proyecto (pagos y recuperación) y ya hay un proceso programado (vencimientos, cada hora). Producción ya no es `995b4e3` sino `92332b9`. Expo va por el SDK 57, no el 54.
- **Se amplía** porque el brief nuevo pide lo que aquel dejó fuera a propósito: domicilios, antojos, ocasiones, filtros combinables, ubicación, presupuesto, búsqueda por intención en lenguaje natural y una arquitectura preparada para personalización. Y añade tres riesgos que aquel no vio: la zona horaria, la IP real detrás de Cloudflare y el 403 de `/.well-known/`.
- **Se replantea** un punto por conflicto con el brief: aquel pedía cuenta para dar "me gusta"; el brief quiere likes, guardados y comentarios sin cuenta. Mi propuesta intermedia está en la decisión D6.

### 0.2 Decisiones que necesito antes de empezar

**Resueltas el 29 de septiembre de 2026: se aceptaron todas las recomendaciones.** D1 ya está hecho (`main` y esta rama avanzaron a `92332b9`); D2 se cerró el 12 de octubre de 2026, como primer paso de la Fase 2 (Anexo C).

| # | Decisión | Mi recomendación | Bloquea |
|---|---|---|---|
| **D1** | **Rama base.** Producción corre `92332b9` en `claude/en-que-vamos-b3c2c9`, sin fusionar. | Fusionarla en `main` (es avance rápido: `main` es ancestro directo, no hay conflictos) y reconstruir esta rama encima. Si no, la app nace sobre código que ya no está en producción. | Fase 1 |
| **D2** | **El saneo sin commitear** de `feat/fase-1-saneo-esquema`. | Terminarlo sobre `92332b9` y fusionarlo antes de tocar `favoritos`. Arregla un fallo real: crear ingredientes desde el panel falla en una base creada con el esquema base, como la de producción (el model usa `costo_unitario` y `stock_actual`; ninguna migración las crea), y añade el registro de migraciones que esta app va a necesitar, porque vienen más de diez. | Fase 2 |
| **D3** | **Expo o React Native sin framework.** | **Expo** (managed + development builds + EAS Build). Desde Windows no se puede compilar iOS; EAS lo compila en la nube. Además se puede empezar en el teléfono con Expo Go, sin compilar nada. | Fase 1 |
| **D4** | **TypeScript o JavaScript.** Todo el repo es JavaScript. | **TypeScript solo en la app**, estricto y con nombres en español como el resto. La app vive de contratos con la API (feed, franjas, plano, pedidos); tiparlos convierte en error de compilación lo que si no sería un bug en el teléfono. Si prefieres JavaScript por coherencia con el repo, la arquitectura no cambia. | Fase 1 |
| **D5** | **Cuentas de comensal.** | Tabla propia `comensales` (el plan previo la llamaba `usuarios_app`; "comensal" es la palabra que ya usa todo el código para el usuario final) y tokens con otra audiencia. No un rol más en `usuarios` (ver §8). | Fase 1 |
| **D6** | **Likes, guardados y comentarios sin cuenta.** El brief los pide sin cuenta; App Store exige moderar el contenido de usuarios. | Likes y guardados **sin cuenta** (por dispositivo; al registrarse pasan a la cuenta). Comentarios **con cuenta**: sin identidad no se puede bloquear a quien abusa, y la tienda lo exige (guía 1.2). | Fase 2 |
| **D7** | **Entorno de pruebas.** | Backend local con una semilla de desarrollo (varios restaurantes ficticios con ubicación, horarios y plano), marcada como tal y que nunca corre en producción. La app no se prueba contra la base real. | Fase 1 |

Las decisiones de fases posteriores (planes que incluyen app, reservas y domicilio; confirmación de reservas; cobro de domicilios; motor de intención; cuentas de tienda) están en su fase, en la §22.

---

## 1. Stack actual

| Capa | Tecnología | Dónde se ve |
|---|---|---|
| Backend | Node.js 22 (`node:22-alpine`), Express 4.19, `mysql2` con SQL escrito a mano (sin ORM), Zod 4, `jsonwebtoken` (HS256), `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `morgan`, `uuid`, `dotenv` | `backend/package.json`, `backend/Dockerfile` |
| Base de datos | MySQL 8, `utf8mb4_unicode_ci`, **33 tablas** | `backend/migrations/`, `docker-compose.yml` |
| Web | React 18.3, Vite 5, Tailwind 3.4, React Router 6, `hls.js`, `tus-js-client`, `lucide-react`, `qrcode`. **JavaScript (JSX), sin TypeScript** | `frontend/package.json` |
| Video | Bunny Stream: una biblioteca (710666), una colección por restaurante, HLS adaptativo y miniaturas desde el CDN `vz-243cff12-4eb.b-cdn.net` | `backend/src/services/bunny.service.js` |
| Correo | Resend por HTTP con `fetch`, sin librería | `backend/src/utils/correo.js` |
| Pagos | Wompi Web Checkout, **solo para la suscripción del restaurante**; apagado en producción hasta tener llaves | `backend/src/services/pagos.service.js` |
| Infraestructura | VPS Vultr (1 vCPU, 2 GB), Docker Compose (`db`, `backend`, `web` = Nginx), Cloudflare delante en Full (strict), Let's Encrypt en el origen | `docker-compose.yml`, `frontend/nginx.conf` |
| Pruebas | `node --test`: **120 pruebas unitarias** (validadores, middlewares, JWT, Wompi, SEO, tema). Ninguna toca MySQL | `backend/tests/`, `frontend/tests/` |
| Idioma del código | JavaScript en todo el repo; archivos, funciones, columnas y comentarios en español | — |

## 2. Arquitectura

```
Quién entra                 Cloudflare (proxy, TLS Full strict) → VPS con Docker Compose
─────────────────           ──────────────────────────────────────────────────────────────
Comensal en mesa  ──┐
Vitrina /r/:slug  ──┤       web (Nginx): sirve la SPA y el HTML estático del build
Panel /admin      ──┼─────► y reenvía /api, /r, /restaurantes, sitemap y llms.txt
Cocina /cocina    ──┤                         │
Buscadores        ──┘                         ▼
                            backend (Express :3000)
                            ruta → middlewares → validador → controller → service → model
                                                                                      │
                                                                                      ▼
                                                                            db (MySQL 8)

Video:  navegador ──TUS──► Bunny (subida)      navegador ◄──HLS── CDN de Bunny (reproducción)
Correo: backend ──► Resend                     Suscripción: backend ◄──► Wompi (apagado)
```

- **Multi-tenant por fila:** base compartida y `restaurante_id` en las tablas raíz. El tenant de un usuario de staff sale de su JWT (`resolveRestauranteId`); el superadmin opera sin acotar.
- **Backend por capas,** con dos reglas que no se rompen: los models nunca lanzan `ApiError` (devuelven fila, `null` o filas afectadas) y los services nunca escriben SQL. Los models reciben un `db` opcional para entrar en transacciones.
- **Cuatro filtros de permiso:** rol (`authorize`), feature del plan (`requireFeature` / `requireFeaturePublic`: `menu`, `personalizacion`, `carrito`, `kds`), estado del restaurante (solo `activo` es público; `pendiente`, `suspendido` y `vencido` no) y membresía (el panel responde **402** con `codigo: SUSCRIPCION_VENCIDA`).
- **Dos puertas públicas a la misma carta:** el token del QR de una mesa (con carrito y pedido) y el slug de la vitrina (solo lectura).
- **Estado en memoria de un solo proceso:** cachés con `Map` y vencimiento (features 60 s, sesiones 30 s, membresía 60 s, analítica 60 s, SEO 5 min) y un temporizador horario de vencimientos. Funciona porque hay un solo proceso Node; escalar a varios exigiría llevar eso a un almacén compartido. Hoy no hace falta.
- **Frontend:** SPA por funcionalidades (`features/` + `shared/`), sin librería de estado ni de data fetching. La landing y las guías salen escritas en HTML desde el build; la vitrina y el directorio los escribe el backend.

## 3. Estructura de carpetas

```
App/                                   raíz del repo
├── ARQUITECTURA.md · DESPLIEGUE.md · docker-compose.yml · init-db.sh · deploy.sh · backup.sh
└── codigo_definitivo/
    ├── backend/
    │   ├── migrations/                bitemo_completo.sql + 19 migraciones fechadas (17 en el orden de init-db.sh)
    │   ├── scripts/                   seedRoles · seedPlanes · seedDemoRestaurante · createSuperadmin
    │   ├── src/
    │   │   ├── app.js · server.js · config/db.js
    │   │   ├── routes/                21 routers + public.routes.js (comensal) + seo.routes.js (HTML)
    │   │   ├── middlewares/           auth · features · limites · validar · errorHandler · asyncHandler
    │   │   ├── validators/            un esquema Zod por recurso + comunes.js
    │   │   ├── controllers/ services/ models/     uno por recurso
    │   │   ├── services/seo/          html · vitrina · directorio · indice
    │   │   └── utils/                 jwt · correo · wompi
    │   └── tests/unit/
    └── frontend/
        ├── seo/                       generadores del HTML estático
        ├── nginx.conf · cabeceras-seguridad.conf · Dockerfile
        └── src/
            ├── app/                   App.jsx · router.jsx
            ├── features/              landing · menu (comensal) · auth · admin/* · cocina · contenido
            └── shared/                components/ui · services (http, staffApi, token) · utils · tema · hooks · constants
```

## 4. Backend existente

| Recurso | Qué hace | Quién |
|---|---|---|
| `auth` | Login, `/me`, cambiar la propia clave, recuperar y restablecer por correo | Staff |
| `planes` | CRUD con feature flags; público: planes a la venta | Superadmin / landing |
| `restaurantes` | CRUD, estado, plan y membresía (superadmin); el admin edita nombre, logo (URL), moneda, slug, descripción y ciudad | Superadmin, admin |
| `usuarios`, `roles` | Equipo del restaurante, acotado por tenant | Admin |
| `sucursales` | Nombre, dirección y teléfono | Admin |
| `mesas` | Número de mesa y token de QR (regenerable) | Admin |
| `categorias`, `platos`, `combos`, `modificadores`, `ingredientes` | La carta. Platos con video de Bunny, receta, modificadores y recomendación del chef programable por día y hora | Admin |
| `carrito` + `pedidos` + `llamados` | Operación en mesa: carrito por mesa y sesión, checkout transaccional, KDS, llamar al mesero | Comensal (QR), cocina |
| `favoritos` | "Me gusta" anónimo por `sesion_token` | Comensal |
| `analitica` | Embudo por sesiones distintas (eventos del feed) y cifras de pedidos | Admin, superadmin |
| `recomendaciones` | Pares de platos con puntaje, **cargados a mano**: la tabla se llama `_ia_` pero no hay IA | Admin / comensal |
| `temas` | Personalización visual del menú (plan Intermedio+), incluye redes sociales y bienvenida | Admin |
| `solicitudes` | Alta desde la landing: aprobar crea restaurante + suscripción de prueba (14 días) + admin + correo | Superadmin |
| `pagos` | Cobro de la suscripción por Wompi + webhook | Admin |
| `plataforma` | Estadísticas globales | Superadmin |
| `seo` | Vitrina, directorio, sitemap y `llms.txt` en HTML/XML/texto | Buscadores |
| `suscripciones` (service) | Ciclo prueba → vencida → gracia de 7 días → `vencido` (carta apagada), con tarea horaria | Sistema |

## 5. API existente: convenciones

Todo lo que la app herede debe respetar esto:

- **Base:** `https://bitemo.co/api`, JSON, sin versión. Nginx reenvía `/api/` al backend.
- **Errores:** siempre `{ error: true, message, details? }`. Los 500 nunca exponen el mensaje interno.
- **Validación:** Zod antes del controller; 400 con el primer problema en `message` y la lista en `details`. **`z.object()` borra en silencio los campos no declarados.**
- **Staff:** `Authorization: Bearer <JWT>`. 401 = sesión inválida o revocada; 402 = membresía vencida; 403 = rol o plan; **404 para lo ajeno** (no se confirma que exista).
- **Público:** sin token. El comensal se identifica con un `sesion_token` (UUID generado en el navegador) más el token del QR o el slug.
- **Frenos de tasa por IP:** login 10 fallidos cada 15 min, escrituras públicas 60/min, subida de video 20/h, recuperar 5 cada 15 min. Sin límite global, a propósito (el KDS consulta cada 5 s).
- **CORS** cerrado en producción. A una app nativa no le afecta: CORS lo impone el navegador.
- **Ningún endpoint pagina.**

## 6. Endpoints disponibles

**108 endpoints bajo `/api`** (21 públicos, 5 de autenticación, 82 de staff) y **6 rutas fuera de `/api`**.

### 6.1 Públicos (`/api/public`), sin login

| Método | Ruta | Devuelve | ¿Le sirve a la app? |
|---|---|---|---|
| GET | `/r/:slug` | Restaurante (id, nombre, slug, descripción, ciudad, logo, moneda), plan, features, tema | **Sí**: cabecera del perfil |
| GET | `/r/:slug/menu` | Platos publicados con video listo, ordenados por categoría | **Sí**: carta y videos del perfil (sin paginar) |
| GET | `/platos/:platoId` | Plato con ingredientes (y alérgenos) y grupos de modificadores con opciones | **Sí**: ficha del plato. Le falta el restaurante al que pertenece |
| GET | `/platos/:platoId/recomendaciones` | Otros platos del mismo restaurante por afinidad | **Sí**: "también te puede gustar" |
| GET | `/directorio` · `/directorio/:ciudad` | Restaurantes que pasan la puerta de calidad del SEO (≥ 4 platos); ciudades con ≥ 3 | **Parcial**: sin ubicación ni paginación, y su puerta es de SEO, no de producto |
| GET | `/mesas/:token` · `/:token/config` · `/:token/menu` | Mesa, restaurante y carta a partir del QR | **Sí, en "modo mesa"**: la app puede escanear el QR y abrir la carta del local |
| GET · POST · PUT · DELETE | `/:token/carrito…` · `/carrito/detalle/:id` · `/:token/carrito/checkout` | Carrito y pedido en mesa | **Solo en modo mesa**. No sirve para domicilio (§14) |
| POST | `/:token/llamados` | Llamar al mesero | Solo en modo mesa |
| GET | `/pedidos/:sesionToken` | Pedidos de la sesión | Solo en modo mesa |
| POST · GET | `/favoritos` · `/favoritos/:sesionToken` | Toggle de "me gusta" anónimo; lista de ids y nombres | **Parcial**: sin unicidad, sin conteo público, mezcla "me gusta" y "guardado" |
| POST | `/eventos` | Evento de analítica | **No**: exige `sucursal_id`, y en el feed de descubrimiento no hay sucursal |
| GET | `/planes` · POST `/solicitudes` | Landing | No |

### 6.2 Autenticación (`/api/auth`): solo staff

`POST /login` · `GET /me` · `PUT /password` · `POST /recuperar` · `POST /restablecer`. **No sirven para comensales** (§8), pero sus piezas se reutilizan.

### 6.3 Staff (`/api/*`, JWT): resumen por recurso

| Recurso | Rutas | Acceso |
|---|---|---|
| `planes` | CRUD | superadmin |
| `restaurantes` | `GET/POST /`, `GET/PUT/DELETE /:id`, `PATCH /:id/estado`, `/:id/plan`, `/:id/suscripcion` | superadmin; el admin solo `GET/PUT /:id` |
| `usuarios` · `roles` | CRUD · `GET` | superadmin, admin |
| `sucursales` | CRUD | superadmin, admin |
| `mesas` | `GET /sucursal/:id`, `POST /`, `PUT /:id`, `POST /:id/regenerar-qr`, `DELETE /:id` | superadmin, admin |
| `categorias` · `combos` · `modificadores` · `ingredientes` | CRUD (+ `PUT /combos/:id/items`, `PATCH /ingredientes/:id/stock`) | superadmin, admin (+ cocinero en ingredientes) |
| `platos` | CRUD, `POST /video/solicitar-subida`, `GET /video/:guid/estado`, `PUT /:id/ingredientes`, `PUT /:id/grupos-modificadores` | superadmin, admin |
| `pedidos` · `llamados` | `GET /`, `GET /:id`, `PATCH /:id/estado` · `GET /`, `PATCH /:id/atender` | staff + feature `kds` |
| `recomendaciones` | `POST /`, `DELETE /:id` | superadmin, admin |
| `analitica` | `GET /resumen`, `/productos`, `/actividad`, `/plataforma` | admin; plataforma solo superadmin |
| `temas` | `GET /`, `PUT /` (feature `personalizacion`) | superadmin, admin |
| `solicitudes` · `plataforma` | bandeja, aprobar, rechazar · estadísticas | superadmin |
| `pagos` | `GET /`, `POST /`, `GET /transaccion/:id`; webhook público `POST /wompi/eventos` | admin |

Ninguno lo consume la app, pero **varios hay que extenderlos** para que el restaurante cargue los datos que la app necesita (§18).

### 6.4 Fuera de `/api`

`GET /health` · `GET /r/:slug` (vitrina en HTML) · `GET /restaurantes` · `GET /restaurantes/:ciudad` · `GET /sitemap-restaurantes.xml` · `GET /llms.txt`. Relevante para la app: **un enlace compartido a `https://bitemo.co/r/:slug?plato=N` ya abre ese plato en la web** (la vitrina reutiliza `MenuPage`, que lee `?plato=`). Es el respaldo perfecto para quien no tiene la app instalada.

## 7. Modelos

**33 tablas.** El esquema base es `bitemo_completo.sql` (28 tablas) y las migraciones añaden `solicitudes_demo`, `llamados_mesero`, `plan_caracteristicas`, `pagos` y `password_resets`.

```
planes ─┬─< plan_features                     restaurantes ─┬─< sucursales ─┬─< mesas ─┬─< carritos ─< carrito_detalle ─< …_modificadores
        ├─< plan_caracteristicas                            │               │          ├─< pedidos ─┬─< detalles_pedido ─< …_modificadores
        └─< restaurantes.plan_id                            │               │          │            └─< pedido_tiempos_estados
                                                            │               │          └─< llamados_mesero
                                                            │               └─< analiticas_eventos_video
                                                            ├─< categorias ─< platos ─┬─< plato_ingredientes >─ ingredientes
                                                            │                         ├─< plato_grupos_modificadores >─ grupos_modificadores ─< opciones_modificadores
                                                            │                         ├─< favoritos (por sesion_token)
                                                            │                         └─< recomendaciones_ia_productos (pares de platos)
                                                            ├─< combos ─< combo_items >─ platos
                                                            ├─< usuarios >─ roles
                                                            ├─< suscripciones
                                                            └── temas_restaurante (1:1)
 Sin clave ajena, a propósito: pagos · password_resets · solicitudes_demo
```

Columnas que importan para la app:

| Tabla | Columnas relevantes | Lo que NO tiene |
|---|---|---|
| `restaurantes` | `nombre`, `slug` (único, puede ser NULL), `descripcion` (300), `ciudad` (texto libre), `logo_url`, `moneda`, `estado`, `plan_id`, `actualizado_en` | ubicación, horarios, características, tipo de cocina, fotos |
| `sucursales` | `nombre`, `direccion` (texto libre), `telefono` | coordenadas, municipio, zona horaria, horarios; y no se exponen al público |
| `mesas` | `numero_mesa`, `codigo_qr_token` | capacidad, zona, posición, forma, características, "reservable" |
| `categorias` | `nombre` (texto libre por restaurante), `orden`, `activo` | cualquier relación con una taxonomía común |
| `platos` | `nombre`, `descripcion`, `precio`, `video_url`, `video_guid`, `video_thumbnail_url`, `video_status`, `imagen_url`, `nivel_picante` (0–3), `recomendado_chef` + días y horas, `activo`, `orden`, `creado_en`, `actualizado_en` | `restaurante_id` directo, etiquetas, duración del video, contadores, "aparece en la app" |
| `favoritos` | `sesion_token`, `plato_id` o `combo_id` | unicidad, dueño identificable, distinción like/guardado |
| `analiticas_eventos_video` | `sucursal_id` (NOT NULL), plato/combo, `tipo_evento`, `tiempo_segundos`, `sesion_token` | forma de registrar algo que no pase por una sucursal |
| `pedidos` | `mesa_id` (NOT NULL), `sesion_token`, `estado` (Recibido → En Preparación → Listo → Entregado / Cancelado), `total`, `observaciones` | tipo de pedido, cliente, dirección, costo de envío |

Tres hechos transversales:

- **El tenant de `platos` cuelga de `categorias`**, y el de `mesas` y `pedidos`, de `sucursales`. Cualquier consulta entre restaurantes necesita dos JOIN antes de filtrar.
- **Los tipos de los ids difieren entre bases:** `INT` en producción, `INT UNSIGNED` en la base local. Toda clave ajena nueva hacia tablas viejas se construye leyendo `information_schema` (precedente: `2026-08-04_llamados_mesero_y_bienvenida.sql`).
- **El pool usa `dateStrings: true` y no fija zona horaria;** MySQL en Docker corre en UTC por defecto (riesgo R6).

## 8. Autenticación

**Hoy existe una sola identidad con cuenta: el staff.**

- JWT HS256 de 8 horas, sin refresh. Carga útil: `id`, `nombre`, `email`, `restaurante_id`, `role_id`, `role_nombre` y `sv` (versión de sesión).
- **Revocación:** cambiar o restablecer la clave, cambiar el rol o borrar al usuario sube `usuarios.sesion_version`, y los tokens viejos dejan de valer (caché de 30 s).
- **Recuperación por correo:** token de 256 bits, en la base solo su SHA-256, vigencia de una hora, un solo uso, respuesta idéntica exista o no el correo.
- **No hay registro público:** a los usuarios los crea un admin o nacen al aprobar una solicitud.
- **El comensal es anónimo:** un UUID en `localStorage` (`menu_sesion_token`) identifica su carrito, sus "me gusta" y sus pedidos.

**Por qué los comensales no deben ir en `usuarios`:**

1. En los models, `restauranteId` nulo significa **"sin acotar"**, y solo el superadmin lo usa. Un comensal tiene `restaurante_id` NULL por naturaleza: cualquier descuido lo acercaría a los permisos del superadmin.
2. `usuarios.restaurante_id` tiene FK con `ON DELETE CASCADE` a `restaurantes`, y el panel lista `usuarios` como "el equipo". Miles de comensales aparecerían en la pantalla de Usuarios del superadmin.
3. El correo es único en `usuarios`: el dueño de un restaurante no podría ser también comensal con su mismo correo.
4. El login de staff devuelve plan, features y membresía, y el frontend del panel lo trata como sesión de panel.

**Hueco que hay que cerrar antes de emitir el primer token de comensal.** `authenticate` acepta cualquier JWT firmado con `JWT_SECRET` y valida la sesión buscando `payload.id` en `usuarios`. Un token de comensal con `id = 5` se compararía contra la `sesion_version` del empleado 5; como ambas nacen en 0, pasaría. `authorize()` lo frenaría casi siempre (el rol no coincide), pero `GET /api/auth/me` y `PUT /api/auth/password` solo exigen `authenticate`. Solución: **audiencia propia** en los tokens de comensal (`aud`) y **rechazo cruzado** en los dos middlewares, con pruebas.

**Qué se reutiliza tal cual:** `utils/jwt.js`, bcrypt con 10 rondas, el patrón de `sesion_version`, el patrón de recuperación (hash del token, un uso, vigencia), `middlewares/limites.js` y `utils/correo.js`.

**Qué hay que añadir:** refresh tokens (una app no puede pedir login cada 8 horas), borrado de cuenta desde la app (obligatorio en App Store, guía 5.1.1(v), y en Google Play) y verificación de correo. Para la app propongo **código de 6 dígitos por correo** en vez de enlace: no depende de que funcionen los enlaces universales.

## 9. Sistema de restaurantes

- **Alta:** solicitud desde la landing → el superadmin aprueba → en una transacción nacen restaurante, suscripción de prueba de 14 días y usuario admin, y sale un correo de bienvenida. **No se crea ninguna sucursal ni slug:** un restaurante recién aprobado no tiene sede (no puede tener mesas ni reservas) y no tiene dirección pública hasta que el admin escribe un slug en "Mi restaurante".
- **Estados:** `pendiente`, `activo`, `suspendido`, `vencido`. Todo lo público trata cualquier estado distinto de `activo` como no disponible.
- **Datos públicos:** nombre, slug, descripción, ciudad, logo, moneda y, **solo si el plan incluye personalización**, tema, redes sociales y mensaje de bienvenida (viven en `temas_restaurante`).
- **Puerta de calidad del directorio:** entra con ≥ 4 platos publicados; una ciudad tiene página con ≥ 3 restaurantes.
- **En producción hoy:** un restaurante publicable (Casa Bitemo, 11 platos, `ciudad` en NULL).
- **Falta para la app:** ubicación, horarios, teléfono público, fotos, características, tipo de cocina, capacidades para ocasiones, configuración de reservas y de domicilio, reseñas.

## 10. Sistema de platos

- El plato cuelga de una categoría de la carta (texto libre de cada restaurante: "Entradas", "Platos Fuertes"). **No hay taxonomía común** entre restaurantes.
- **El feed público** (`platos.model.feedPorRestaurante`) filtra plato activo + categoría activa + `video_status = 'listo'`, y ordena por categoría, recomendado vigente y orden manual. Devuelve **la carta entera, sin paginar**, y cada fila no dice de qué restaurante es.
- **Señales ya disponibles:** precio, `nivel_picante` (0–3, sirve directamente para "algo picante"), recomendado del chef, ingredientes y alérgenos.
- **Recomendado del chef:** se evalúa con `DAYOFWEEK(NOW())` y `CURTIME()` de MySQL, que corre en UTC: muy probablemente se activa con 5 horas de desfase en Colombia (R6).
- **Ingredientes:** leer funciona, pero **crear o editar falla en una base creada con `bitemo_completo.sql`**, que es como nació la de producción: el model usa `costo_unitario` y `stock_actual`, que ninguna migración crea (lo corrige el saneo pendiente). Los alérgenos de la ficha dependen de esos datos.
- **Modificadores:** mínimo, máximo y obligatorio **solo se validan en la web**; el backend acepta cualquier id de opción, incluso de otro restaurante. Tolerable en mesa (hay un mesero en medio); no para domicilio con dinero de por medio.
- **Combos:** tienen `video_url`, pero no salen en ningún feed.
- **Falta:** `restaurante_id` directo para indexar un feed global, "aparece en la app", fecha de publicación, duración del video, contadores, etiquetas (antojo, cocina, dieta, momento del día).

## 11. Sistema de videos

- **Subida:** el panel pide `POST /api/platos/video/solicitar-subida`; el backend crea el video en Bunny (dentro de la colección del restaurante) y firma una credencial TUS de una hora; **el archivo va directo del navegador a Bunny**, nunca pasa por el VPS. La AccessKey nunca sale del servidor.
- **Formatos (verificado hoy):** HLS con variantes 360p, 480p, 720p y superiores (`playlist.m3u8`), miniatura `thumbnail.jpg`, y renditions MP4 activas (la landing usa `play_720p.mp4`). Un video por plato.
- **Reproducción en la web:** `hls.js` diferido en Chrome/Android, HLS nativo en Safari; solo reproduce la tarjeta visible, precarga la vecina, bucle manual, y dispara los eventos del embudo.
- **Paso de "procesando" a "listo":** lo hace **la pestaña del admin** consultando cada pocos segundos (`PlatosPage.jsx`). Si la cierra antes de que Bunny termine, el plato se queda fuera del feed hasta que vuelva a abrir esa pantalla. No hay webhook de Bunny.
- **Protección contra enlaces directos (verificado hoy):**

  | Recurso | Sin `Referer` | Con `Referer: https://bitemo.co/` |
  |---|---|---|
  | `…/playlist.m3u8` | 403 | 200 |
  | `…/360p/video.m3u8` | 403 | 200 |
  | `…/360p/video0.ts` | 403 | 200 |
  | `…/thumbnail.jpg` | 403 | 200 |

  **Consecuencia para la app:** el reproductor y el componente de imagen tienen que mandar `Referer` en **todas** las peticiones (lista maestra, variantes, segmentos y miniaturas). Las dos librerías propuestas lo permiten, y leí cómo lo hace `expo-video` 57 por dentro: en Android fija las cabeceras en la fábrica HTTP de ExoPlayer (`setDefaultRequestProperties`), que las usa en cada petición; en iOS las pasa al recurso con `AVURLAssetHTTPHeaderFieldsKey`. `expo-image` acepta `headers` también al precargar. En Android ya está confirmado (emulador con Expo Go, con la pantalla de diagnóstico de la Fase 1); lo que queda es **confirmarlo en un iPhone**. Plan B si fallara: *token authentication* de Bunny (URLs firmadas por el backend; obliga a tocar también la web) o permitir `Referer` vacío (simple, pero debilita la protección). Conviene saber, de todos modos, que el `Referer` lo puede falsificar cualquiera: es un freno contra quien incrusta los videos en otra web, no una protección fuerte.
- **La app no sube videos:** los sube el restaurante desde el panel, que ya funciona. El brief se cumple sin almacenamiento nuevo.

## 12. Sistema de reservas

**No existe.** Ni tablas, ni endpoints, ni pantallas, ni en el backend ni en la web. Lo más cercano es `llamados_mesero`, que aporta un patrón útil: la unicidad garantizada por la base con un índice único sobre una columna generada, en vez de "leer y luego escribir".

## 13. Sistema de disponibilidad

**No existe disponibilidad de mesas.** Lo único que hoy significa "disponible" es de contenido: restaurante `activo`, plato y categoría activos, video listo, y la feature del plan. No hay horarios de apertura, ni capacidad de mesas, ni plano, ni cierres por festivo. La programación del "recomendado del chef" es lo único con días y horas, y solo aporta la **convención** (`DAYOFWEEK`, 1 = domingo), que conviene reutilizar en los horarios.

## 14. Sistema de domicilios

**No existe.** Y el sistema de pedidos actual **no se puede reutilizar tal cual**:

- `carritos.mesa_id` y `pedidos.mesa_id` son NOT NULL con clave ajena: todo pedido nace en una mesa.
- El KDS (`pedidos.model.listar`) y toda la analítica de pedidos hacen `JOIN mesas`: un pedido sin mesa sería invisible en la cocina y en las cifras.
- No hay dirección, costo de envío, zona de cobertura, estado "en camino" ni cliente identificado.
- Los modificadores no se validan en el servidor (§10).
- Wompi está configurado con **Antojate como comercio** para cobrar la suscripción. Cobrar pedidos a nombre de los restaurantes es otra cosa: tiene implicaciones legales, contables y tributarias. (No aplica la compra dentro de la app de Apple: la comida y los servicios físicos pueden cobrarse por fuera.)
- **Posicionamiento:** una guía publicada en la web dice que un menú digital y un domicilio "son otra cosa". Si la app ofrece domicilios, ese texto habrá que revisarlo.

Sí se reutiliza **la lógica**: congelar precios al crear el pedido, la transacción del checkout, la bitácora de estados y el KDS, generalizando `pedidos` en vez de clonarlo (§18).

## 15. Datos de ubicación

- `restaurantes.ciudad`: texto libre y opcional (NULL en el único restaurante de producción).
- `sucursales.direccion`: texto libre; no se expone al público.
- `'CO'` escrito a mano en el JSON-LD de la vitrina; la moneda por restaurante sí es configurable.
- **No hay:** coordenadas, municipio, departamento, país, barrio ni zona horaria.

**Cómo propongo modelarlo sin fijar Medellín:**

- Cada **sede** gana `latitud`, `longitud`, `pais` (ISO 3166, por defecto `CO`), `departamento`, `municipio`, `barrio` y `zona_horaria` (IANA, por defecto `America/Bogota`).
- **"Cerca de mí"** = distancia a las coordenadas del teléfono (`ST_Distance_Sphere` con un prefiltro por caja sobre un índice). **"Explorar zona"** = municipios que tienen restaurantes, ordenados por distancia al usuario. El "área metropolitana" sale sola de la distancia; si algún día se quieren áreas con nombre, son filas en una tabla, no código.
- El municipio del usuario lo resuelve **el propio teléfono** (`reverseGeocodeAsync` usa el geocodificador del sistema operativo, sin servicio de pago). Sin permiso, el usuario elige ciudad o municipio de una lista que sale de los datos.
- La ubicación es **contexto, no restricción**: el modo "Descubrir" no filtra por distancia; solo la pondera si el usuario lo pide.

## 16. Qué reutiliza la app directamente

| Pieza existente | Cómo la usa la app |
|---|---|
| `platos` + Bunny | Unidad de contenido del feed, HLS y miniaturas (con `Referer`) |
| `GET /api/public/r/:slug` y `/r/:slug/menu` | Base del perfil del restaurante y su carta (la app los envuelve en `/api/app/v1`, sin cambiarlos) |
| `GET /api/public/platos/:id` y `/recomendaciones` | Ficha del plato y "también te puede gustar" |
| Flujo por QR completo | "Estoy en el restaurante": escanear la mesa y pedir desde la app con lo que ya existe |
| `favoritos` + `sesion_token` | Base de los "me gusta" anónimos por dispositivo |
| `utils/jwt.js`, bcrypt, `limites.js`, `correo.js`, patrón de recuperación y de `sesion_version` | Identidad del comensal sin inventar otra infraestructura |
| Patrones de concurrencia (UNIQUE sobre columna generada, `FOR UPDATE`, transacciones con `db`) | Reservas sin doble asignación |
| Formato de error, validación Zod, capas, cachés con `Map` | Todo endpoint nuevo |
| Enlace `https://bitemo.co/r/:slug?plato=N` | Compartir: abre la app si está instalada y, si no, la vitrina que ya existe |
| Rango de precios calculado de la carta real (ya lo hace la vitrina para el JSON-LD) | Filtro de precio por restaurante sin inventar un "$$" |
| Tabla de monedas del frontend (`shared/utils/formato.js`) | Formato de precio por restaurante (se copia la lógica; no se importa entre proyectos) |

**Lo que la app puede ofrecer con datos que ya existen** (algunos con endpoints nuevos, pero sin pedirle ningún dato nuevo a nadie): feed entre restaurantes, filtro de picante y de precio, recomendado del chef, búsqueda por texto en platos y restaurantes, perfil con carta y videos, ficha con alérgenos, "me gusta" anónimo, compartir, y el modo mesa completo. **Todo lo demás necesita datos nuevos** (Anexo B).

## 17. Qué necesita endpoints nuevos

Todo lo nuevo de la app vive bajo **`/api/app/v1`** (versionado, porque una app publicada no se actualiza a la fuerza). Cada petición lleva `X-Dispositivo: <uuid>` y, si hay sesión, `Authorization: Bearer <token de comensal>`. En la tabla, **opcional** = funciona sin cuenta y personaliza si la hay.

| Módulo | Endpoints | Cuenta |
|---|---|---|
| Identidad | `POST /auth/registro` · `/auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/recuperar` · `/auth/restablecer` · `/auth/verificar-correo` · `GET/PUT /cuenta` · **`DELETE /cuenta`** | — / sí |
| Feed | `GET /feed?cursor=&limite=&modo=descubrir\|cerca&lat=&lng=&antojo=&ocasion=&precio_max=…` | opcional |
| Descubrimiento | `GET /taxonomia` (antojos, ocasiones, características, con conteos) · `GET /ubicaciones` · `GET /buscar?q=` · `POST /intencion` (texto → filtros) · `GET /restaurantes?filtros…` | opcional |
| Restaurante | `GET /restaurantes/:slug` (perfil: sedes, horario y "abierto ahora", características, rango de precios, contadores, qué acepta) · `GET /restaurantes/:slug/platos?cursor=` | opcional |
| Social | `POST/DELETE /platos/:id/me-gusta` · `GET/POST /platos/:id/comentarios` · `DELETE /comentarios/:id` · `POST/DELETE /guardados` · `GET /guardados` · `POST /reportes` · `POST /bloqueos` | dispositivo / sí (comentar, reportar, bloquear) |
| Señales | `POST /eventos` (lotes de hasta 50) | opcional |
| Reservas | `GET /restaurantes/:slug/reservas/config` · `GET …/franjas?sede=&fecha=&personas=` · `GET …/plano?sede=&inicio=&personas=&preferencias=` · `POST /reservas/retenciones` · `POST /reservas` · `GET /reservas` · `GET /reservas/:codigo` · `POST /reservas/:codigo/cancelar` | opcional / sí para confirmar |
| Domicilios | `GET /restaurantes/:slug/domicilio` · `POST /pedidos/cotizar` · `POST /pedidos` · `GET /pedidos` · `GET /pedidos/:id` · `GET/POST/PUT/DELETE /direcciones` | sí |
| Notificaciones | `POST/DELETE /dispositivos` · `GET /notificaciones` · `PATCH /notificaciones/:id` · `GET/PUT /preferencias` | sí |

**Staff (`/api/*`), para que el restaurante cargue y opere lo nuevo:** `areas` (plano) · `PUT /mesas/:id` extendido · `GET/PUT /sucursales/:id/horarios` · `GET/POST/DELETE /sucursales/:id/cierres` · configuración de reservas por sede · `GET /reservas`, `PATCH /reservas/:id/estado`, `POST /reservas/bloqueos` · etiquetas de platos y características del restaurante · configuración de domicilio · moderación de comentarios y reportes · y, para el superadmin, el catálogo de etiquetas.

## 18. Qué necesita cambios en el backend y en el panel

Todo **aditivo y reversible**: columnas nuevas con `NULL` o `DEFAULT`, migraciones idempotentes, `/api/public` intacto.

| Cambio | Por qué | Riesgo sobre lo que ya funciona |
|---|---|---|
| **`platos`** + `restaurante_id` (denormalizado, lo escribe SQL), `en_feed`, `publicado_en`, `duracion_segundos`, `likes_total`, `comentarios_total`, e índice para el feed | Un feed global necesita filtrar e indexar sin dos JOIN; el restaurante decide qué sale en la app | Bajo, si el seed del demo también lo rellena |
| **`sucursales`** + ubicación, `zona_horaria` y parámetros de reserva; tablas `sucursal_horarios` y `sucursal_cierres` | Cerca de mí, abierto ahora, franjas | Bajo |
| **`mesas`** + `area_id`, `capacidad_min`, `capacidad_max`, `pos_x`, `pos_y`, `ancho`, `alto`, `forma`, `reservable`, `activo`; tablas `areas` y características por mesa y área | Plano, filtro por grupo y por preferencias | Bajo: `mesas.model.crear` sigue insertando lo de siempre |
| **Taxonomía:** `etiquetas` (antojo, cocina, ocasión, característica, dieta, momento; con sinónimos) + asignación a platos y restaurantes | Antojos, ocasiones, filtros e intención, sin escribir listas en la app | Ninguno |
| **Identidad:** `comensales`, sesiones con refresh, códigos de verificación y recuperación; audiencia en `utils/jwt.js`; rechazo cruzado en `middlewares/auth.js` | Cuenta del comensal sin mezclarla con el staff | **Medio: toca el middleware de todo el panel.** Se hace con pruebas y comprobando que las sesiones de staff vivas siguen valiendo |
| **`favoritos`** + unicidad (lo trae el saneo) + dueño comensal/dispositivo; tabla `guardados` | Likes auditables; guardados de platos y restaurantes | **Medio: el orden importa** (deduplicar → reescribir el toggle → crear el índice), o el menú por QR responde 500 |
| **`eventos_app`** (tabla nueva) en lugar de tocar `analiticas_eventos_video` | La analítica del restaurante mide el embudo en mesa; mezclarle el feed la ensuciaría | Ninguno |
| **Reservas:** `reservas`, `reserva_slots`, `reserva_tiempos_estados` | §12 | Ninguno |
| **`pedidos`** + `tipo` (`mesa`/`domicilio`), `sucursal_id`, `comensal_id`, `mesa_id` NULL, datos de entrega, costo de envío, método de pago, estado `En camino`; KDS y analítica pasan a unir por sede | Domicilios sin clonar el sistema de pedidos | **Alto: toca la operación en vivo de los restaurantes.** Fase propia, con pruebas de integración antes |
| **Validar modificadores en el servidor** (pertenencia al plato, mínimo, máximo, obligatorio) | No se puede cobrar un domicilio con reglas que solo aplica la web | Bajo; mejora también el pedido en mesa |
| **Zona horaria explícita** (por sede, calculada en Node; sesión de MySQL fijada) | Reservas correctas; de paso corrige el recomendado del chef y la analítica por hora | Medio: primero verificar qué hora usa hoy producción |
| **IP real detrás de Cloudflare** (`real_ip` en Nginx con los rangos de Cloudflare) | Los frenos de tasa deben contar al usuario, no al nodo de Cloudflare | Bajo; mejora el panel también |
| **Nginx: excepción para `/.well-known/`** | Enlaces universales (iOS) y App Links (Android) | Bajo |
| **Slug y sede por defecto al crear o aprobar un restaurante** | Sin slug no hay perfil; sin sede no hay reservas | Bajo |
| **Webhook de Bunny** para pasar a "listo" (opcional) | Que un video no se quede fuera del feed porque el admin cerró la pestaña | Bajo |
| **Subida de imágenes** (logo, fotos del local) | Hoy son URLs escritas a mano; no hay almacenamiento de imágenes | Decisión aparte (§22, Fase 4) |
| **Flags nuevos** en `plan_features`: `app_publica`, `reservas`, `domicilios` | Qué restaurante aparece, reserva o vende a domicilio, sin código | Ninguno |

**Panel web (React), pantallas nuevas o extendidas:** "Aparece en la app" por plato · etiquetas de platos (con sugerencias automáticas que el restaurante confirma) · características y ocasiones del restaurante · ubicación y horarios de cada sede · **editor de plano** (la pantalla más grande del proyecto) · agenda de reservas · configuración de reservas y de domicilio · moderación de comentarios · pedidos a domicilio en el KDS. Cambiar la web **es necesario**: es la única forma de que existan los datos que la app va a mostrar.

## 19. Riesgos técnicos

| # | Riesgo | Evidencia | Qué pasa si se cumple | Mitigación |
|---|---|---|---|---|
| **R1** | **Catálogo vacío** | 1 restaurante publicable en producción | Un feed de 11 videos de un solo local no es un feed de descubrimiento | Construir en paralelo, desarrollar con la semilla local y lanzar cuando haya catálogo. Es una meta comercial, no técnica |
| **R2** | **Datos que el restaurante tiene que cargar** | Plano, horarios, ubicación, características: nada existe | La app no tiene qué mostrar, o lo inventa | Panel primero en cada fase; la app oculta lo que un restaurante no configuró (no muestra "Reservar" sin plano ni horario) |
| **R3** | **Bunny bloquea sin `Referer`** | Verificado hoy: 403 en playlist, variantes, segmentos y miniaturas | El feed no reproduce nada en el teléfono | `expo-video` y `expo-image` mandan la cabecera: verificado en su código y **en Android** (emulador, Fase 1: con ella se reproduce, sin ella 403). Falta el iPhone, en la preparación. Plan B: URLs firmadas o `Referer` vacío |
| **R4** | **Ramas divergentes** | Producción `92332b9` sin fusionar; saneo sin commitear en otro worktree; otras ramas en `995b4e3` | La app nace sobre código viejo o choca con el saneo | D1 y D2 antes de empezar |
| **R5** | **La IP que ven los frenos de tasa es la de Cloudflare** (muy probable) | `app.set('trust proxy', 1)` con Cloudflare delante y sin `real_ip` en `nginx.conf` | Diez claves mal escritas en una ciudad bloquean el login de todos los usuarios de ese nodo de Cloudflare | Verificar en los logs (`docker compose logs backend`: si las IP son de Cloudflare, se confirma) y configurar `real_ip` |
| **R6** | **Zona horaria** | Ni `TZ` ni `time_zone` en ningún archivo; contenedores en UTC. **Y la base local NO está en UTC**: el MySQL de Windows corre en la hora de Colombia (comprobado el 2026-09-29: `NOW()` = 20:30 con `UTC_TIMESTAMP()` = 01:30) | Reservas a la hora equivocada. Ya hoy: recomendado del chef y analítica por hora, probablemente con 5 h de desfase **en producción y correctos en local**, así que en desarrollo el fallo no se ve | Verificar en producción `SELECT @@global.time_zone, NOW(), UTC_TIMESTAMP();` y adoptar zona por sede antes de las reservas; probar las reservas con la base local forzada a UTC |
| **R7** | **Tokens de comensal aceptados por el middleware de staff** | §8 | Un comensal llega a endpoints de staff que solo exigen `authenticate` | Audiencia y rechazo cruzado, con pruebas, antes del primer token |
| **R8** | **Domicilios sobre pedidos en vivo** | `mesa_id` NOT NULL y `JOIN mesas` en KDS y analítica; modificadores sin validar; cobro a nombre de terceros | Se rompe la cocina de un cliente que paga, o se cobra mal | Fase propia al final, pruebas de integración, pago contra entrega en el MVP |
| **R9** | **Doble reserva** | MySQL no tiene restricción de exclusión de intervalos | Dos personas con la misma mesa | `reserva_slots` con clave primaria `(mesa_id, inicio_slot)` + retención temporal mientras el usuario se registra; prueba de dos POST simultáneos |
| **R10** | **Capacidad del VPS** | 1 vCPU, 2 GB, MySQL con 768 MB; ningún endpoint pagina | El feed degrada al panel y al KDS de los restaurantes | Cursor, contadores denormalizados, `EXPLAIN` de cada consulta nueva, caché corta; el video ya va directo al CDN |
| **R11** | **Migraciones a mano sin registro** | `init-db.sh` solo corre con volumen vacío | Producción y local divergen en silencio | El registro de migraciones del saneo (D2) |
| **R12** | **Políticas de tienda y ley** | Cuentas, contenido de usuarios, ubicación, datos personales por primera vez | Rechazo en revisión; incumplir la Ley 1581 (habeas data) | Borrado de cuenta, reportar y bloquear, textos de permisos, política de privacidad publicada; "Sign in with Apple" si algún día hay login con Google |
| **R13** | **`/.well-known/` responde 403** | Verificado hoy | Compartir un plato nunca abre la app | Excepción en Nginx para esos dos archivos |
| **R14** | **Entorno de desarrollo en Windows** | Sin Mac; Android SDK y un emulador instalados pero sin `ANDROID_HOME`, `adb` fuera del PATH, Java del sistema 8 | No se puede compilar iOS en local; Android necesita ajustes | Expo Go para empezar; EAS Build para iOS; JDK 17 y variables para Android |
| **R15** | **Rendimiento del feed en gama baja** | Cada reproductor nativo consume memoria | Cierres de la app en Android modestos | Pool de 3 reproductores (anterior, actual, siguiente), póster mientras carga, medición en un teléfono barato real |
| **R16** | **Video atascado en "procesando"** | La transición la hace la pestaña del admin | Platos que nunca entran al feed | Webhook de Bunny o revisión periódica en el servidor |
| **R17** | **Sin subida de imágenes** | Logo e imagen de plato son URLs escritas a mano | Perfiles sin fotos o con enlaces rotos | Decidir almacenamiento (p. ej. Bunny Storage) en la Fase 4 |
| **R18** | **Varias monedas en un mismo feed** | `restaurantes.moneda` por restaurante | Un filtro "hasta 50.000" mezcla pesos con dólares | El presupuesto filtra dentro de la moneda (o país) del usuario |
| **R19** | **Estado en memoria de un solo proceso** | Cachés y temporizador en el proceso Node | Si algún día hay dos procesos, la revocación de sesiones y las cachés se desincronizan | Aceptable hoy; documentado para cuando se escale |

## 20. Dependencias nuevas

### App (proyecto nuevo, con su propio `package.json`: no toca web ni backend)

Versiones del SDK 57 de Expo, el estable a la fecha (se instalan con `npx expo install`, que elige las compatibles).

| Paquete | Para qué | ¿Funciona en Expo Go? |
|---|---|---|
| `expo` (SDK 57, React Native 0.86, React 19.2) | Base, EAS Build, actualizaciones | Sí |
| `expo-video` | HLS nativo (AVPlayer / ExoPlayer), cabeceras por fuente, precarga | Sí |
| `expo-image` | Miniaturas y fotos con caché y cabeceras (`Referer`) | Sí |
| `@shopify/flash-list` | Feed y listas largas con reciclaje de celdas | Sí |
| `@react-navigation/native`, `native-stack`, `bottom-tabs` (v7) | Navegación: tres pestañas y pilas; enlaces profundos con configuración explícita | Sí |
| `react-native-gesture-handler`, `react-native-reanimated` | Zoom y arrastre del plano; gestos del feed | Sí |
| `react-native-keyboard-controller` (con `react-native-worklets`, que Reanimated 4 necesita) | Que el teclado no tape el campo activo. Llegó en la Fase 1: el `KeyboardAvoidingView` de React Native no alcanza con Android de borde a borde (comprobado en el emulador) | Sí |
| `react-native-svg` + `lucide-react-native` | Dibujo del plano; los mismos iconos que la web (Lucide exclusivo) | Sí |
| `@tanstack/react-query` | Estado del servidor: caché, reintentos, paginación infinita, estados de carga/error/vacío | Sí (solo JS) |
| `zustand` | Estado local (sesión, filtros, ubicación, borrador de reserva, carrito) sin re-renderizar el feed entero | Sí (solo JS) |
| `zod` | Validar respuestas en la frontera; la misma librería del backend | Sí (solo JS) |
| `expo-secure-store` | Refresh token en Keychain / Keystore | Sí |
| `@react-native-async-storage/async-storage` | Preferencias no sensibles | Sí |
| `expo-location` | Ubicación con permiso contextual y geocodificación inversa del sistema | Sí |
| `expo-crypto` | UUID del dispositivo | Sí |
| `expo-notifications`, `expo-device` | Push y recordatorios locales (Fase 10) | Recordatorios sí; push en Android requiere build propio |
| `expo-font`, `expo-linear-gradient`, `expo-haptics` | Tipografía Geist, degradados sobre el video, vibración del "me gusta" | Sí |
| `jest-expo`, `@testing-library/react-native` (desarrollo) | Pruebas de componentes y lógica | — |

Descartadas a propósito: `react-native-maps` (para "cómo llegar" basta abrir la app de mapas del teléfono), `react-native-mmkv` (exige build propio; AsyncStorage alcanza) y librerías de formularios (son pocos formularios). Una librería de fechas en principio tampoco hace falta, porque Hermes trae `Intl`; se confirma en la Fase 5, que es la que maneja zonas horarias.

### Backend

**Ninguna obligatoria.** Push por la API HTTP de Expo con `fetch` (igual que ya se hace con Resend y Wompi); geografía con las funciones espaciales de MySQL 8; reservas con SQL y transacciones. Opcional más adelante: un LLM para la intención (§21), también por `fetch` y con la llave en el servidor.

### Panel web

**Ninguna obligatoria.** El editor de plano se puede hacer con SVG y eventos de puntero. Opcional: un selector de mapa (p. ej. Leaflet con OpenStreetMap) para ubicar cada sede; al principio basta pegar coordenadas o un enlace de Google Maps.

### Cuentas y servicios

Cuenta de Expo (gratis para empezar) · **Apple Developer Program, 99 USD/año** (TestFlight y publicación) · **Google Play Console, 25 USD una vez** · credenciales de push (APNs y FCM, las gestiona EAS) · política de privacidad publicada en `bitemo.co`.

## 21. Arquitectura React Native propuesta

### 21.1 Vista general

```
APP (Expo · React Native · TypeScript)

  Pantallas y componentes de UI
        │  leen y escriben a través de
        ▼
  Hooks de dominio (React Query)            Estado local (zustand)
        │                                   sesión · dispositivo · filtros · ubicación
        ▼                                   borrador de reserva · carrito
  Servicios de API por dominio
  auth · feed · restaurantes · platos · búsqueda · reservas · disponibilidad · pedidos · eventos
        │
        ▼
  Cliente HTTP único
  URL base · JSON · token + refresh · X-Dispositivo · errores { status, message, details } · tiempo límite
        │
        │  HTTPS  /api/app/v1   (y /api/public en modo mesa)
        ▼
BACKEND Express (el mismo, con módulos nuevos)

Video e imágenes: expo-video / expo-image ──(Referer: https://bitemo.co/)──► CDN de Bunny
```

Reglas: las pantallas nunca llaman a `fetch`; los hooks nunca arman URLs; el cliente HTTP es el único que conoce la URL base, los tokens y el formato de error.

### 21.2 Estructura

```
codigo_definitivo/movil/
├── app.config.ts          nombre, esquema bitemo://, textos de permisos, dominios asociados
├── eas.json               perfiles development · preview · production
├── package.json · tsconfig.json
└── src/
    ├── App.tsx            proveedores: QueryClient, gestos, área segura, tema, navegación
    ├── navigation/        RaizNavegador (pila) · TabsNavegador (Inicio · Buscar · Perfil) · linking.ts · tipos de rutas
    ├── features/
    │   ├── feed/          screens · components (TarjetaVideo, AccionesFeed, InfoPlato) · hooks (useFeed, usePoolReproductores, useEventos)
    │   ├── descubrir/     screens (Buscar, Resultados) · components (BarraIntencion, Antojos, Ocasiones, Filtros, PopupAntojo)
    │   ├── restaurante/   screens (Perfil) · components (Cabecera, RejillaVideos, Carta, Informacion)
    │   ├── plato/         screens (Ficha) · components (Ingredientes, Comentarios)
    │   ├── reservas/      screens (Personas, FechaHora, Preferencias, Plano, Confirmar, MisReservas) · plano/ (PlanoMesas, Mesa, usePlanoGestos, geometria.ts)
    │   ├── domicilios/    screens (Carrito, Direccion, ConfirmarPedido, Seguimiento)
    │   ├── perfil/        screens (Perfil, Guardados, Cuenta, Ajustes)
    │   ├── auth/          screens (Acceso, Registro, Codigo) · hooks (useExigirCuenta)
    │   └── notificaciones/
    └── shared/
        ├── api/           cliente.ts · errores.ts · auth.ts · feed.ts · restaurantes.ts · platos.ts · busqueda.ts · reservas.ts · disponibilidad.ts · pedidos.ts · usuarios.ts · eventos.ts
        ├── state/         sesion.ts · dispositivo.ts · filtros.ts · ubicacion.ts · borradorReserva.ts · carrito.ts
        ├── components/    ui (Boton, Texto, Hoja, Chip, Esqueleto) · estados (Cargando, Vacio, ErrorReintentar)
        ├── hooks/         useUbicacion · useAppActiva · useConexion
        ├── theme/         colores (#FF7A00, texto #1F1200 sobre naranja), tipografía Geist, espaciado, radios 12/16/24
        ├── types/         Plato, Restaurante, Sede, Mesa, Franja, Reserva, Pedido…
        ├── utils/         moneda · fechas y zonas horarias · distancia
        └── constants/     URL de la API por entorno, claves de almacenamiento
    assets/                fuentes, ícono, splash
```

Mapea uno a uno con lo que pide el brief: screens, components, navigation, services/API (`shared/api`), hooks, state, models/types, utils, constants y assets. Sigue la convención de la web (`features/` + `shared/`) para que un mismo desarrollador se mueva igual en los dos proyectos. **No es un monorepo:** convertir el repo en workspaces obligaría a tocar los dos `package.json`, los `Dockerfile` y `deploy.sh` para compartir unas pocas constantes.

### 21.3 Decisiones técnicas clave

**Feed y video.**
- `FlashList` vertical a pantalla completa con `pagingEnabled`; el índice activo sale de `onViewableItemsChanged` con umbral alto (el equivalente del `useActiveSlide` de la web).
- **Pool de 3 reproductores** (anterior, actual, siguiente) que se reasignan al deslizar, en vez de uno por tarjeta: memoria constante en gama baja. Solo el actual reproduce; el siguiente precarga; el resto muestra la miniatura.
- Silencio y bucle por defecto (los videos son de 6 a 15 segundos sin sonido). Pausa al cambiar de pestaña, al abrir otra pantalla y al pasar la app a segundo plano.
- Eventos (visto, segundos vistos, completado, abandono) acumulados y enviados **por lotes** cada pocos segundos o al pasar a segundo plano: una petición en vez de cuatro por video, que además no choca con los frenos de tasa.
- La acción principal de cada tarjeta es **Ver restaurante / Reservar**; "Pedir a domicilio" aparece solo si el restaurante lo ofrece, como alternativa.

**Contrato del feed.** El cursor es **opaco**: la app no sabe si el orden es cronológico o personalizado, así que la estrategia puede cambiar sin publicar otra versión.

```json
{
  "items": [{
    "id": 103, "nombre": "Doble Bitemo Burger", "precio": 34000, "moneda": "COP",
    "video": { "hls": "https://vz-…/playlist.m3u8", "poster": "https://vz-…/thumbnail.jpg", "duracion_segundos": 12 },
    "nivel_picante": 0, "recomendado_chef": true, "etiquetas": ["hamburguesa"],
    "restaurante": { "id": 100, "slug": "casa-bitemo", "nombre": "Casa Bitemo", "municipio": "Medellín", "distancia_km": 2.4 },
    "acciones": { "reservar": true, "domicilio": false },
    "social": { "me_gusta": 128, "comentarios": 4, "me_gusta_yo": false, "guardado_yo": false }
  }],
  "cursor": "…", "hay_mas": true
}
```

**Personalización (preparada, no sobrediseñada).**
- **v0:** orden por publicación reciente con **intercalado por restaurante** (el brief pide no agrupar un mismo restaurante seguido), filtros duros y, en modo "Cerca", peso por distancia. Cada petición guarda una instantánea del orden de esa sesión de feed para paginar sin repetir ni saltar.
- **Señales desde el día uno** en `eventos_app`: vistas, tiempo visto, likes, guardados, comentarios, fichas y restaurantes abiertos, búsquedas, filtros, reservas iniciadas y confirmadas.
- **v1:** afinidades por etiqueta, restaurante y rango de precio, calculadas por la tarea periódica (ya hay un precedente horario), como una estrategia más detrás del mismo endpoint.

**Búsqueda por intención.** `POST /api/app/v1/intencion` recibe el texto y devuelve filtros estructurados más una interpretación legible, que la app muestra como chips editables ("cena · romántica · hasta $80.000 · cerca de ti"). Ejemplo: *"Quiero una cena romántica cerca de mí por máximo 80.000 por persona"* → `{ ocasion: "romantica", momento: "cena", modo: "cerca", precio_max_persona: 80000 }`.
- **v0 por reglas**, sin costo: sinónimos de la taxonomía (los guarda la base, no el código), expresiones para dinero ("80.000", "80 mil", "80k"), personas ("somos 4") y momento ("esta tarde", "cena").
- **v1 con un LLM en el servidor** solo cuando las reglas no alcanzan, con salida validada por Zod y caché por texto. La llave nunca va en la app.
- El contrato de respuesta es el mismo en v0 y v1: cambiar de motor no toca la app.

**Antojos y ocasiones sin listas escritas en la app.** Salen de `GET /taxonomia`, que solo devuelve etiquetas con contenido publicado: la lista crece sola con los datos. "Algo picante" funciona desde el primer día con `nivel_picante`; el resto requiere que los platos estén etiquetados (el panel sugiere etiquetas a partir del nombre y la categoría, y el restaurante las confirma: sugerido por la máquina, decidido por una persona). Una ocasión es compatible con un restaurante solo si este declaró las características que la ocasión requiere, y ese cruce es configuración en la base, no código. El popup "¿Qué se te antoja hoy?" pinta opciones que vienen de la API, con un respaldo local por si no hay red.

**Plano 2D.**
- El backend manda la rejilla del área (`columnas × filas`), la decoración (barra, muros, ventanas: dibujo, no entidades) y cada mesa con su estado **para la franja pedida**: `disponible`, `ocupada`, `no_apta` (capacidad), `no_coincide` (preferencias), `retenida`, `no_reservable`.
- Se dibuja con `react-native-svg`; zoom con pellizco, arrastre y doble toque con `gesture-handler` + `reanimated`; el toque se resuelve con geometría propia (transformación inversa), no con eventos de cada figura.
- Colores de estado con redundancia de forma (relleno frente a trazo o patrón) para que no dependan solo del color.
- Al tocar una mesa se abre una hoja con número, capacidad, características y estado; "Elegir esta mesa" deshabilitado si no se puede. Hay una vista en lista **además**, para lectores de pantalla; el plano sigue siendo la experiencia principal.
- Como la rejilla es de enteros, el mismo JSON dibuja el mismo plano en un teléfono de 360 px y en el editor del panel.

**Cuenta en el momento justo y "seguir donde quedó".** Explorar nunca pide cuenta. Al confirmar una reserva (o al comentar), `useExigirCuenta` abre el acceso como hoja modal ("Para confirmar tu reserva necesitas crear una cuenta"), y el borrador de la reserva vive en un store persistido: tras registrarse o entrar, el usuario vuelve al mismo paso con la mesa aún **retenida** unos minutos por el backend. El contexto del descubrimiento viaja hasta la reserva: si buscó "somos 4, algo romántico", la reserva arranca con 4 personas y esa preferencia marcada.

**Sesión y seguridad.** Token de acceso corto en memoria y refresh token rotativo en Keychain/Keystore (`expo-secure-store`); en la base solo su hash, como ya se hace con la recuperación de contraseña. En la app no va ningún secreto: solo la URL de la API. Todo lo que cuesta dinero o reserva algo se recalcula y se vuelve a comprobar en el servidor.

**Ubicación.** Se pide solo al tocar "Algo cerca" o el filtro de distancia, precedida de una explicación ("Usaremos tu ubicación para mostrarte restaurantes cerca de ti"). Sin permiso, todo sigue funcionando y se puede elegir ciudad o municipio. Las coordenadas viajan redondeadas (unos 100 m): suficiente para ordenar, menos invasivo.

**Enlaces profundos.** Esquema `bitemo://` y enlaces universales sobre `https://bitemo.co/r/:slug` (con `?plato=N`). Si la app no está instalada, cae en la vitrina web que ya existe y ya está indexada. Requiere la excepción de `/.well-known/` en Nginx (R13).

**Estados de pantalla.** Todo dato remoto pasa por un mismo patrón: esqueleto mientras carga; "No encontramos opciones para estos filtros" si viene vacío; "No pudimos cargar el contenido. Reintentar." si falla la red; nunca una pantalla en blanco.

**Accesibilidad.** Etiquetas en todos los botones de icono, textos que respetan el tamaño de letra del sistema, "reducir movimiento" respetado en animaciones, contraste AA (texto oscuro sobre el naranja de marca, como en la web).

**Entornos.** `EXPO_PUBLIC_API_URL` por perfil: en desarrollo, la IP de la red local del PC que corre el backend (desde el emulador de Android es `10.0.2.2`); en producción, `https://bitemo.co/api`.

## 22. Plan de implementación por fases

Cada fase se prueba antes de pasar a la siguiente. **Tamaño** es orientativo y relativo (S, M, L, XL).

| Fase | Backend | Panel web | App | Criterio de aceptación | Tamaño |
|---|---|---|---|---|---|
| **0 · Auditoría** | — | — | — | Este documento, revisado | ✅ |
| **0.5 · Preparación** | Fusionar `92332b9` en `main` (D1); cerrar el saneo (D2); medir zona horaria e IP real en producción (solo lectura) | — | Prueba de concepto: `expo-video` + `expo-image` con `Referer` contra Bunny en un Android real y un iPhone | El video de Bunny se reproduce en los dos teléfonos, o hay plan B decidido | S |
| **1 · Base** | `comensales`, sesiones con refresh, códigos por correo; `/api/app/v1/auth/*` y `/cuenta` (incluido borrar); audiencia y rechazo cruzado en JWT; freno de tasa propio | — | Proyecto Expo en `codigo_definitivo/movil/`; navegación con tres pestañas; tema de marca; cliente HTTP con refresh; React Query; stores; acceso en hoja modal; UUID de dispositivo; estados comunes | Registro, login, refresh, logout y borrar cuenta funcionan contra el backend local; **un token de comensal recibe 401 en toda ruta de staff y al revés**; las sesiones de staff vivas siguen valiendo | M |
| **2 · Feed** | Columnas nuevas de `platos` con índice y relleno; `GET /feed` con cursor opaco e intercalado; me gusta y guardados (por dispositivo o cuenta); comentarios con reportes y bloqueos (según D6); `POST /eventos` por lotes; flag `app_publica` | Casilla "Aparece en la app" por plato; moderación de comentarios | Feed vertical con pool de reproductores; me gusta con doble toque; comentar; compartir (enlace a la vitrina); guardar; ir al restaurante y a la ficha | HLS de Bunny en un Android de gama baja real; un solo video sonando; pagina sin repetir; nunca dos platos seguidos del mismo restaurante si hay alternativa; me gusta idempotente | L |
| **3 · Descubrimiento** | Taxonomía y asignaciones; ubicación de las sedes; `GET /taxonomia`, `/ubicaciones`, `/buscar`; filtros en feed y restaurantes; `POST /intencion` por reglas | Etiquetar platos (con sugerencias); características y ocasiones del restaurante; dirección y coordenadas de cada sede | Pestaña Buscar (intención, antojos, ocasiones, filtros combinables); popup "¿Qué se te antoja hoy?"; permiso de ubicación contextual y selección manual; "Descubrir" frente a "Cerca" | "Cena romántica cerca por máximo 80.000" produce filtros visibles y editables; sin permiso de ubicación todo funciona; ninguna lista de antojos u ocasiones está escrita en la app | L |
| **4 · Restaurantes** | Horarios por sede (`sucursal_horarios`); `GET /restaurantes/:slug` (perfil completo) y sus platos paginados; slug y sede por defecto al crear o aprobar; decidir almacenamiento de imágenes | Horarios por sede; fotos del local si se decide | Perfil: cabecera, rejilla de videos (abre el feed del restaurante), carta por categorías, información (horario, "abierto ahora", cómo llegar, características); botones Reservar y Domicilio según lo que ofrezca | Un restaurante sin horario no muestra "abierto ahora" inventado; un enlace a `/r/:slug` abre el perfil | M |
| **5 · Reservas** | Parámetros de reserva por sede, cierres, `reservas`, `reserva_slots`, estados, motor de franjas en la zona horaria de la sede, flag `reservas` | Configuración de reservas; agenda del día; bloquear franjas o mesas | Personas → fecha → hora (solo franjas con mesa) → preferencias (de la API) | Dos `POST` simultáneos sobre la misma mesa y hora dan **una** reserva y un 409; una mesa de 2 nunca sale para 4; un día sin horario no tiene franjas; la hora mostrada es la local de la sede | L |
| **6 · Plano 2D** | `areas`, columnas de plano en `mesas`, características por mesa y área, `GET …/plano` con estados por franja | **Editor de plano** (arrastrar mesas, capacidad, forma, zona, características, decoración) | Plano con zoom, arrastre y selección; ficha de mesa; estados visuales; vista en lista accesible | El mismo JSON dibuja el mismo plano a 360 px y a 1200 px; una mesa ocupada no se puede elegir | XL |
| **7 · Confirmación** | Retención temporal (reserva `retenida` que ocupa las franjas unos minutos); confirmar; mis reservas; cancelar; correos al restaurante y al comensal | La reserva aparece en la agenda al instante | Exigir cuenta con retorno al paso exacto; pantalla de confirmación con código; historial | Tras registrarse a mitad del flujo, el usuario confirma la misma mesa sin repetir pasos | M |
| **8 · Domicilios** | `pedidos` generalizado; configuración de domicilio por sede; direcciones; validación de modificadores en servidor; cotizar, crear y seguir; flag `domicilios` | Configurar domicilio; pedidos a domicilio en el KDS con su estado "En camino" | Carrito local por restaurante; dirección; confirmación; seguimiento | El KDS y la analítica del pedido en mesa quedan idénticos; un modificador inválido se rechaza; el total lo calcula el servidor | XL |
| **9 · Perfil** | Historial de interacciones relevantes; preferencias de cuenta | — | Datos básicos, reservas próximas y anteriores, guardados (quitar), me gusta, ajustes, cerrar sesión, borrar cuenta | Borrar la cuenta elimina de verdad los datos personales | S |
| **10 · Notificaciones** | Dispositivos, bandeja de notificaciones y preferencias; envío por la API de Expo; avisos de reserva y de pedido | — | Registro del token, permisos, recordatorio local de la reserva, bandeja | Confirmar o cancelar desde el panel llega al teléfono en segundos | M |
| **11 · Optimización** | `EXPLAIN` de cada consulta, caché, índices | — | Medición del feed en gama baja, memoria, precarga, imágenes, errores, accesibilidad | Ninguna consulta del feed ordena en disco; el feed no se cae en un teléfono de 3 GB | M |
| **12 · Pruebas y salida** | Pruebas de integración con un MySQL desechable (reservas concurrentes incluidas) | — | Pruebas E2E, dispositivos reales, fichas de tienda, política de privacidad, TestFlight y prueba interna de Play | La batería completa pasa; la app supera la revisión de las dos tiendas | M |

**Dependencias duras:** 0.5 → 1 → 2. Descubrimiento (3) necesita el feed (2). Reservas (5) necesita horarios (4); el plano (6) necesita reservas (5); la confirmación (7) necesita las dos. Domicilios (8) es independiente de las reservas y puede adelantarse o aplazarse sin romper nada. Notificaciones (10) necesita identidad (1).

**Decisiones que se resuelven en su fase:**

| Fase | Decisión | Recomendación |
|---|---|---|
| 2 | ¿Qué planes aparecen en la app? | `app_publica` en los tres planes: el feed necesita catálogo, y excluir al Básico mata el efecto de red |
| 2 | Cuentas de tienda | Contratar Apple y Google antes de la primera versión de prueba |
| 3 | Motor de intención | Reglas primero (costo cero); LLM en el servidor cuando haya uso real que lo justifique |
| 4 | Fotos del local | Almacenamiento de imágenes (p. ej. Bunny Storage, mismo proveedor) o aplazarlas |
| 5 | Confirmación de la reserva | Automática por defecto, con modo manual por sede y bloqueos del restaurante para no chocar con quien llega sin reserva |
| 5 | ¿Mesa concreta o solo franja? | Mesa concreta (es la promesa del producto), con "cualquier mesa" como atajo |
| 5 | ¿Qué planes reservan? | `reservas` en Intermedio y Pro, como palanca para subir de plan |
| 8 | Cobro de domicilios | Pago contra entrega en el MVP; cobro en línea solo con asesoría legal y tributaria |
| 8 | ¿Qué planes venden a domicilio? | `domicilios` en Pro, junto a `carrito` y `kds` |

---

## Anexo A. Archivos de la Fase 1

**Implementada el 29 de septiembre de 2026.** Lo que se hizo, y en qué se apartó de lo planeado.

**Backend: nuevos**

- `backend/migrations/2026-09-29_comensales.sql`: `comensales`, `comensales_sesiones` (refresh tokens, solo su hash) y `comensales_codigos` (códigos de 6 dígitos, con HMAC). Idempotente, sin claves ajenas a tablas viejas, y se anota sola en `migraciones_aplicadas` si esa tabla existe (la crea el saneo de D2).
- `backend/src/routes/app/{index,auth.routes,cuenta.routes}.js` · `controllers/app/{auth,cuenta,config}.controller.js` · `validators/app/{auth,cuenta}.validator.js`: el mundo del comensal, separado del staff.
- `backend/src/services/{comensales,sesionesComensal}.service.js` · `models/{comensales,sesionesComensal,codigosComensal}.model.js`.
- `backend/src/middlewares/comensal.js`: lee `X-Dispositivo` y `X-Plataforma`; `identificarComensal` (opcional) y `exigirComensal`.
- `backend/src/utils/codigos.js`: refresh tokens, códigos de 6 dígitos y su HMAC.
- Pruebas: `tests/unit/middlewares/comensal.test.js`, `tests/unit/utils/codigos.test.js`, `tests/unit/validators/app/{auth,cuenta}.validator.test.js`.

**Backend: modificados**

- `backend/src/utils/jwt.js`: `firmarComensal` y `verificarComensal`, con una **clave derivada** del secreto y audiencia `bitemo-app`. Las funciones del staff no cambian.
- `backend/src/utils/correo.js`: plantilla `correoConCodigo`.
- `backend/src/middlewares/limites.js`: cinco frenos propios de la app.
- `backend/src/routes/index.js` (una línea), `init-db.sh` (la migración al orden), `backend/README.md` (sección 7 bis).
- Pruebas ampliadas: `tests/unit/utils/jwt.test.js` y `tests/unit/middlewares/auth.test.js`.

**En qué se apartó del plan, y por qué:**

- **`middlewares/auth.js` no se tocó.** La separación entre los dos mundos se hizo con la clave derivada: un token de comensal ni siquiera verifica como token de staff, así que no hizo falta cambiar el middleware del panel. Menos riesgo sobre lo que ya funciona, y una prueba lo demuestra con un comensal y un empleado del mismo id.
- **`GET /api/app/v1/config` (versión mínima), que no estaba en el plan.** Una app publicada no se actualiza a la fuerza: el freno de "actualiza para seguir" tiene que venir en la primera versión que se instale, o no alcanzará a esa versión nunca.
- **Frenos por IP más holgados de lo pensado** (login 20 fallos y códigos 30 cada 15 minutos). Con 10, las propias pruebas demostraron que tres o cuatro personas detrás de la misma IP, lo normal en redes móviles, se bloqueaban entre sí. Lo fino va por cuenta: 5 intentos por código y 3 códigos por hora.
- **`docker-compose.yml` y `.env.example` sin cambios:** las vigencias (15 minutos el acceso, 60 días la sesión) son constantes del código, no configuración.
- **Pantalla de diagnóstico del video** (solo en desarrollo): adelanta la prueba de la Fase 0.5 (R3). Reproduce el mismo video de Bunny con y sin `Referer`, lado a lado.
- **`app.json` en vez de `app.config.ts`:** no hace falta configuración dinámica; la URL de la API la resuelve `shared/api/config.ts`.
- **De la plantilla de Expo se quitaron tres archivos:** un `AGENTS.md` que ordenaba usar Expo Router (lo contrario de lo acordado; lo sustituye `movil/README.md`), una carpeta `.claude/` que activaba un plugin que nadie pidió y un `LICENSE` que declaraba el código como MIT de Expo.
- **`react-native-keyboard-controller` desde ya, y con ella Reanimated y `react-native-worklets`** (en el plan, Reanimated llegaba con el plano). El emulador destapó un fallo real: con Android de borde a borde, obligatorio desde el SDK 54, el teclado tapaba el último campo de los formularios, y en "Borrar tu cuenta" un toque dirigido al botón cayó sobre una tecla y alteró la contraseña escrita. El backend respondió como debía (contraseña incorrecta, nada borrado), pero el formulario era inusable. El `KeyboardAvoidingView` de React Native se probó y no alcanzó. `Pantalla` usa ahora el desplazamiento de esa librería, que deja a la vista el campo con foco y lo que va justo debajo (su ayuda, su error o su botón). Las tres vienen en Expo Go del SDK 57.

**App: nueva, `codigo_definitivo/movil/`.** Expo SDK 57, TypeScript estricto. Navegación con tres pestañas y modales de acceso; tema de la marca; cliente HTTP único con renovación de sesión compartida; sesión en Keychain/Keystore; "pedir la cuenta en el momento justo y seguir donde estaba" (`useExigirCuenta`); pantallas de acceso, recuperación, verificación del correo, perfil y cuenta (con borrado); verificación de versión mínima; marcadores de Inicio y Buscar.

**Otros:** `.claude/launch.json` suma la configuración `movil` (`expo start --android`).

**Verificación:**

- Backend: 115 pruebas unitarias (80 de antes y 35 nuevas) y 46 comprobaciones de extremo a extremo contra el backend local: alta, correo en minúsculas, 409 por correo repetido, 400 sin términos, rechazo cruzado de tokens staff/comensal (con el mismo id), rotación del refresh con su gracia, verificación del correo, logout, cambio de clave (corta los accesos anteriores al instante), recuperación con respuesta idéntica exista o no la cuenta, restablecer, código agotado tras 5 intentos aunque luego sea el correcto, tope de 3 códigos por hora y borrado de la cuenta sin dejar filas huérfanas.
- La migración se aplicó dos veces seguidas sobre la base local, sin error.
- App: TypeScript estricto sin errores, 24 pruebas (cliente HTTP, configuración, solicitud de acceso y validaciones), `expo-doctor` 21/21 y paquete nativo de Android e iOS generado con Metro.
- **En un emulador de Android** (Android 17, Expo Go, contra el backend local): la app arranca con su tipografía y sus tres pestañas, y deduce sola la URL de la API. El video de Bunny se reproduce con `Referer` y falla con 403 sin él (R3, lado Android). Desde la app funcionan el alta de cuenta, la verificación del correo con el código, el cierre forzado de la app (la sesión vuelve desde el Keystore) y el borrado de la cuenta con su diálogo de confirmación. Con el arreglo del teclado, los cuatro campos del registro y el de "Borrar tu cuenta" quedan por encima del teclado, y el botón de borrar también, entero. La base quedó sin filas de prueba.

**Endpoints que usa la Fase 1:** los nuevos `POST /api/app/v1/auth/{registro,login,refresh,logout,recuperar,restablecer}`, `GET/PUT/DELETE /api/app/v1/cuenta`, `PUT /api/app/v1/cuenta/password`, `POST /api/app/v1/cuenta/verificacion{,/confirmar}` y `GET /api/app/v1/config`.

**Pendiente antes de la Fase 2:** D2 (el saneo, reescrito sobre `92332b9` y con su registro de migraciones incluyendo las del 28 de septiembre y esta), la prueba del video en un iPhone, y publicar la política de privacidad antes de que se registre nadie real. Antes de desplegar este backend: la migración en producción y la medición de zona horaria e IP real de la Fase 0.5. *(D2 quedó cerrado con la Fase 2; lo demás sigue pendiente: ver el Anexo C.)*

---

## Anexo B. Matriz de datos: qué necesita la app y si existe

| Dato | Hoy | Fuente o quién lo carga |
|---|---|---|
| Video del plato (HLS y miniatura) | ✅ | Bunny, subido desde el panel |
| Nombre, descripción, precio, moneda | ✅ | `platos`, `restaurantes.moneda` |
| Nivel de picante (0–3) | ✅ | `platos.nivel_picante` |
| Recomendado del chef | ✅ (probable desfase horario) | `platos.recomendado_*` |
| Ingredientes y alérgenos | ⚠️ se leen; crearlos falla en una base creada desde el esquema base, como la de producción | `ingredientes` (lo corrige el saneo) |
| Modificadores | ✅ | grupos y opciones |
| Categoría de la carta | ✅ texto libre por restaurante | `categorias` |
| Tipo de cocina y antojo | ❌ | Nuevo: etiquetas + panel |
| Ocasiones y características del local | ❌ | Nuevo: etiquetas + panel |
| Rango de precios | ✅ derivable de la carta real | Cálculo (la vitrina ya lo hace) |
| Gasto por persona | ❌ | Aproximación desde la carta o dato declarado por el restaurante |
| Coordenadas | ❌ | Nuevo: sedes + panel |
| Ciudad | ⚠️ texto libre, opcional, NULL en producción | `restaurantes.ciudad` |
| Dirección y teléfono de la sede | ⚠️ existen, no se publican | `sucursales` |
| Horarios de apertura | ❌ | Nuevo + panel |
| Mesas | ⚠️ solo número y QR | `mesas` |
| Capacidad, zona, posición y características de mesa | ❌ | Nuevo + editor de plano |
| Reservas y disponibilidad | ❌ | Nuevo |
| Configuración de domicilio | ❌ | Nuevo + panel |
| Fotos del local | ❌ el logo es una URL escrita a mano | Nuevo: almacenamiento de imágenes |
| Reseñas | ❌ | Fuera del alcance inicial; si llegan, solo de visitas verificadas |
| Me gusta | ⚠️ anónimo, sin unicidad ni conteo | Extender `favoritos` |
| Guardados | ❌ | Nuevo |
| Comentarios | ❌ | Nuevo + moderación |
| Redes sociales del restaurante | ⚠️ solo si el plan incluye personalización | `temas_restaurante.redes_sociales` |
| Slug público | ⚠️ los restaurantes nuevos nacen sin él | Generarlo al crear |
| Sede | ⚠️ los restaurantes aprobados nacen sin ninguna | Crear una por defecto al aprobar |

---

## Anexo C. Fase 2: el feed

**Implementada el 12 y 13 de octubre de 2026.** Primero se cerró D2; después, el feed entre restaurantes con su capa social, la moderación en el panel y el feed vertical en la app.

**D2, primero.** El saneo de `feat/fase-1-saneo-esquema` se retomó sobre esta rama: `2026-09-15_saneo_esquema.sql` (registro `migraciones_aplicadas`, las columnas que le faltaban a `ingredientes`, índice único en `favoritos`) con una nota de por qué se aplica después de migraciones más nuevas, y con el **registro retroactivo** de las que ya estaban aplicadas (`pagos_wompi`, recuperación de contraseña, `actualizado_en`, `sesion_version` y `comensales`), cada una solo si su huella existe en la base. Los cambios de `favoritos.model.js`, `favoritos.service.js`, `ingredientes.validator.js`, `bitemo_completo.sql`, `init-db.sh` y `DESPLIEGUE.md` vinieron con él. **Orden de despliegue:** `2026-09-29_comensales.sql` → `2026-09-15_saneo_esquema.sql` → `2026-10-12_app_feed.sql`; la última se niega a correr si falta alguna de las anteriores.

**Backend: nuevos**

- `migrations/2026-10-12_app_feed.sql`: en `platos`, `en_feed`, `publicado_en` (rellena con `creado_en` sin tocar `actualizado_en`, para no mover las fechas del sitemap) y `duracion_segundos`, con el índice `idx_platos_feed`; la característica `app_publica` en los tres planes; `favoritos.comensal_id`; tablas `guardados`, `comentarios`, `comentario_reportes`, `comensal_bloqueos` y `eventos_app`. Idempotente y con su registro.
- `services/feed/orden.js` (puro y probado): antojos, filtro, intercalado sin dos platos seguidos del mismo restaurante, cursor opaco y opciones de la hoja ANTOJATE.
- `services/feed.service.js` · `models/feed.model.js`: el catálogo se pide a la base una vez por minuto; cada sesión de feed tiene un **corte** (la hora de la base al empezar), y la lista ordenada de esa sesión se guarda 30 minutos (hasta 300 listas). Lo social de cada página sale de dos consultas agrupadas.
- `services/social.service.js` · `models/social.model.js`: me gusta, guardados, comentarios, reportes, bloqueos y la moderación del panel.
- `services/eventosApp.service.js`: señales del feed (`vista`, `tiempo_visto`, `video_completo`, `compartido`, `detalle_abierto`, `restaurante_abierto`), por lotes; un tipo desconocido se descarta.
- `controllers/app/{feed,social}.controller.js` · `controllers/comentarios.controller.js` · `validators/app/{feed,social,eventos}.validator.js` · `validators/comentarios.validator.js` · `routes/app/feed.routes.js` · `routes/comentarios.routes.js`.
- `scripts/seedDesarrolloApp.js` (D7): dos restaurantes ficticios, `prueba-app-areperia` (plan Básico) y `prueba-app-wok` (Intermedio), que reutilizan los videos del demo; `--borrar` los quita, y no corre con `NODE_ENV=production`.
- Pruebas: `tests/unit/services/feed/orden.test.js` y `tests/unit/validators/app/social.validator.test.js`.

**Backend: modificados.** `models/platos.model.js` y `validators/platos.validator.js` (`en_feed`, `duracion_segundos` y `publicado_en`, que se fija la primera vez que el video queda listo); `middlewares/features.js` (`APP_PUBLICA`) y `middlewares/limites.js` (cuatro frenos: social, comentarios, moderación y eventos); `services/comensales.service.js` (al entrar o registrarse, lo del teléfono pasa a la cuenta); `validators/comunes.js` y `favoritos.service.js` (la ruta pública rechaza tokens de cuenta); `routes/index.js`, `routes/app/index.js` y `README.md`.

**Panel web.** `features/admin/comentarios/pages/ComentariosPage.jsx` (filtros "Con reportes", "Todos" y "Ocultos"; ocultar, mostrar y borrar), su entrada en `router.jsx` y en `AdminSidebar.jsx`, y en `PlatosPage.jsx` la casilla "Aparece en la app", su insignia y la duración.

**App.**

- Nuevos: `features/feed/screens/{PlatoScreen,ComentariosScreen}.tsx`, `feed/components/{AccionesPlato,CorazonDobleToque,HojaDetalle}.tsx`, `feed/hooks/{useFeed,useSocial,useFuentePlatos}.ts`, `feed/cache.ts` (un plato vive en varias cachés y lo social se cambia en todas a la vez), `features/restaurante/screens/RestauranteScreen.tsx`, `features/perfil/screens/GuardadosScreen.tsx`, `shared/api/{feed,social,eventos}.ts` y `shared/components/ui/HojaInferior.tsx`.
- Modificados: el inicio, la hoja ANTOJATE y su lógica, las tarjetas, el perfil (fila de guardados), la navegación, los esquemas de Zod, `App.tsx` (al entrar o salir de la cuenta se recargan feed y comentarios; los eventos se mandan al pasar a segundo plano) y `README.md`.
- Borrados: el catálogo de la Fase 1 (`shared/api/catalogo.ts`, `useCatalogo`, `useResultados`). La ficha del plato pasó de `descubrir/` a `feed/`.

**Endpoints que usa la Fase 2:** `GET /api/app/v1/feed`, `/feed/conteo` y `/feed/opciones`; `GET /platos/:id`; `POST` y `DELETE /platos/:id/me-gusta`; `GET` y `POST /platos/:id/comentarios`; `DELETE /comentarios/:id`; `POST /reportes`; `POST /bloqueos`; `GET`, `POST` y `DELETE /guardados`; `POST /eventos`. En el panel, `GET`, `PATCH` y `DELETE /api/comentarios`. La tabla completa está en `backend/README.md` (§7 bis).

**En qué se apartó del plan, y por qué:**

- **Un solo reproductor, no un pool.** Con dos o tres videos cargados a la vez, Android cerró Expo Go por memoria en el emulador; un teléfono de gama baja tendría el mismo problema. Solo reproduce el plato visible; los vecinos muestran su miniatura.
- **Contadores calculados por página, sin columnas desnormalizadas ni copia de `restaurante_id`.** Con el tamaño actual, dos consultas agrupadas por página bastan, y no hay contadores que se descuadren. Si la medición de la Fase 11 lo pide, se desnormaliza entonces.
- **El dueño del me gusta va en `favoritos.sesion_token`:** el UUID del navegador (web), el del teléfono (app sin cuenta) o `c:<id>` (cuenta). Así un mismo índice único sirve a los tres, la web y la app no se mezclan, y al registrarse se adopta con un `UPDATE IGNORE`. La ruta pública rechaza tokens con `:`.
- **Dos rutas que no estaban en el plan: `/feed/opciones` y `/feed/conteo`.** La hoja ANTOJATE solo ofrece lo que existe en los datos (categorías, precios en pesos, picante, chef, restaurantes) y dice cuántos platos coinciden antes de aplicar. Nada se inventa.
- **`hace_segundos` lo calcula MySQL.** La base local va en hora de Colombia y la de producción en UTC; una fecha sin zona que viaje a un teléfono se leería en la hora del teléfono.
- **Un comentario con tres reportes de personas distintas se oculta solo** hasta que el restaurante lo revise; quien reporta deja de verlo al instante, y quien bloquea deja de ver todo lo de esa persona. El total de la pantalla de comentarios cuenta lo que ve cada quien; el del feed, lo de todo el mundo.
- **La pantalla del restaurante es mínima** (cabecera, descripción y rejilla de sus platos en video): el perfil completo es de la Fase 4. En el inicio, las tarjetas de restaurante filtran el feed, como las categorías.
- **El deslizamiento vertical es una `FlatList` con `snapToInterval`, y el toque se detecta a mano.** El `VideoView` de expo-video se queda en Android con todos los toques y la lista no deslizaba: va bajo una capa con `pointerEvents="none"`. Un `Pressable` a pantalla completa daba por toque un arrastre de media pantalla, así que el toque cuenta solo si el dedo casi no se movió, y se mide con la hora del evento (con JavaScript atrasado, el reloj hacía de un toque corto uno largo).
- **Las hojas que suben desde abajo comparten `HojaInferior`.** Dentro del Modal de Android el área segura llegaba en 0 y la ventana cambia de alto al abrirse; con la animación `entering` de Reanimated, la hoja se quedaba flotando 48 dp por encima del borde, con la pantalla de atrás asomando. Ahora mide su propia área segura y sube con un desplazamiento.

**Verificación:**

- Backend: 137 pruebas unitarias y **50 comprobaciones de extremo a extremo** contra el backend local: el feed pagina hasta el final sin repetir y sin dos platos seguidos del mismo restaurante habiendo otro; los antojos filtran (Y entre tipos, O dentro de uno); un cursor que no casa da `CURSOR_INVALIDO`; me gusta y guardar son idempotentes; al registrarse, lo del teléfono pasa a la cuenta sin cambiar los totales; comentar exige cuenta; reportes, bloqueos, ocultado con tres reportes, moderación del panel (cada restaurante solo los suyos), eventos por lotes, el menú web rechaza un token de cuenta, y borrar la cuenta borra sus me gusta, guardados, comentarios y eventos.
- Las migraciones, en el orden de `init-db.sh`, sobre una base desechable creada como la de producción (ids `INT`), y después otra vez las tres nuevas, sin error: quedan 21 en el registro y `app_publica` en los tres planes. Luego, sobre la base local.
- App: TypeScript estricto sin errores y 44 pruebas (las de la Fase 1 más cachés, eventos, antojos y formatos).
- Panel: compila. **No se revisó en un navegador.**
- **En el emulador de Android** (Expo Go, SDK 57, contra el backend local): el inicio con el feed real y su intercalado; abrir un plato y deslizar al siguiente, con el contador "N de M"; un toque pausa y dos dan me gusta (con el corazón); me gusta y guardar con sus botones, también ya con cuenta; la ficha del plato ("Ver más"); comentar, reportar con motivo, bloquear y borrar el propio, con el título al día; compartir (la hoja de Android con el enlace a la vitrina); la pantalla del restaurante; los guardados en el perfil; la página final ("Eso es todo por ahora"), sin contador ni botón de sonido; y el botón de volver, siempre a la vista mientras se desliza.
- **Límite del emulador:** sin aceleración gráfica, la mediana de un cuadro es de 200 ms, y `adb shell input swipe` llega con velocidad cero (Android da el dedo por detenido si entre el último movimiento y el soltar pasan más de 40 ms). Allí un gesto corto vuelve al plato más cercano y solo pasa arrastrando más de media pantalla. Con velocidad cero esto es lo esperado, y la lista no se traba; **el gesto corto y rápido falta probarlo en un teléfono.**

**Pendiente:**

- Probar en un **teléfono Android de gama baja real** (HLS de Bunny, memoria, el gesto rápido) y en un **iPhone** (el video con `Referer` sigue sin probarse allí): es el criterio de aceptación de esta fase que falta.
- **Política de privacidad publicada** antes de abrir los comentarios a gente real (y antes de que se registre nadie).
- **`/.well-known/` en Nginx** (403 hoy): sin eso, compartir abre la vitrina web y no la app.
- **Desplegar** las tres migraciones en el orden de arriba (`DESPLIEGUE.md`).
- **Cuentas de Apple y Google** antes de la primera versión de prueba (decisión de la §22).
- Revisar en un navegador la moderación y la casilla "Aparece en la app" del panel.
