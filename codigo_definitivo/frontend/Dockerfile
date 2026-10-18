# Frontend React/Vite de Antojate — build estático servido por Nginx.
# Nginx también hace de reverse proxy hacia el backend en /api.

# --- Etapa 1: build del SPA ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# En producción el frontend llama al backend en el mismo dominio, vía /api (Nginx lo enruta).
ENV VITE_API_URL=/api
# Dominio público: alimenta canonical, etiquetas para compartir, robots.txt y
# sitemap.xml. Cámbialo aquí (o con --build-arg) el día que cambie el dominio.
ENV VITE_SITIO_URL=https://bitemo.co
# Video del teléfono en el hero de la landing. MP4 directo (no HLS) a propósito,
# ver el comentario en src/features/landing/contenido/demo.js.
ENV VITE_VIDEO_DEMO_URL=https://vz-243cff12-4eb.b-cdn.net/62013a19-bd7d-4c1a-8cdb-7b17dbccd046/play_720p.mp4
ENV VITE_VIDEO_DEMO_POSTER=https://vz-243cff12-4eb.b-cdn.net/62013a19-bd7d-4c1a-8cdb-7b17dbccd046/thumbnail_76157fdf.jpg
RUN npm run build

# --- Etapa 2: Nginx sirviendo el build + proxy /api ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Las cabeceras van aparte porque Nginx obliga a repetirlas en cada location con
# add_header propio; ver el comentario dentro del archivo.
COPY cabeceras-seguridad.conf /etc/nginx/cabeceras-seguridad.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
