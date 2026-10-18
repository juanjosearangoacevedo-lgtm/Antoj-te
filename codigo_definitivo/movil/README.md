# Antojate — App móvil del comensal

App de descubrimiento gastronómico (feed de video, búsqueda, reservas con plano,
domicilios) sobre el mismo backend de Antojate. La auditoría, las decisiones y el
plan por fases están en [`APP_MOVIL.md`](../../APP_MOVIL.md), en la raíz del repo.

**Stack:** Expo SDK 57 (React Native 0.86, React 19.2) · TypeScript estricto ·
React Navigation 7 · TanStack Query · Zustand · Zod · expo-video · expo-image ·
react-native-keyboard-controller.

## Arrancar en local

1. **El backend**, desde la raíz del repo (necesita MySQL con las migraciones
   `2026-09-29_comensales.sql`, `2026-09-15_saneo_esquema.sql` y
   `2026-10-12_app_feed.sql` aplicadas, en ese orden):

   ```bash
   npm --prefix codigo_definitivo/backend run dev
   ```

2. **La app**, en otra terminal:

   ```bash
   cd codigo_definitivo/movil
   npm install
   npx expo start
   ```

3. **En el teléfono**, instala **Expo Go** y escanea el QR que imprime la
   terminal. El teléfono y el PC tienen que estar en la misma red Wi-Fi.

**A qué backend habla la app** (lo decide `src/shared/api/config.ts`):

- Con `EXPO_PUBLIC_API_URL` definida (copia `.env.example` a `.env`), a esa.
- Si no, en desarrollo, a la IP desde la que el teléfono bajó el código, en el
  puerto 3000. No hace falta escribir la IP de tu red a mano.
- Si el teléfono no llega al backend, casi siempre es el **Firewall de Windows**
  bloqueando el puerto 3000 para la red local: permite a Node en redes privadas.

**Emulador de Android** (el de Android Studio): `npx expo start --android`. Dentro
del emulador, `127.0.0.1` es el propio emulador; para que llegue al backend:

```bash
adb reverse tcp:3000 tcp:3000
```

En el emulador sin aceleración gráfica todo va lento, y un deslizamiento rápido
del feed no pasa al plato siguiente: `adb shell input swipe` llega sin velocidad
(Android da el dedo por detenido) y la lista vuelve al plato más cercano.
Arrastra más de media pantalla, o prueba el gesto en un teléfono.

**iPhone:** Expo Go desde la App Store, igual que en Android. Compilar la app
para iOS sin Expo Go exige un Mac o EAS Build (en la nube).

## Comandos

```bash
npm run typecheck    # TypeScript estricto: tiene que salir sin errores
npm test             # pruebas (Jest)
npm run doctor       # que las versiones cuadren con el SDK de Expo
```

## Estructura

```
src/
  App.tsx              proveedores: fuentes, React Query, navegación, versión mínima
  navigation/          pila raíz, tres pestañas con barra flotante (Inicio · Buscar · Perfil), tipos y enlaces
  features/<modulo>/   screens · components · hooks, por funcionalidad (como la web)
    descubrir/         el botón ANTOJATE (logica/ pura y probada, state/ con los antojos
                       guardados), las tarjetas y la hoja de antojos
    feed/              el inicio, la ficha en video que se desliza, los comentarios,
                       los hooks del feed y la capa social, y las cachés (cache.ts)
    restaurante/       un restaurante y sus platos (el perfil completo llega en la fase 4)
    perfil/            perfil, cuenta y guardados
  shared/
    api/               cliente HTTP único + un archivo por dominio (auth, cuenta, feed,
                       social, eventos…)
    state/             stores de Zustand: sesión, dispositivo, solicitud de acceso
    components/        kit de UI (con la mascota, el fondo de marca y la hoja inferior) y estados
    theme/             tokens de la marca: los mismos del comensal en la web
    utils/             funciones puras (versiones, validación, precios)
```

## Reglas del proyecto

- **Las pantallas nunca llaman a `fetch`.** Usan los servicios de
  `shared/api/<dominio>.ts`, que pasan por `shared/api/cliente.ts`: ahí viven la
  URL base, las cabeceras, el token, la renovación de sesión y la forma de los
  errores.
- **Toda respuesta se valida con un esquema de Zod** (`shared/api/esquemas.ts`), y
  los tipos salen de esos esquemas: el contrato con la API se escribe una vez.
- **Toda pantalla con datos remotos pinta cargando, vacío y error con
  "Reintentar"** (`shared/components/estados`). Nunca una pantalla en blanco.
- **Todo formulario va dentro de `<Pantalla desplazable>`**, que mantiene el
  campo activo por encima del teclado. No uses el `KeyboardAvoidingView` de
  React Native: con Android de borde a borde (SDK 54 en adelante) deja campos
  tapados; se comprobó en el emulador.
- **Colores, tipografía y medidas salen de `shared/theme`**, nunca de un valor
  suelto. Sobre el verde de relleno (`#1b7d52`), texto blanco: 5,1:1, pasa AA.
- **Nombres en español**, como el resto del repo; los términos técnicos de
  React Native (`screens`, `components`, `hooks`) se quedan en inglés.
- **Videos e imágenes de Bunny se piden con `Referer`** (`CABECERAS_MEDIOS`): el
  CDN rechaza con 403 lo que llega sin él.
- **La barra de pestañas flota encima del contenido.** Toda pestaña reserva al
  final lo que mide (`useEspacioBarra()` de `navigation/BarraFlotante.tsx`, o
  `<Pantalla espacioInferior>`); si no, la barra tapa lo último.
- **ANTOJATE solo filtra con datos reales**: categoría, precio, picante,
  recomendado del chef y restaurante. Filtra el backend (`GET /app/v1/feed`); la
  app solo arma las opciones con lo que `GET /app/v1/feed/opciones` dice que
  existe (`features/descubrir/logica/antojos.ts`). Ocasiones, dietas e
  intenciones se ven como "Pronto" hasta que exista la taxonomía de la fase 3;
  nunca se inventan resultados, calificaciones, distancias ni promociones.
- **Un mismo plato vive en varias cachés** (el inicio, el chef, un restaurante,
  los guardados, su ficha). Lo social se cambia con `actualizarSocial` de
  `features/feed/cache.ts`, que lo aplica en todas a la vez.
- **El video del feed no recibe toques.** En Android, el `VideoView` de
  expo-video se queda con todos los que le caen encima y la lista deja de
  deslizar: va dentro de una capa con `pointerEvents="none"`, y el toque (pausa,
  doble toque para "me gusta") se detecta a mano en la página, solo si el dedo
  casi no se movió, y con la hora del evento, no la del reloj al atenderlo. Un
  solo reproductor a la vez: con más, Android cierra Expo Go por memoria.
- **Toda hoja que sube desde abajo usa `HojaInferior`** (`shared/components/ui`).
  Dentro del Modal de Android el área segura llega en 0 y la ventana cambia de
  alto al abrirse: la hoja mide su propia área segura y sube con un
  desplazamiento. Con un Modal propio y la animación `entering` de Reanimated, la
  hoja quedaba flotando por encima del borde.
- **En la app no va ningún secreto.** Solo `EXPO_PUBLIC_*`, que es público.
- **Dependencias con `npx expo install <paquete>`**, no con `npm install`: elige
  la versión compatible con el SDK. Expo cambia mucho entre versiones: ante la
  duda, la documentación versionada (`docs.expo.dev/versions/v57.0.0/`), no la
  memoria.
- **Las carpetas `android/` e `ios/` no se crean ni se editan a mano**
  (Continuous Native Generation): lo nativo se configura en `app.json`.
- **Expo Go trae solo sus módulos nativos.** Una librería con código nativo que
  no esté en Expo Go (las notificaciones push en Android, por ejemplo) exige un
  *development build* (`eas build --profile development`).
