# ---------- build ----------
FROM node:24-slim AS builder
WORKDIR /app

# Prisma necesita openssl para su motor de consultas en Debian.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# El repo es un npm workspace (lockfile único en la raíz), pero el contexto de build de
# aquí es solo backend/: no puede ver ese lockfile de la raíz. Por eso backend/package-lock.json
# existe como lockfile autocontenido propio solo para Docker (generado con
# `npm install --workspaces=false --package-lock-only`) - no lo borres pensando que es redundante.
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Genera el cliente de Prisma AQUÍ DENTRO, para el Linux del contenedor
# (nunca copiar node_modules/.prisma generado en el host: el motor de
# consultas es un binario nativo distinto por sistema operativo).
RUN npx prisma generate
RUN npm run build

# ---------- producción ----------
FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Se copia node_modules ya instalado (con el motor de Prisma correcto)
# en vez de reinstalar, para no arriesgarse a que un segundo "npm ci"
# resuelva binarios nativos de forma distinta al build.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json prisma.config.ts ./

RUN mkdir -p uploads

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
