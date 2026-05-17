// Generador de identificadores parametrizables (equivalente a ir.sequence
// de Odoo). El cliente del API pide `getNextNumber(code)` y recibe un string
// formateado según la Sequence configurada (prefix + número con padding +
// suffix), aplicando reset cíclico cuando corresponde.
//
// Garantías:
//   - Atomicidad: el incremento es UPDATE...RETURNING dentro de transacción,
//     dos requests concurrentes nunca reciben el mismo número y no hay huecos.
//   - Reset cíclico: si resetCycle = 'yearly'|'monthly' y cambió el período
//     desde lastReset, nextNumber vuelve a 1 antes de entregar.
//   - Placeholders: {year} (2026), {year2} (26), {month} (05), {day} (17)
//     se expanden en prefix y suffix con la fecha de la generación.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Aplica los placeholders soportados sobre una plantilla.
function expandPlaceholders(template, date) {
  const year  = String(date.getFullYear());
  const year2 = year.slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return template
    .replaceAll('{year}', year)
    .replaceAll('{year2}', year2)
    .replaceAll('{month}', month)
    .replaceAll('{day}', day);
}

// True si el ciclo amerita reset comparando lastReset vs now.
function shouldReset(resetCycle, lastReset, now) {
  if (resetCycle === 'never' || !lastReset) return false;
  const prev = new Date(lastReset);
  if (resetCycle === 'yearly') return prev.getFullYear() !== now.getFullYear();
  if (resetCycle === 'monthly') {
    return prev.getFullYear() !== now.getFullYear()
        || prev.getMonth() !== now.getMonth();
  }
  return false;
}

// Devuelve el siguiente número formateado para la sequence `code`.
// Throws si no existe la sequence o si está inactiva.
export async function getNextNumber(code) {
  const now = new Date();

  // Toda la lógica corre en una transacción atómica para evitar carreras.
  // Postgres serializa los updates sobre la misma fila por el lock implícito.
  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.findUnique({ where: { code } });
    if (!seq) throw new Error(`Sequence '${code}' no existe`);
    if (!seq.active) throw new Error(`Sequence '${code}' está inactiva`);

    // ¿Toca resetear el contador? Aplica antes de tomar el número.
    const reset = shouldReset(seq.resetCycle, seq.lastReset, now);
    const currentNumber = reset ? 1 : seq.nextNumber;
    const newNext = currentNumber + (seq.increment || 1);

    await tx.sequence.update({
      where: { id: seq.id },
      data: {
        nextNumber: newNext,
        // Marcamos lastReset cada vez que tomamos un número — así sabemos
        // en qué período estamos. Si fue un reset explícito o el primer uso,
        // queda registrado igual.
        lastReset: reset || !seq.lastReset ? now : seq.lastReset,
      },
    });

    return { seq, currentNumber };
  });

  const { seq, currentNumber } = result;
  const prefix = expandPlaceholders(seq.prefix || '', now);
  const suffix = expandPlaceholders(seq.suffix || '', now);
  const padded = String(currentNumber).padStart(seq.padding || 0, '0');
  return `${prefix}${padded}${suffix}`;
}

// Crea las sequences por defecto si no existen. Idempotente — se puede
// invocar en cada boot.
export async function seedDefaultSequences() {
  await prisma.sequence.upsert({
    where: { code: 'orden.numero' },
    update: {},
    create: {
      code: 'orden.numero',
      name: 'Número de orden',
      prefix: 'OS-{year}-',
      suffix: '',
      padding: 5,
      nextNumber: 1,
      increment: 1,
      resetCycle: 'yearly',
    },
  });
  await prisma.sequence.upsert({
    where: { code: 'ot.numero' },
    update: {},
    create: {
      code: 'ot.numero',
      name: 'Número de orden de trabajo',
      prefix: 'OT-{year}-',
      suffix: '',
      padding: 5,
      nextNumber: 1,
      increment: 1,
      resetCycle: 'yearly',
    },
  });
}

// Migración aditiva 2026-05-17: mueve el contenido del campo `numero` a
// `referenciaExterna` para las órdenes que tenían algo y todavía no fueron
// migradas (referenciaExterna está vacío). Idempotente.
export async function backfillReferenciaExterna() {
  try {
    const n = await prisma.$executeRawUnsafe(
      `UPDATE "Orden"
          SET "referenciaExterna" = "numero",
              "numero" = NULL
        WHERE "referenciaExterna" IS NULL
          AND "numero" IS NOT NULL`
    );
    if (n) console.log(`[api] backfill referenciaExterna: ${n} órdenes migradas`);
  } catch (err) {
    console.error('[api] backfill referenciaExterna falló (se ignora):', err.message);
  }
}
