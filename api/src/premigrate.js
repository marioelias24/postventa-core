// Pre-migración: se ejecuta ANTES de `prisma db push` (ver CMD del Dockerfile).
//
// Su única razón de ser es correr el backfill del estado de Orden con la BD
// todavía en el schema viejo, para que pueda leer el catálogo `Estado` antes
// de que el push cree la columna `estado` con NOT NULL + DEFAULT. Ver el
// comentario extenso en `migrations.js`.
//
// Siempre termina con código 0: el backfill ya traga sus propios errores y no
// queremos que un fallo idempotente corte la cadena `&&` del arranque (el
// próximo boot lo reintenta).

import { migrateOrdenEstados, closeMigrations } from './migrations.js';

migrateOrdenEstados()
  .then(() => console.log('[api] premigrate: backfill de estados de Orden ok'))
  .catch((err) => console.error('[api] premigrate falló (se ignora):', err.message))
  .finally(async () => {
    await closeMigrations().catch(() => {});
    process.exit(0);
  });
