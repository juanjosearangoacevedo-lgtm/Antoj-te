# Recursos de marca

El logotipo y el isotipo son **SVG en código** (`src/features/landing/components/marca/BitemoLogo.jsx`):
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

La mascota sí es un render 3D del manual de marca y vive aquí como PNG.

## Archivos que espera la landing

| Archivo                     | Expresión del manual | Dónde se usa                |
| --------------------------- | -------------------- | --------------------------- |
| `mascota-recomendando.png`  | Recomendando         | Hero, junto al teléfono     |
| `mascota-curioso.png`       | Curioso              | Cabecera de "Cómo funciona" |
| `mascota-celebrando.png`    | Celebrando           | Tarjeta del CTA final       |

El manual trae además `feliz`, `sorprendido` e `increible`; se pueden agregar con el
mismo patrón `mascota-<expresion>.png` (la lista vive en `EXPRESIONES`,
en `MascotaBitemo.jsx`).

## Cómo exportarlos

- **PNG con fondo transparente**, recortado al contorno de la mascota (sin margen sobrante:
  el margen se posiciona desde CSS).
- Lado mayor de **600–800 px**. Se muestran entre 80 px y 176 px, así que eso cubre
  pantallas 2x sin inflar la descarga.
- Pásalos por un compresor (TinyPNG, `oxipng`, `squoosh`) y apunta a **< 120 KB** cada uno.

## Si falta un archivo

No se rompe nada: `MascotaBitemo` detecta el error de carga y dibuja una versión plana
en SVG de la mascota. Al dejar el PNG en esta carpeta, la landing lo toma sola.
