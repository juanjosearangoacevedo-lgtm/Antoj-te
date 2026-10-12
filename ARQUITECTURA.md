# Bitemo — Arquitectura del sistema

Plataforma SaaS multi-tenant de **Visual Commerce para restaurantes**: transforma el menú tradicional en una experiencia de video vertical que aumenta la intención de compra y el ticket promedio.

## 1. Arquitectura del sistema

```
┌─────────────────────────── FRONTEND (React + Vite + Tailwind) ───────────────────────────┐
│  /            Experiencia del comensal (QR → feed de video → carrito → seguimiento)      │
│  /login       Login de staff (JWT)                                                       │
│  /admin       Panel Super Admin (global) y panel Admin Restaurante (tenant)              │
│  /cocina      Panel KDS (cocineros/meseros, polling 5 s)                                 │
└───────────────────────────────────────┬──────────────────────────────────────────────────┘
                                        │ REST /api (JSON, Bearer JWT)
┌───────────────────────────────────────▼──────────────────────────────────────────────────┐
│  BACKEND (Node + Express, MySQL sin ORM)                                                 │
│  middleware: authenticate → authorize(roles) → requireFeature(flag)                      │
│  módulos: auth, planes, restaurantes, usuarios, sucursales, mesas, categorías, platos,   │
│           combos, modificadores, ingredientes, carrito, pedidos (KDS), temas,            │
│           plataforma (stats), recomendaciones, analítica                                 │
└───────────────────────────────────────┬──────────────────────────────────────────────────┘
                                        │
                                  MySQL (multi-tenant por restaurante_id)
```

Multi-tenancy: **base de datos compartida, aislamiento por fila** (`restaurante_id`). Todo usuario no-superadmin queda anclado a su tenant vía el JWT (`resolveRestauranteId`).

## 2. Módulos de cada panel

| Panel | Módulos |
|---|---|
| Super Admin | Dashboard global (MRR, pedidos, top restaurantes), Restaurantes (aprobar/suspender/cambiar plan), Planes (CRUD + feature flags), Usuarios |
| Admin Restaurante | Mi restaurante (info + estado + plan), Categorías (orden, activar), Carta y videos (CRUD platos, precios, orden, media), Personalización (según plan), Sucursales y QR, Mi equipo |
| Cocina (KDS) | Columnas Pendientes / En preparación / Listos, cambio de estado, cancelación, alerta sonora de pedidos nuevos, urgencia por tiempo (>15 min), observaciones |
| Comensal | Bienvenida, categorías, feed de video, ficha del plato, carrito (solo Plan Pro), seguimiento del pedido |

## 3. Modelo de permisos

Dos capas independientes:
1. **Roles (RBAC)** — `superadmin`, `admin_restaurante`, `cocinero`, `mesero` → middleware `authorize(...roles)`.
2. **Feature flags por plan** — tabla `plan_features` → middleware `requireFeature(flag)` (staff) y `requireFeaturePublic(flag)` (comensal, resuelto por token QR). Cache en memoria 60 s, invalidada al cambiar plan/estado.

Flags actuales: `menu`, `personalizacion`, `carrito`, `kds`.

| Plan | menu | personalizacion | carrito | kds |
|---|---|---|---|---|
| Básico | ✓ | — | — | — |
| Intermedio | ✓ | ✓ | — | — |
| Pro | ✓ | ✓ | ✓ | ✓ |

Un plan nuevo = una fila en `planes` + sus filas en `plan_features`. Nada de código.

## 4. Modelo de suscripciones

- `restaurantes.plan_id` → plan vigente (fuente de verdad).
- `suscripciones` → historial (restaurante, plan, estado activa/cancelada/vencida, fechas). Cada cambio de plan cierra la suscripción activa y abre una nueva (transacción).
- `restaurantes.estado`: `pendiente` → `activo` → `suspendido` (gestionado por el superadmin; un restaurante suspendido bloquea menú público y APIs).

## 5. Modelo de base de datos (tablas nuevas de esta fase)

- `plan_features(plan_id, feature)` — flags por plan.
- `suscripciones(restaurante_id, plan_id, estado, fecha_inicio, fecha_fin)`.
- `temas_restaurante` — 1:1 con restaurante: colores (primario, fondo, botones, texto), colores por categoría (JSON), tipografías, iconografía, banner/portada, videos destacados (JSON), orden visual (JSON), estilo de tarjetas, navegación (JSON), modo claro/oscuro.
- `categorias.orden`, `platos.orden`, `platos.imagen_url` (nuevas columnas).
- `pedidos.estado` ahora incluye `Cancelado`.

Migración: `codigo_definitivo/backend/migrations/2026-07-18_planes_features_temas.sql` · Seed: `npm run seed:planes`.

## 6–10. Flujos

**Cliente final:** escanea QR → `GET /public/:token/config` (features + tema → CSS variables) → feed de video → (Plan Pro) agrega al carrito → checkout → pedido llega a cocina → sigue estados en vivo.

**Admin restaurante:** login → `/admin` → gestiona carta, precios, orden, media → (Intermedio+) personaliza tema → (Pro) monitorea cocina. Lo que su plan no incluye aparece bloqueado con mensaje de upgrade.

**Super Admin:** login → dashboard global → aprueba/suspende restaurantes, cambia planes, edita feature flags de cada plan, crea admins.

**Cocina:** login (cocinero/mesero) → `/cocina` → tablero con pedidos en tiempo real (mesa, hora, productos, cantidades, observaciones) → Pendiente → En preparación → Listo → Entregado (o Cancelado). Cada cambio queda en `pedido_tiempos_estados` para analítica de tiempos.

## 11. Estructura de frontend

Organizado **por funcionalidad** (`features/`), con lo transversal en `shared/`.
Cada feature es autocontenida y sigue la misma convención: `components/ hooks/ pages/`.
Todos los imports usan el alias `@` → `src/` (definido en `vite.config.js` y `jsconfig.json`).

```
src/
  main.jsx                 Bootstrap: fija el tema del panel y monta <App/>
  app/
    App.jsx                Providers globales (BrowserRouter + AuthProvider)
    router.jsx             TODAS las rutas de la aplicación, en un solo archivo
  features/
    landing/               Página pública (ruta /): Hero, ComoFunciona, Beneficios, CTA
    menu/                  Experiencia del comensal (ruta /menu?mesa=<token>)
      components/          VideoFeed, VideoCard, CartView, OrderTracking, BottomSheet…
      context/             SessionContext: sesión anónima + config + tema del restaurante
      hooks/               useSession, useActiveSlide
      services/            menu.api.js → /api/public/*
      data/mock.js         Datos del modo demo (cuando el backend no responde)
    auth/
      components/          RequireAuth (guard de sesión), SoloSuper (guard de rol)
      context/             AuthContext: usuario, plan, features
      hooks/useAuth.js
      pages/LoginPage.jsx
    admin/
      layout/              AdminLayout + AdminSidebar + AdminHeader + AvisoSuscripcion
      pages/AdminIndex.jsx Portada de /admin según el rol
      <módulo>/            dashboard, restaurantes, planes, usuarios, mi-restaurante,
                           categorias, platos, personalizacion, mesas
                           — cada uno con sus components/ hooks/ pages/
    cocina/pages/          Tablero KDS (ruta /cocina, sin sidebar)
  shared/
    components/ui/         Kit UI (Btn, Card, Modal, Tabla, Badge, FeatureLock…) + index.js
    components/            TemaToggle, PantallaCargando
    hooks/                 useTemaStaff
    services/              http.js (fetch + JWT opcional) · staffApi.js · token.js
    utils/                 formato.js (moneda) · qr.js
    constants/             roles.js · features.js
```

**Reglas de dependencia:** una feature puede importar de `shared/`; `shared/` nunca
importa de `features/`; entre features solo se importa lo que expone otra feature de
forma explícita (hoy: `auth` provee `useAuth` al resto).

**Rutas:** `/` landing · `/menu?mesa=<token>` comensal · `/login` · `/admin/*` panel
(comparten `AdminLayout`) · `/cocina` KDS. Los QR impresos con la ruta anterior
(`/?mesa=<token>`) se redirigen automáticamente a `/menu`.

El tema por restaurante se aplica con **CSS variables** (`--c-base`, `--c-primario`, `--font-display`…): Tailwind las referencia, así que toda la UI del comensal se re-tematiza sin tocar componentes.

## 12. Estructura de backend

Arquitectura **por capas**, con un archivo por recurso en cada una. Toda petición
recorre siempre el mismo camino, así que el tipo de fallo indica dónde buscarlo:

```
ruta → middlewares → validador → controller → service → model → MySQL
```

```
src/
  config/       db.js (pool MySQL)
  middlewares/  auth.js (JWT + roles + tenant) · features.js (feature flags + cache)
                validar.js (esquema Zod → 400) · asyncHandler.js · errorHandler.js
  errors/       ApiError + subclases por código (BadRequest, NotFound, Conflict…)
  validators/   <recurso>.validator.js — esquemas Zod por operación
  routes/       <recurso>.routes.js · index.js (staff) · public.routes.js (comensal)
  controllers/  <recurso>.controller.js — solo request/response
  services/     <recurso>.service.js — reglas de negocio, SIN SQL
  models/       <recurso>.model.js — todo el SQL, SIN lógica de negocio
  utils/        jwt.js
  app.js · server.js
tests/unit/     node --test, sobre lo que no necesita base de datos
```

**Reglas que sostienen la separación:** los models nunca lanzan `ApiError` (devuelven
fila, `null` o filas afectadas, y el service traduce eso a 404/409); los services nunca
escriben SQL. Cada model acepta un `db` opcional para poder participar en una
transacción abierta por el service — hoy lo usan `carrito` (checkout), `pedidos`
(cambio de estado + bitácora) y `restaurantes` (cambio de plan).

## 13. APIs nuevas de esta fase

| Endpoint | Quién | Descripción |
|---|---|---|
| `GET /api/public/:token/config` | Comensal | Restaurante + features del plan + tema |
| `GET/PUT /api/temas` | Admin rest. | Tema visual (PUT exige feature `personalizacion`) |
| `PATCH /api/restaurantes/:id/estado` | Superadmin | Aprobar / suspender |
| `PATCH /api/restaurantes/:id/plan` | Superadmin | Cambiar plan (con historial) |
| `GET /api/plataforma/estadisticas` | Superadmin | Stats globales + MRR |
| `planes` CRUD con `features[]` | Superadmin | Feature flags editables por plan |
| Carrito público | Comensal | Ahora protegido: solo planes con `carrito` |
| Pedidos staff | Staff | Ahora protegido por feature `kds` |

## 14. Componentes reutilizables

Frontend: `Card, Btn, Field, Input, Select, Textarea, Badge, Modal, Tabla, ErrorMsg, EstadoVacio, FeatureLock, NavItem`. Backend: `asyncHandler`, `ApiError`, `authorize`, `requireFeature*`, patrón CRUD del cliente API (`crud(base)`).

## 15. Escalabilidad futura

Cada función futura es **un feature flag + un módulo**, sin tocar lo existente: IA/recomendaciones (módulo ya presente, se activa con flag `ia`), analíticas avanzadas (flag `analitica_pro`), POS/WhatsApp/pagos (módulos de integración + webhooks), fidelización y reservas (nuevas tablas por tenant), multi-sucursal (ya soportado), multi-idioma/moneda (columnas de traducción + `Intl`). El superadmin podrá venderlos como add-ons marcando el flag en el plan.

---

## Puesta en marcha

```bash
# Backend
cd menu-digital-saas-backend/backend
mysql -u root -p menu_digital_saas < migrations/2026-07-18_planes_features_temas.sql
npm run seed:roles && npm run seed:planes
npm run create:superadmin -- "Tu Nombre" admin@bitemo.com claveSegura123
npm run dev

# Frontend
cd menu-digital-saas-frontend/frontend
npm install
npm run dev
```

Rutas: `/` comensal (`?mesa=<token-qr>`) · `/login` staff · `/admin` paneles · `/cocina` KDS.
