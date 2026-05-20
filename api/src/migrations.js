// Migraciones de datos idempotentes que DEBEN correr antes de `prisma db push`.
//
// Caso crítico — workflow de Orden de Servicio:
// El estado de la OS pasó de vivir en el catálogo `Estado` (relación vía
// `estadoId`) a una columna propia `estado` (texto). Si `prisma db push` crea
// esa columna con NOT NULL + DEFAULT 'programado' ANTES del backfill, Postgres
// rellena todas las filas existentes con 'programado' y se pierde el estado
// real de cada orden.
//
// Por eso `migrateOrdenEstados` se ejecuta primero (ver `premigrate.js` y el
// CMD del Dockerfile): crea la columna como NULLABLE y sin default, copia el
// estado real desde el catálogo viejo, y recién al final aplica DEFAULT +
// NOT NULL. Así `prisma db push` posterior la encuentra ya correcta (no-op).
//
// Es idempotente: en cada arranque se puede invocar sin efectos secundarios.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function migrateOrdenEstados() {
  try {
    // 1) Columna nullable y sin default: las filas viejas quedan en NULL para
    //    poder distinguir "aún no migrada" en el paso de backfill.
    await prisma.$executeRawUnsafe(`ALTER TABLE "Orden" ADD COLUMN IF NOT EXISTS "estado" TEXT`);

    // 2) Copia el estado real desde el catálogo `Estado` (vía estadoId). Usa
    //    unaccent() si la extensión existe; si no, cae al lower() plano.
    await prisma.$executeRawUnsafe(`
      UPDATE "Orden" o
         SET "estado" = CASE
           WHEN lower(unaccent(coalesce(e."nombre", ''))) LIKE '%cancel%' THEN 'cancelado'
           WHEN e."esFinal" = true
             OR lower(unaccent(coalesce(e."nombre", ''))) LIKE '%final%'
             OR lower(unaccent(coalesce(e."nombre", ''))) LIKE '%complet%'
             OR lower(unaccent(coalesce(e."nombre", ''))) LIKE '%culmin%' THEN 'finalizado'
           WHEN lower(unaccent(coalesce(e."nombre", ''))) LIKE '%progreso%'
             OR lower(unaccent(coalesce(e."nombre", ''))) LIKE '%inici%'
             OR lower(unaccent(coalesce(e."nombre", ''))) LIKE '%proceso%' THEN 'en_progreso'
           ELSE 'programado'
         END
        FROM "Estado" e
       WHERE o."estadoId" = e."id"
         AND (o."estado" IS NULL OR o."estado" = '')
    `).catch(async () => {
      await prisma.$executeRawUnsafe(`
        UPDATE "Orden" o
           SET "estado" = CASE
             WHEN lower(coalesce(e."nombre", '')) LIKE '%cancel%' THEN 'cancelado'
             WHEN e."esFinal" = true
               OR lower(coalesce(e."nombre", '')) LIKE '%final%'
               OR lower(coalesce(e."nombre", '')) LIKE '%complet%'
               OR lower(coalesce(e."nombre", '')) LIKE '%culmin%' THEN 'finalizado'
             WHEN lower(coalesce(e."nombre", '')) LIKE '%progreso%'
               OR lower(coalesce(e."nombre", '')) LIKE '%inici%'
               OR lower(coalesce(e."nombre", '')) LIKE '%proceso%' THEN 'en_progreso'
             ELSE 'programado'
           END
          FROM "Estado" e
         WHERE o."estadoId" = e."id"
           AND (o."estado" IS NULL OR o."estado" = '')
      `);
    });

    // 3) Órdenes sin estado en catálogo (o con valor inválido) → 'programado'.
    await prisma.$executeRawUnsafe(`
      UPDATE "Orden"
         SET "estado" = 'programado'
       WHERE "estado" IS NULL
          OR "estado" NOT IN ('programado', 'en_progreso', 'finalizado', 'cancelado')
    `);

    // 4) Recién ahora default + NOT NULL. `prisma db push` queda como no-op.
    await prisma.$executeRawUnsafe(`ALTER TABLE "Orden" ALTER COLUMN "estado" SET DEFAULT 'programado'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Orden" ALTER COLUMN "estado" SET NOT NULL`);
  } catch (err) {
    console.error('[api] migrate Orden estados falló (se ignora):', err.message);
  }
}

// Cierra la conexión — para usar desde scripts de un solo uso (premigrate.js).
export async function closeMigrations() {
  await prisma.$disconnect();
}
