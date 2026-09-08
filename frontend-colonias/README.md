# Frontend web — Panel de administración

Panel de administración (Single Page Application) construido con **React + Vite +
TypeScript**, estilado con **Tailwind CSS** y conectado a la API vía **Apollo Client**. Para
la visión general del proyecto completo, consulta el
[README de la raíz del repositorio](../README.md).

## Organización del código

Por características (*feature-based*), no por tipo de fichero — cada módulo de negocio vive
en su propia carpeta con sus documentos GraphQL, página de listado, formulario y ficha de
detalle:

```
src/
├── features/
│   ├── auth/            Login, AuthContext, protección de rutas
│   ├── colonias/         Listado, mapa interactivo (Leaflet), detalle, formulario
│   ├── comederos/        Listado, detalle, visitas registradas
│   ├── gatos/             Listado, detalle, historial clínico
│   ├── voluntarios/      Listado, detalle (cesión de datos RGPD)
│   └── asignaciones/     Listado, formulario
├── components/ui/        Componentes propios reutilizables (sin librería de terceros)
├── layout/                 AppLayout: navegación lateral (escritorio) / inferior (móvil)
├── lib/                   Config, manejo de errores GraphQL, resolveMediaUrl, enums
└── types/graphql.ts       Tipos TypeScript que reflejan el esquema GraphQL
```

No se usa ninguna librería de componentes de terceros a propósito — formularios, tablas,
modales e insignias de estado están escritos a mano sobre Tailwind.

## Variable de entorno

`.env` (no versionado):

```
VITE_API_URL=http://localhost:3000
```

Sin ella (el caso del build dentro de Docker), el cliente cae en rutas relativas
(`/graphql`, `/uploads`) resueltas contra el mismo origen desde el que se sirve la app —
así la misma imagen sirve para local y para producción sin recompilar.

## Comandos habituales

```bash
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm run build      # comprobación de tipos + build de producción
npm run preview    # sirve el build de producción en local
npm run lint        # oxlint
npm test           # tests unitarios (Vitest)
```

Para ver la app en el móvil desde la misma WiFi durante el desarrollo:
`npm run dev -- --host`.

## Responsive

Diseño mobile-first con Tailwind: por debajo de 1024px la barra lateral se sustituye por una
barra de navegación inferior con los apartados más usados y un botón "Más" para el resto.
