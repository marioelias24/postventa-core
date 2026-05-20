-- Backfill seguro del estado de Orden de Servicio (workflow fijo).
--
-- Contexto: el estado de la OS pasó de vivir en el catálogo `Estado`
-- (relación vía `estadoId`) a una columna propia `estado` (texto). Si
-- `prisma db push` crea esa columna con NOT NULL + DEFAULT antes del
-- backfill, Postgres rellena TODAS las filas con 'programado' y se pierde
-- el estado real de cada orden.
--
-- A partir de esta versión el contenedor del API ya corre este backfill
-- automáticamente en el arranque (src/premigrate.js, antes de `db push`).
-- Este script queda como RED DE SEGURIDAD: ejecútalo manualmente contra la
-- BD de producción ANTES del primer deploy del cambio de schema, así te
-- aseguras de que la columna ya exista y esté backfilleada.
--
-- Es idempotente: filas con un estado válido no se vuelven a tocar.
--
-- Uso:
--   psql "$DATABASE_URL" -f api/scripts/backfill-orden-estado.sql

BEGIN;

-- 1) Columna NULLABLE y sin default: las filas existentes quedan en NULL
--    para poder distinguir "aún no migrada" en el paso de backfill.
ALTER TABLE "Orden" ADD COLUMN IF NOT EXISTS "estado" TEXT;

-- 2) Copia el estado real desde el catálogo viejo `Estado` (vía estadoId).
--    Las órdenes que ya tenían un estado real lo conservan, mapeado a uno
--    de los cuatro estados del workflow fijo.
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
   AND (o."estado" IS NULL OR o."estado" = '');

-- 3) Órdenes sin estado en catálogo (o con valor inválido) → 'programado'.
UPDATE "Orden"
   SET "estado" = 'programado'
 WHERE "estado" IS NULL
    OR "estado" NOT IN ('programado', 'en_progreso', 'finalizado', 'cancelado');

-- 4) Recién ahora default + NOT NULL: `prisma db push` queda como no-op.
ALTER TABLE "Orden" ALTER COLUMN "estado" SET DEFAULT 'programado';
ALTER TABLE "Orden" ALTER COLUMN "estado" SET NOT NULL;

COMMIT;

-- Verificación sugerida (debe reflejar el reparto real, no todo 'programado'):
--   SELECT "estado", count(*) FROM "Orden" GROUP BY "estado" ORDER BY "estado";
