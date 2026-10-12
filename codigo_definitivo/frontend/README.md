# Frontend — Menú Digital (Video Vertical)

App móvil-first en **React + Vite + Tailwind** que implementa el flujo del
comensal: escanear QR → bienvenida → categorías → feed de video vertical
(estilo TikTok) → agregar al carrito con modificadores → comanda/carrito →
enviar pedido → seguimiento en tiempo real. Sin necesidad de crear cuenta
(sesión anónima persistida en `localStorage`).

## 1. Instalación

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL debe apuntar a tu backend, ej: http://localhost:3000/api
npm run dev
```

Abre `http://localhost:5173/menu?mesa=<codigo_qr_token>` — el parámetro `mesa`
es el `codigo_qr_token` real de una mesa creada en el backend (lo genera
`POST /api/mesas`). Si no hay backend disponible o el token no resuelve,
**la app entra automáticamente en modo demo** con datos de muestra (banner
amarillo arriba), para que siempre puedas ver el flujo completo funcionando.

## 2. Por qué se siente fluido (el feed de video)

- **CSS scroll-snap** (`scroll-snap-type: y mandatory` + `scroll-snap-align: start`)
  en vez de una librería de carrusel: el navegador maneja el "enganche" entre
  videos de forma nativa, sin JS de por medio en el gesto de swipe.
- **`IntersectionObserver`** (`features/menu/hooks/useActiveSlide`) decide qué video reproducir:
  solo el video visible tiene `play()`; todos los demás están en pausa. Esto
  evita que 10 videos reproduzcan audio/decodifiquen frames a la vez.
- **Precarga del vecino inmediato**: el video activo y sus vecinos (`±1`)
  usan `preload="auto"`; el resto usa `preload="none"` — así el siguiente
  video ya tiene buffer cuando el usuario hace swipe, sin gastar red de más
  en los que están lejos.
- El video se resetea (`currentTime = 0`) al salir de pantalla, para que
  siempre empiece desde el inicio si el usuario vuelve a él.

## 3. Estructura

El código se organiza **por funcionalidad**: cada módulo del producto vive en su
propia carpeta dentro de `src/features/` con la misma convención
(`components/ hooks/ pages/`), y todo lo transversal está en `src/shared/`.
Si aparece un bug, la carpeta dice de quién es.

```
src/
  main.jsx                 Bootstrap
  app/                     App.jsx (providers) + router.jsx (todas las rutas)
  features/
    landing/               Página pública en /
    menu/                  Comensal (/menu?mesa=<token>) — este README describe su flujo
      components/            Welcome, CategoryPicker, VideoFeed, VideoCard,
                             DishInfoSheet, AddToCartSheet, MiniCartBar,
                             CartView, OrderTracking, BottomSheet
      context/               SessionContext: sesión anónima (UUID), mesa, carrito
      hooks/                 useSession · useActiveSlide (IntersectionObserver del feed)
      services/menu.api.js   Cliente hacia /api/public/*
      data/mock.js           Datos de muestra del modo demo
      pages/MenuPage.jsx     Máquina de estados del flujo del comensal
    auth/                  Login + guards de sesión y de rol
    admin/                 Panel: layout compartido + un módulo por pantalla
    cocina/                Tablero KDS (/cocina)
  shared/
    components/ui/         Kit UI (Btn, Card, Modal, Tabla, Badge…) — importar desde el index
    components/            TemaToggle, PantallaCargando
    hooks/ services/ utils/ constants/
```

Los imports usan el alias `@` → `src/`, por ejemplo:

```js
import { Btn, Modal } from '@/shared/components/ui';
import { useSession } from '@/features/menu/hooks/useSession';
```

> Regla: una feature puede usar `shared/`, pero `shared/` nunca importa de `features/`.
> Si dos features necesitan lo mismo, ese código sube a `shared/`.

## 4. Dirección de diseño

- **Paleta**: carbón cálido casi negro (`#0F0D0B`) + acento dorado-azafrán
  (`#E7A93C`, apetito / "recomendado del chef"), rojo-chile (picante) y
  verde salvia (pedido listo/fresco).
- **Tipografía**: `Fraunces` (serif con carácter) para títulos, `Manrope`
  para UI, `IBM Plex Mono` para precios, tickets y temporizadores.
- **Elemento firma**: el contraste entre el feed de video cinematográfico
  (pantalla completa, inmersivo, sin fricción) y la estética de **comanda de
  cocina** en el carrito/seguimiento (ticket con borde perforado, tipografía
  monoespaciada) — como si el pedido se imprimiera de verdad.

## 5. Reemplazar los videos de demo

`src/features/menu/data/mock.js` usa videos de muestra públicos solo para previsualizar el
feed. En producción, cada plato trae su propio `video_url` desde
`platos.video_url` en la base de datos — no hay que tocar el código del
feed, solo cargar los videos reales del restaurante.

## 6. Analítica conectada

El feed ya dispara automáticamente los eventos que alimentan el embudo de
conversión del backend (`analiticas_eventos_video`):
`video_start`, `video_complete`, `tiempo_visto`, `agrego_carrito`,
`click_favorito`, `compra_exitosa`. No requiere configuración adicional
mientras `VITE_API_URL` apunte a un backend real.
