# Despliegue de Antojate (VPS + Docker + Cloudflare)

Arquitectura en producción:

```
Comensal (celular, QR)
      │
      ├─ menú web + API ─► Cloudflare (gratis: SSL, CDN, escudo) ─► VPS
      │                                                              ├─ Nginx (sirve React + proxy /api)
      │                                                              ├─ Backend Node/Express
      │                                                              └─ MySQL
      │
      └─ videos ─────────► Bunny Stream CDN (global, HLS adaptativo)
```

- **Bunny** entrega los videos (no vive en el VPS).
- **VPS** corre la app (Nginx + Express + MySQL) con Docker.
- **Cloudflare** va por delante: HTTPS gratis, caché y protección.

---

## 0. Ensayo en tu PC (antes de contratar nada)

El mismo `docker-compose.yml` que corre en el VPS corre en tu máquina. Hacer el
ensayo primero cuesta cero y saca a la luz los errores de esquema o de build
mientras todavía son baratos de arreglar.

Con **Docker Desktop abierto**, desde esta carpeta:
```bash
cp .env.example .env    # contraseñas cualesquiera; es local
docker compose up -d --build
```
Abre `http://localhost` — el menú del comensal está en
`http://localhost/menu?mesa=bitemo-demo` y el panel en `http://localhost/login`.

Para borrar todo y volver a empezar (⚠️ **borra la base**):
```bash
docker compose down -v
```

Cuando el ensayo pase, el VPS es repetir estos mismos pasos allá.

---

## 1. Provisionar el VPS

### Qué contratar (primeros clientes en Medellín)

| | Recomendado | Alternativa |
|---|---|---|
| **Proveedor** | Hetzner **CPX11** — Ashburn, EE.UU. | Vultr **2 GB** — Miami |
| **Precio** | ~€4,35/mes | ~$12/mes |
| **Specs** | 2 vCPU · 2 GB RAM · 40 GB | 1 vCPU · 2 GB RAM · 55 GB |
| **Latencia desde Medellín** | ~85-110 ms | ~55-75 ms |

Sistema operativo: **Ubuntu 24.04 LTS** — es sobre lo que está escrita esta guía.

#### Por qué no São Paulo

Parece la opción obvia por estar en Sudamérica, pero para Colombia es la peor de
las tres (~120-150 ms). Los ISP colombianos —Claro, Tigo/UNE, ETB— interconectan
su tráfico internacional en **Miami**, en el NAP of the Americas. Un paquete de
Medellín a São Paulo normalmente sube primero a Miami y baja después: se paga el
rodeo completo.

#### Por qué el recomendado es el más lento de los dos

Porque la latencia del VPS casi no se nota en esta arquitectura. Cloudflare
cachea el frontend (HTML, CSS, JS, fuentes) en su nodo en Colombia, y los videos
salen del CDN de Bunny. Al VPS solo le llegan las llamadas a la API. Esos ~30 ms
extra de Ashburn se sienten al cargar el menú una vez, no al recorrer videos, que
es la mayor parte de lo que hace un comensal.

Y no amarra: si algún día la latencia de API se vuelve un problema medible,
mudarse a Miami es levantar el mismo `docker compose` en otro servidor.

#### Mínimo 2 GB de RAM, no 1 GB

No es por carga de usuarios sino por el *build*: `npm ci` + `vite build` dentro
de Docker se queda sin memoria en un servidor de 1 GB y el despliegue falla a
medias. Con 2 GB va cómodo.

#### Lo demás

**Dominio:** ~$11/año un `.com` en Porkbun o Namecheap. Un `.co` cuesta ~$28/año
y solo vale la pena si la marca lo pide. Se registra en cualquiera de los dos y
luego se apuntan los *nameservers* a Cloudflare (gratis).

**Cloudflare:** plan gratuito, sin tarjeta. Da HTTPS, CDN y escudo DDoS sin
instalar nada en el servidor (paso 8).

**Costo total para arrancar: ~$7/mes** más el dominio anual, contando el VPS y lo
que cuesta Bunny por restaurante (~$1-3/mes).

> Los precios son de referencia: confírmalos en el checkout de cada proveedor.

### Pasos

1. Crea un servidor **Ubuntu 24.04 LTS** con las specs de arriba.
2. Entra por SSH con **llave** (no contraseña):
   ```bash
   ssh root@TU_IP
   ```

## 2. Endurecer el servidor (seguridad mínima)

```bash
# Firewall: solo SSH + web
apt update && apt install -y ufw fail2ban
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# (Recomendado) crear un usuario no-root y deshabilitar login por contraseña en /etc/ssh/sshd_config:
#   PasswordAuthentication no
```

MySQL **no** se expone a internet: en `docker-compose.yml` no publicamos su puerto, solo es visible dentro de Docker.

## 3. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## 4. Subir el proyecto al VPS

Desde tu PC (esta carpeta):
```bash
# Comprime sin node_modules, sin builds y sin el historial de git
tar --exclude='**/node_modules' --exclude='**/dist' --exclude='.git' \
    --exclude='backups' -czf bitemo.tar.gz .
scp bitemo.tar.gz root@TU_IP:/opt/
```
> Los `.sh` deben viajar con finales de línea **LF**. El repo lo garantiza vía
> `.gitattributes`, pero si alguna vez copias un script editado a mano desde
> Windows y el VPS responde `bad interpreter: bash^M`, es eso: arréglalo con
> `sed -i 's/\r$//' archivo.sh`.
En el VPS:
```bash
mkdir -p /opt/bitemo && tar -xzf /opt/bitemo.tar.gz -C /opt/bitemo && cd /opt/bitemo
```

## 5. Configurar variables

```bash
cp .env.example .env
nano .env    # rellena contraseñas fuertes, JWT_SECRET y las 3 llaves de Bunny
```
El `.env` **nunca** se comparte ni se sube a ningún repositorio.

## 6. Levantar todo

```bash
chmod +x deploy.sh backup.sh
./deploy.sh
```
Esto construye y arranca `db`, `backend` y `web`. La app queda en `http://TU_IP` (puerto 80).

## 7. Verificar la carga del esquema

**No hay que hacer nada a mano.** El esquema y los datos iniciales se cargan
solos la primera vez que arranca el contenedor de MySQL: `docker-compose.yml`
monta [`init-db.sh`](init-db.sh) dentro de `/docker-entrypoint-initdb.d/`, y ese
script aplica las migraciones en el orden correcto.

Las semillas (roles, planes, superadmin y el restaurante demo) ya vienen dentro
de `bitemo_completo.sql`. **No corras** `seedRoles.js`, `seedPlanes.js` ni
`createSuperadmin.js`: son para el entorno de desarrollo y aquí sobran.

Confirma que cargó bien:
```bash
docker compose logs db | grep -E "Aplicando|Esquema de Antojate"
```
Deberías ver las 6 migraciones aplicadas. Y para verificar los datos:
```bash
docker compose exec db mysql -u root -p"$DB_ROOT_PASSWORD" menu_digital_saas \
  -e "SELECT (SELECT COUNT(*) FROM planes) planes, (SELECT COUNT(*) FROM restaurantes) restaurantes, (SELECT COUNT(*) FROM platos) platos;"
```
Esperado: 3 planes, 1 restaurante, 12 platos.

> **Si el esquema no cargó**, es casi siempre porque el volumen `db_data` ya
> existía de un intento anterior. Docker solo ejecuta la inicialización con el
> volumen vacío. Para reintentar desde cero (⚠️ **borra la base**):
> ```bash
> docker compose down -v && ./deploy.sh
> ```

> **Ojo con el orden de las migraciones.** `init-db.sh` es la única fuente de
> verdad y deja fuera tres archivos a propósito:
> `2026-07-18_planes_features_temas.sql` (ya está dentro de `bitemo_completo.sql`;
> aplicarlo encima falla con *Duplicate column name 'orden'*),
> `2026-07-31_unificar_collation.sql` (parche solo para la base de desarrollo) y
> `bitemo_faltantes.sql` (sus tablas ya están en completo). El razonamiento
> completo está comentado dentro de `init-db.sh`.

## 8. Dominio + HTTPS con Cloudflare (gratis)

1. Compra un dominio (~$10/año) y agrégalo a **Cloudflare**.
2. Crea un registro **A**: `@` (y `www`) → la IP del VPS. Deja la nube **naranja** (proxied).
3. En Cloudflare → SSL/TLS → modo **Full**. Ya tienes HTTPS sin instalar nada en el VPS.
4. (Opcional) Cloudflare → Rules → “Always Use HTTPS”.

## 9. Backups automáticos (imprescindible en producción)

```bash
crontab -e
# Backup diario a las 3am:
0 3 * * * /opt/bitemo/backup.sh >> /var/log/bitemo-backup.log 2>&1
```
Configura además un destino **offsite** (Backblaze B2 con `rclone`) — un backup solo en el mismo VPS no protege si el VPS muere. **Prueba una restauración** al menos una vez.

## 10. Monitoreo

Crea un chequeo gratis en **UptimeRobot** apuntando a `https://tudominio.com` (cada 5 min). Te avisa por email/Telegram si se cae, antes de que te llame un cliente.

---

## Actualizar la app más adelante

Sube los cambios al VPS y vuelve a correr:
```bash
./deploy.sh
```
Docker reconstruye solo lo que cambió.

### Migraciones nuevas

`init-db.sh` **solo corre en el primer arranque**, con la base vacía. Una
migración nueva sobre una base que ya tiene datos se aplica a mano:

```bash
docker compose exec -T db mysql --default-character-set=utf8mb4 \
  -u root -p"$DB_ROOT_PASSWORD" menu_digital_saas \
  < codigo_definitivo/backend/migrations/AAAA-MM-DD_lo_que_sea.sql
```

> **Nunca omitas `--default-character-set=utf8mb4`.** El cliente `mysql` de la
> imagen usa `latin1` por defecto: sin esa bandera los acentos entran
> doble-codificados (`Láminas` → `LÃ¡minas`) y no aparece ningún error. Si ya
> pasó, no se arregla con un UPDATE: hay que recargar los datos.

Haz un backup **antes** (`./backup.sh`) y agrega el archivo al arreglo `ORDEN`
de `init-db.sh`, para que una instalación futura desde cero también lo incluya.

### Qué migraciones tiene puestas una base

Desde `2026-09-15_saneo_esquema.sql` existe la tabla `migraciones_aplicadas`, y
cada migración nueva se registra a sí misma con un `INSERT IGNORE` al final del
archivo. Para ver el estado real de un entorno, sin adivinar:

```bash
docker compose exec -T db mysql -u root -p"$DB_ROOT_PASSWORD" menu_digital_saas \
  -e "SELECT archivo, aplicada_en FROM migraciones_aplicadas ORDER BY aplicada_en"
```

La primera vez, esa misma migración registra en retrospectiva las catorce
anteriores si detecta que la base ya tiene `restaurantes.slug` (la columna que
añadió la última de la serie), y las del 28 y 29 de septiembre por su propia
huella (la tabla o columna que solo cada una crea). Si no encuentra la señal, no
inventa nada: es preferible un historial incompleto a uno que miente.

### Pendiente de aplicar en producción

Se aplican **en este orden**, con un backup antes (`./backup.sh`). Las tres son
idempotentes y se probaron seguidas, dos veces, sobre una base creada desde
`bitemo_completo.sql` (ids `INT`, como producción).

1. `2026-09-29_comensales.sql` — las cuentas de la app móvil (fase 1).
2. `2026-09-15_saneo_esquema.sql` — iguala el esquema de las dos bases. Crea el
   registro de migraciones; renombra `ingredientes.stock` a `stock_actual` y
   añade `costo_unitario` (sin eso, **crear un ingrediente desde el panel
   responde 500 en producción**, porque el model escribe nombres de columna que
   allí no existen); y deduplica `favoritos` para ponerle el índice único que
   impide marcar dos veces el mismo plato. Su código funciona con la migración
   aplicada y sin ella.
3. `2026-10-12_app_feed.sql` — el feed de la app (fase 2): `en_feed`,
   `publicado_en` y `duracion_segundos` en `platos`, la feature `app_publica` en
   todos los planes, `comensal_id` en `favoritos` y las tablas `guardados`,
   `comentarios`, `comentario_reportes`, `comensal_bloqueos` y `eventos_app`. Si
   le faltan las dos anteriores se detiene al principio, sin tocar nada. **El
   código de la fase 2 sí la necesita**: aplícala antes de desplegarlo.

## Comandos útiles

```bash
docker compose ps                 # estado
docker compose logs -f backend    # logs del backend
docker compose logs -f web        # logs de Nginx
docker compose down               # apagar (sin borrar datos; el volumen db_data persiste)
```
