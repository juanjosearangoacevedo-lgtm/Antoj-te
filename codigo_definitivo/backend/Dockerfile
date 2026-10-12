# Backend Node/Express de Bitemo
FROM node:22-alpine

WORKDIR /app

# Instala dependencias primero (mejor uso de la cache de Docker)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia el código (el .env queda excluido por .dockerignore; las vars vienen de docker-compose)
COPY --chown=node:node . .

# Sin root. La imagen trae el usuario `node`; el backend no escribe en disco
# (el video va directo a Bunny, los datos a MySQL), así que no necesita más.
# Si alguien lograra ejecutar código a través de una dependencia vulnerable,
# quedaría encerrado en un usuario sin privilegios en vez de ser root del contenedor.
USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
