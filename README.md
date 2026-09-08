# Colonias Felinas

Sistema multiplataforma de censado y control sanitario de colonias felinas, desarrollado
como Trabajo de Fin de Grado (Grado en Ingeniería Informática, Universidad de Cantabria).

Este proyecto se basa en: una API GraphQL, un panel de administración web y una aplicación móvil pensada para el trabajo de campo — todo con autenticación, control de acceso por roles y trazabilidad de cada
intervención sanitaria (protocolo CER: Captura, Esterilización, Retorno).

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | NestJS · TypeScript · GraphQL (code-first) · Prisma ORM · PostgreSQL |
| Frontend web | React · Vite · TypeScript · Tailwind CSS · Apollo Client · Leaflet |
| Aplicación móvil | React Native · Expo · Apollo Client |
| Autenticación | JWT + bcrypt, control de acceso por roles |
| Imágenes | Endpoint REST híbrido + `sharp` (redimensionado, WebP, saneamiento EXIF) |
| Infraestructura | Docker Compose (desarrollo y producción), Caddy (proxy inverso + TLS automático) |
| Pruebas | Vitest (backend, unitarias + e2e contra PostgreSQL real) · Vitest (web) · Jest (móvil) |
| CI | GitHub Actions — tipos, tests y build en los 3 paquetes en cada push/PR |

## Estructura del repositorio

Monorepo gestionado con **npm workspaces**:

```
.
├── backend/               API GraphQL (NestJS) + esquema y migraciones de Prisma
├── frontend-colonias/     Panel de administración web (React)
├── frontend-mobile/       Aplicación de campo (React Native / Expo)
├── docker-compose.yml     Orquestación para desarrollo local
├── docker-compose.prod.yml  Orquestación para producción (sin puertos internos expuestos)
└── Caddyfile              Proxy inverso y TLS automático para producción
```

Cada paquete (`backend`, `frontend-colonias`, `frontend-mobile`) tiene su propio
`package.json`, `Dockerfile` y suite de pruebas independiente.

## Modelo de datos

Ocho entidades relacionadas mediante claves foráneas indexadas e integridad referencial
estricta (`ON DELETE CASCADE`/`RESTRICT` según el caso):

- **Colonia** — núcleo de agrupación felina censado (ubicación, tipo de suelo, código oficial).
- **Gato** — ficha individual, estado en el protocolo CER, microchip, marcaje de oreja.
- **Comedero** — punto de alimentación asociado a una colonia.
- **VisitaComedero** — traza de auditoría de cada visita/inspección a un comedero.
- **Voluntario** — colaborador, con cesión de datos RGPD obligatoria antes de tratarse.
- **AsignacionVoluntario** — relación N:M entre voluntarios y colonias, con rol asignado.
- **RegistroClinico** — historial médico por gato (esterilización, vacunación, tratamiento...).
- **Usuario** — cuentas de acceso al sistema (roles Administrador / Gestor).

## Puesta en marcha (desarrollo local)

### Requisitos

- Node.js 24.x
- Docker + Docker Compose

### 1. Instalar dependencias

```bash
npm install
```

### 2. Base de datos

```bash
docker compose up -d db
```

### 3. Variables de entorno

Cada paquete que las necesita trae su propio `.env` (no versionado). Como mínimo, en
`backend/`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/colonias_db?schema=public"
JWT_SECRET="cualquier-cadena-larga-para-desarrollo"
JWT_EXPIRES_IN="86400"
APP_URL="http://localhost:3000"
MIN_FREE_DISK_MB="2048"
```

### 4. Migraciones y datos de demo

```bash
cd backend
npx prisma migrate dev
npm run db:seed
```

El seed crea colonias, gatos, comederos, voluntarios, visitas y registros clínicos de
ejemplo, con dos usuarios de acceso:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@ayto-ejemplo.es` | `password123` |
| Gestor | `gestor@ayto-ejemplo.es` | `password123` |

### 5. Arrancar cada paquete

```bash
npm run dev:backend   # API en http://localhost:3000/graphql
npm run dev:web       # panel web en http://localhost:5173
npm run dev:mobile    # Expo — escanea el QR con Expo Go
```

Alternativa: levantar todo el ecosistema (base de datos, backend y web) en contenedores con
un único comando:

```bash
docker compose up --build
```

## Pruebas

```bash
# backend — 133 tests unitarios (npm test) + 47 e2e contra PostgreSQL real (npm run test:e2e)
cd backend && npm test && npm run test:e2e

# frontend web
cd frontend-colonias && npx vitest run

# app móvil
cd frontend-mobile && npx jest
```

## Despliegue

`docker-compose.prod.yml` describe la topología de producción: `db`, `backend` y `frontend`
sin ningún puerto publicado directamente, con **Caddy** como único punto de entrada
(gestiona HTTPS automáticamente vía Let's Encrypt). Frontend y backend pueden servirse desde
el mismo dominio o desde dos dominios separados (configurable vía variables de entorno).

## Licencia

Proyecto académico (Trabajo de Fin de Grado). Consulta con el autor antes de reutilizar el
código fuera de un contexto educativo.
