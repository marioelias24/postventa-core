# postventa-core

Aplicación de gestión de servicio post-venta: calendario, órdenes, clientes, reportes, RBAC.

Funciona **standalone** (con branding genérico) o como **base de un customer-layer** que sobreescribe assets y configuración. El modelo es similar a Odoo: clonás el core, lo configurás vía `.env` y opcionalmente lo combinás con un repo de cliente que monta sus assets y módulos sobre el core.

## Stack

- **Frontend:** React 19 + Vite + Tailwind + React Router + Vitest
- **Backend:** Node 20 + Express 5 + Prisma + PostgreSQL 16
- **Auth:** cookie/JWT + bcrypt; RBAC con 4 roles (admin / supervisor / técnico / lectura)
- **Deploy:** Docker Compose (nginx + api + postgres)

## Arquitectura modular

La app está organizada en 4 módulos accesibles desde un launcher tipo bento:

- **Mantenimiento** — calendario (planeación), órdenes de servicio, clientes y configuración
- **Contactos** — directorio de clientes
- **Reportes** — KPIs y análisis de horas
- **Ajustes** — usuarios + roles, datos de empresa, matriz de permisos

## Ejecutar standalone

```bash
git clone <url> postventa-core
cd postventa-core
cp .env.example .env
$EDITOR .env       # completar POSTGRES_PASSWORD y AUTH_SECRET (min 32 chars)

docker compose up -d --build
# → http://localhost
```

Crear el primer usuario (no hay signup público todavía):

```bash
docker compose exec api node src/scripts/createUser.js admin@local.test miPassword123
```

Para desarrollo del frontend con HMR:

```bash
npm install
npm run dev        # → http://localhost:5173 (proxea /api y /uploads al compose)
```

## Customizar branding

El core lee estas variables de entorno **al hacer build de Vite** (frontend) y al inicializar la fila `Empresa` (backend):

| Variable | Default | Qué hace |
|---|---|---|
| `VITE_BRAND_DEFAULT_NAME` | `"Post Venta"` | Nombre mostrado en topbar/login/footer mientras no haya `Empresa` configurada en BD |
| `VITE_LOCALE` | `"es"` | Locale para formato de fechas (`es-PA`, `es-MX`, `en-US`, …) |
| `VITE_GEOCODE_COUNTRY_SUFFIX` | `""` | Texto que se concatena al geocodificar direcciones (ej. `", Panamá"` sesga la búsqueda a ese país) |
| `VITE_MAP_DEFAULT_CENTER` | `"0,0"` | `"lat,lng"` del centro inicial del mapa cuando un cliente no tiene coordenadas |
| `BRAND_DEFAULT_NAME` | `"Post Venta"` | Nombre con el que se autocrea el singleton `Empresa` en la primera petición (usado por el backend) |

Cambiar variables `VITE_*` requiere rebuild del frontend (`docker compose up -d --build app`).

Los **assets** (logo, favicon) viven en `public/` y se reemplazan dropeando archivos sobre las mismas rutas:

- `public/logo.svg` — logo mostrado en topbar y login (cuando no hay logo subido vía Ajustes > Empresa)
- `public/favicon.svg` — favicon del sitio

## Customer layers (overlays)

Para tener un branding/configuración específico de un cliente sin tocar el core, se crea un repo aparte que actúa de "overlay" y se combina con el core via `docker compose -f core/docker-compose.yml -f layer/docker-compose.yml ...`. Ejemplo: [postventa-accesos](#) para Accesos Automáticos Panamá.

Estructura esperada en el server:

```
/opt/postventa-deploy/
├── core/                ← este repo
└── accesos/             ← postventa-accesos (assets + .env + override compose)
```

El overlay puede:

- **Reemplazar assets**: montar archivos sobre `/usr/share/nginx/html/logo.svg` etc.
- **Inyectar env vars**: pasar `VITE_*` y `BRAND_*` al build via `build.args`
- **Agregar módulos** (futuro): cuando exista un sistema de slots/extensiones, el overlay podrá registrar rutas/sub-vistas/widgets adicionales sin tocar el core.

Ver [postventa-accesos/README.md](#) para un ejemplo concreto.

## Sin sistema multi-tenant todavía

El core sirve **una empresa por instancia**: una BD, una fila Empresa, un set de usuarios. Para vender como SaaS multi-cliente hace falta una fase aparte (campo `tenantId` en cada tabla + middleware + billing) que **no** está implementada acá. La estructura modular y el sistema de overlays está pensada para soportar ese futuro sin reescritura.

## Tests

```bash
npm test
```

24 tests cubren las vistas críticas (formularios, listados, lógica de fechas, store).
