# Recursos de marca

El logotipo y el isotipo son **SVG en código** (`src/shared/components/marca/LogoAntojate.jsx`):
no hay que exportar nada para ellos.

## `og.png` — la vista previa al compartir

1200 × 630, la imagen que sale en WhatsApp, Facebook, LinkedIn y X cuando alguien
comparte un enlace de bitemo.co. También es el `logo` de la entidad Organization
en los datos estructurados.

**Ojo con reemplazarla:** el archivo tiene que existir de verdad. Cuando faltaba,
Nginx respondía a `/marca/og.png` con el `index.html` (un HTML de 6 KB con estado
200 haciéndose pasar por imagen), así que las vistas previas salían sin foto y
nada fallaba de forma visible. Ahora `nginx.conf` devuelve 404 si el archivo no
está, que es más ruidoso y más honesto.

Si la rehaces: PNG o JPG de 1200 × 630, por debajo de 300 KB (WhatsApp descarta
las más pesadas), con el texto grande —se ve a tamaño de miniatura— y sin
información importante en los bordes, que algunas plataformas recortan.

## La mascota

Desde octubre de 2026 la mascota es una tostada con cara, minimalista y sin
fondo: contorno verde cilantro `#1F8A5B`, cuerpo blanco y cara en tinto
`#2B1B12`. Es **SVG en código**
(`src/shared/components/marca/MascotaAntojate.jsx`): no hay PNG que
exportar para la web.

Expresiones: `feliz`, `sorprendido`, `curioso`, `increible`, `recomendando` y
`celebrando` (la lista vive en `EXPRESIONES`).

`mascota.svg` es la misma figura en un archivo suelto, con fondo transparente,
para redes y piezas de diseño. Instagram y TikTok piden PNG o JPG: expórtala a
1080 × 1080.

Las mascotas anteriores (el explorador con gorro de aviador, sus renders 3D
`mascota-*.png` y la tostada naranja con mordida) quedaron retiradas.
