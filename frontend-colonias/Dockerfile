# ---------- build ----------
FROM node:24-slim AS builder
WORKDIR /app

# El repo es un npm workspace (lockfile único en la raíz), pero el contexto de build de
# aquí es solo frontend-colonias/: no puede ver ese lockfile de la raíz. Por eso
# frontend-colonias/package-lock.json existe como lockfile autocontenido propio solo para
# Docker (generado con `npm install --workspaces=false --package-lock-only`) - no lo borres
# pensando que es redundante.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Sin VITE_API_URL (no se copia .env, ver .dockerignore) el build queda con rutas relativas
# (/graphql, /uploads), que Nginx reenvía al backend: vale si front y back comparten dominio.
# Con dominios separados (nuestro caso: coloniasfelinas.com / api.coloniasfelinas.com), se pasa
# como --build-arg VITE_API_URL=https://api.coloniasfelinas.com para llamar a esa URL absoluta.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- producción ----------
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
