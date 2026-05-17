import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import {
  login, logout, me, requireAuth, changePassword,
  listUsers, createUser, deleteUser, resetUserPassword,
  updateUserRole, requirePermission,
} from './auth.js';
import { hasPermission } from './permissions.js';
import {
  getEmpresa, updateEmpresa, uploadEmpresaLogo, deleteEmpresaLogo,
  uploadLogo, UPLOAD_DIR,
} from './empresa.js';
import {
  getNextNumber, seedDefaultSequences, backfillReferenciaExterna,
} from './sequences.js';

const prisma = new PrismaClient();

const collectionMap = {
  tecnicos: 'tecnico',
  tipos: 'tipo',
  estados: 'estado',
  prioridades: 'prioridad',
  clientes: 'cliente',
  ordenes: 'orden',
};

const IN_USE_MESSAGE = 'No se puede eliminar: este elemento está siendo utilizado en otros registros. Si ya no lo necesitas, considera archivarlo (marcarlo como inactivo) en su lugar.';

// Mapeo colección → acción de permiso por verbo. Los catálogos (técnicos,
// tipos, estados, prioridades) se agrupan bajo 'catalogo:edit' porque
// usualmente quien los administra es el mismo perfil (admin/supervisor).
const COLLECTION_PERMS = {
  ordenes:     { write: 'orden:edit',    create: 'orden:create',  delete: 'orden:delete' },
  clientes:    { write: 'cliente:edit',  create: 'cliente:create', delete: 'cliente:delete' },
  tecnicos:    { write: 'catalogo:edit', create: 'catalogo:edit', delete: 'catalogo:edit' },
  tipos:       { write: 'catalogo:edit', create: 'catalogo:edit', delete: 'catalogo:edit' },
  estados:     { write: 'catalogo:edit', create: 'catalogo:edit', delete: 'catalogo:edit' },
  prioridades: { write: 'catalogo:edit', create: 'catalogo:edit', delete: 'catalogo:edit' },
};

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.post('/api/auth/change-password', changePassword);
app.get('/api/auth/me', me);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Archivos subidos (logos): se sirven públicamente sin auth para que el <img>
// del frontend funcione sin reenviar la cookie como Authorization. El path
// se mantiene impredecible vía timestamp, así que no es un endpoint listable.
app.use('/uploads', express.static(UPLOAD_DIR, {
  fallthrough: true,
  maxAge: '7d',
  immutable: false,
}));

app.use(requireAuth);

// USERS — todas las acciones sensibles requieren 'users:manage' (= admin).
// El listado se permite a cualquier autenticado para que la UI muestre la lista
// (admin ve acciones, el resto solo lectura).
app.get('/api/users', listUsers);
app.post('/api/users', requirePermission('users:manage'), createUser);
app.delete('/api/users/:id', requirePermission('users:manage'), deleteUser);
app.post('/api/users/:id/reset-password', requirePermission('users:manage'), resetUserPassword);
app.put('/api/users/:id/role', requirePermission('users:manage'), updateUserRole);

// EMPRESA — GET público (toda la app necesita el nombre/logo); edición admin/supervisor.
app.get('/api/empresa', getEmpresa);
app.put('/api/empresa', requirePermission('empresa:edit'), updateEmpresa);
app.post('/api/empresa/logo', requirePermission('empresa:edit'), uploadLogo, uploadEmpresaLogo);
app.delete('/api/empresa/logo', requirePermission('empresa:edit'), deleteEmpresaLogo);

// SEQUENCES — solo admin. CRUD para administrar las plantillas de números.
// La generación atómica (getNextNumber) no se expone como endpoint público;
// se invoca internamente al crear una orden si llega sin `numero`.
app.get('/api/sequences', requirePermission('sequences:manage'), async (req, res, next) => {
  try {
    const sequences = await prisma.sequence.findMany({ orderBy: { code: 'asc' } });
    res.json({ sequences });
  } catch (err) { next(err); }
});

app.put('/api/sequences/:id', requirePermission('sequences:manage'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, prefix, suffix, padding, nextNumber, increment, resetCycle, active } = req.body || {};
    // Solo permitimos editar los campos seguros; `code` es inmutable porque
    // el código de la aplicación lo referencia.
    const data = {};
    if (name !== undefined) data.name = String(name);
    if (prefix !== undefined) data.prefix = String(prefix);
    if (suffix !== undefined) data.suffix = String(suffix);
    if (padding !== undefined) data.padding = Math.max(0, parseInt(padding, 10) || 0);
    if (nextNumber !== undefined) data.nextNumber = Math.max(1, parseInt(nextNumber, 10) || 1);
    if (increment !== undefined) data.increment = Math.max(1, parseInt(increment, 10) || 1);
    if (resetCycle !== undefined) {
      if (!['never', 'yearly', 'monthly'].includes(resetCycle)) {
        return res.status(400).json({ error: 'resetCycle debe ser never|yearly|monthly' });
      }
      data.resetCycle = resetCycle;
    }
    if (active !== undefined) data.active = Boolean(active);

    const sequence = await prisma.sequence.update({ where: { id }, data });
    res.json({ sequence });
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Sequence no encontrada' });
    next(err);
  }
});

app.get('/api/data', async (req, res, next) => {
  try {
    const [tecnicos, tipos, estados, prioridades, clientes, ordenes, ordenesTrabajo, plantillas] = await Promise.all([
      prisma.tecnico.findMany({ orderBy: { id: 'asc' } }),
      prisma.tipo.findMany({ orderBy: { id: 'asc' } }),
      prisma.estado.findMany({ orderBy: { id: 'asc' } }),
      prisma.prioridad.findMany({ orderBy: { id: 'asc' } }),
      prisma.cliente.findMany({ orderBy: { id: 'asc' } }),
      prisma.orden.findMany({ orderBy: { id: 'asc' } }),
      prisma.ordenTrabajo.findMany({
        orderBy: { id: 'asc' },
        include: {
          checklist: { orderBy: { orden: 'asc' } },
          materiales: { orderBy: { id: 'asc' } },
          adjuntos: { orderBy: { id: 'asc' } },
        },
      }),
      prisma.plantillaChecklist.findMany({
        orderBy: { id: 'asc' },
        include: {
          items: { orderBy: { orden: 'asc' } },
          productos: { orderBy: { id: 'asc' } },
        },
      }),
    ]);
    res.json({ tecnicos, tipos, estados, prioridades, clientes, ordenes, ordenesTrabajo, plantillas });
  } catch (err) {
    next(err);
  }
});

// ─── PLANTILLAS CHECKLIST ─────────────────────────────────────────────────────

app.get('/api/plantillas-checklist', requirePermission('plantilla:manage'), async (req, res, next) => {
  try {
    const plantillas = await prisma.plantillaChecklist.findMany({
      orderBy: { id: 'asc' },
      include: { items: { orderBy: { orden: 'asc' } }, productos: { orderBy: { id: 'asc' } } },
    });
    res.json({ plantillas });
  } catch (err) { next(err); }
});

app.post('/api/plantillas-checklist', requirePermission('plantilla:manage'), async (req, res, next) => {
  try {
    const { id, nombre, tipoId, activo, items = [], productos = [] } = req.body || {};
    const isUp = Number.isInteger(id) && id > 0;
    const base = {
      nombre: String(nombre || '').trim(),
      tipoId: tipoId ? Number(tipoId) : null,
      activo: activo !== false,
    };
    if (!base.nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const result = await prisma.$transaction(async (tx) => {
      let plantilla;
      if (isUp) {
        plantilla = await tx.plantillaChecklist.update({ where: { id }, data: base });
        await tx.itemPlantilla.deleteMany({ where: { plantillaId: id } });
        await tx.productoPlantilla.deleteMany({ where: { plantillaId: id } });
      } else {
        plantilla = await tx.plantillaChecklist.create({ data: base });
      }
      const pid = plantilla.id;
      if (items.length) {
        await tx.itemPlantilla.createMany({
          data: items.map((it, i) => ({ plantillaId: pid, texto: String(it.texto || ''), orden: Number(it.orden ?? i) })),
        });
      }
      if (productos.length) {
        await tx.productoPlantilla.createMany({
          data: productos.map(p => ({
            plantillaId: pid,
            nombre: String(p.nombre || ''),
            cantidad: Number(p.cantidad) || 1,
            unidad: p.unidad ? String(p.unidad) : null,
          })),
        });
      }
      return tx.plantillaChecklist.findUnique({
        where: { id: pid },
        include: { items: { orderBy: { orden: 'asc' } }, productos: { orderBy: { id: 'asc' } } },
      });
    });

    res.json(result);
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada' });
    next(err);
  }
});

app.delete('/api/plantillas-checklist/:id', requirePermission('plantilla:manage'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    await prisma.plantillaChecklist.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    next(err);
  }
});

// ─── ORDENES DE TRABAJO ──────────────────────────────────────────────────────

const uploadOT = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `ot-adj-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/api/ordenes-trabajo', async (req, res, next) => {
  try {
    const ots = await prisma.ordenTrabajo.findMany({
      orderBy: { id: 'asc' },
      include: {
        checklist: { orderBy: { orden: 'asc' } },
        materiales: { orderBy: { id: 'asc' } },
        adjuntos: { orderBy: { id: 'asc' } },
        orden: true,
      },
    });
    res.json({ ordenesTrabajo: ots });
  } catch (err) { next(err); }
});

app.post('/api/ordenes-trabajo', requirePermission('ot:edit'), async (req, res, next) => {
  try {
    const { id, ordenId, horasReales, firmaCliente, notas, estado, checklist = [], materiales = [] } = req.body || {};
    const isUp = Number.isInteger(id) && id > 0;

    if (!isUp && (!Number.isInteger(ordenId) || ordenId <= 0)) {
      return res.status(400).json({ error: 'ordenId es requerido al crear' });
    }

    if (!hasPermission(req.user?.role, isUp ? 'ot:edit' : 'ot:create')) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let ot;
      if (isUp) {
        const base = {
          horasReales: horasReales != null ? Number(horasReales) : null,
          firmaCliente: firmaCliente ? String(firmaCliente) : null,
          notas: notas ? String(notas) : null,
          estado: estado || 'borrador',
        };
        ot = await tx.ordenTrabajo.update({ where: { id }, data: base });
        await tx.checklistItemOT.deleteMany({ where: { ordenTrabajoId: id } });
        await tx.materialOT.deleteMany({ where: { ordenTrabajoId: id } });
      } else {
        let numero = null;
        try { numero = await getNextNumber('ot.numero'); } catch { /* ignore */ }

        ot = await tx.ordenTrabajo.create({
          data: {
            ordenId: Number(ordenId),
            numero,
            horasReales: horasReales != null ? Number(horasReales) : null,
            firmaCliente: firmaCliente ? String(firmaCliente) : null,
            notas: notas ? String(notas) : null,
            estado: estado || 'borrador',
          },
        });

        // Auto-cargar items desde plantilla si el tipo de la orden tiene una.
        if (checklist.length === 0 && materiales.length === 0) {
          const orden = await tx.orden.findUnique({ where: { id: Number(ordenId) }, select: { tipoId: true } });
          if (orden?.tipoId) {
            const plantilla = await tx.plantillaChecklist.findFirst({
              where: { tipoId: orden.tipoId, activo: true },
              include: { items: { orderBy: { orden: 'asc' } }, productos: { orderBy: { id: 'asc' } } },
            });
            if (plantilla) {
              if (plantilla.items.length) {
                await tx.checklistItemOT.createMany({
                  data: plantilla.items.map(it => ({
                    ordenTrabajoId: ot.id,
                    texto: it.texto,
                    orden: it.orden,
                    completado: false,
                  })),
                });
              }
              if (plantilla.productos.length) {
                await tx.materialOT.createMany({
                  data: plantilla.productos.map(p => ({
                    ordenTrabajoId: ot.id,
                    nombre: p.nombre,
                    cantidad: p.cantidad,
                    unidad: p.unidad,
                  })),
                });
              }
            }
          }
        }
      }

      const otId = ot.id;
      if (checklist.length) {
        await tx.checklistItemOT.createMany({
          data: checklist.map((it, i) => ({
            ordenTrabajoId: otId,
            texto: String(it.texto || ''),
            completado: Boolean(it.completado),
            notas: it.notas ? String(it.notas) : null,
            orden: Number(it.orden ?? i),
          })),
        });
      }
      if (materiales.length) {
        await tx.materialOT.createMany({
          data: materiales.map(m => ({
            ordenTrabajoId: otId,
            nombre: String(m.nombre || ''),
            cantidad: Number(m.cantidad) || 1,
            unidad: m.unidad ? String(m.unidad) : null,
          })),
        });
      }

      return tx.ordenTrabajo.findUnique({
        where: { id: otId },
        include: {
          checklist: { orderBy: { orden: 'asc' } },
          materiales: { orderBy: { id: 'asc' } },
          adjuntos: { orderBy: { id: 'asc' } },
          orden: true,
        },
      });
    });

    res.json(result);
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    next(err);
  }
});

app.delete('/api/ordenes-trabajo/:id', requirePermission('ot:delete'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    // Borrar adjuntos del disco antes de eliminar el registro.
    const adjuntos = await prisma.adjuntoOT.findMany({ where: { ordenTrabajoId: id } });
    for (const adj of adjuntos) {
      await fs.unlink(path.join(UPLOAD_DIR, adj.filename)).catch(() => {});
    }
    await prisma.ordenTrabajo.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    next(err);
  }
});

// Adjuntos de OT
app.post('/api/ordenes-trabajo/:id/adjuntos', requirePermission('ot:edit'), uploadOT.array('files', 10), async (req, res, next) => {
  try {
    const ordenTrabajoId = parseInt(req.params.id, 10);
    if (!Number.isInteger(ordenTrabajoId)) return res.status(400).json({ error: 'Invalid id' });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No se recibieron archivos' });

    const created = await prisma.adjuntoOT.createMany({
      data: files.map(f => ({
        ordenTrabajoId,
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
      })),
    });

    const adjuntos = await prisma.adjuntoOT.findMany({ where: { ordenTrabajoId }, orderBy: { id: 'asc' } });
    res.json({ adjuntos, created: created.count });
  } catch (err) { next(err); }
});

app.delete('/api/ordenes-trabajo/:id/adjuntos/:adjId', requirePermission('ot:edit'), async (req, res, next) => {
  try {
    const ordenTrabajoId = parseInt(req.params.id, 10);
    const adjId = parseInt(req.params.adjId, 10);
    const adj = await prisma.adjuntoOT.findFirst({ where: { id: adjId, ordenTrabajoId } });
    if (!adj) return res.status(404).json({ error: 'Adjunto no encontrado' });
    await fs.unlink(path.join(UPLOAD_DIR, adj.filename)).catch(() => {});
    await prisma.adjuntoOT.delete({ where: { id: adjId } });
    res.status(204).end();
  } catch (err) { next(err); }
});

// Import masivo de clientes. Rechaza filas con email/nombre duplicado.
app.post('/api/clientes/bulk', requirePermission('cliente:bulk'), async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows) return res.status(400).json({ error: 'rows must be an array' });

    const existing = await prisma.cliente.findMany({ select: { nombre: true, email: true } });
    const existingNombres = new Set(existing.map(c => c.nombre?.trim().toLowerCase()).filter(Boolean));
    const existingEmails  = new Set(existing.map(c => c.email?.trim().toLowerCase()).filter(Boolean));

    const batchNombres = new Set();
    const batchEmails  = new Set();
    const skipped = [];
    const toCreate = [];

    rows.forEach((raw, idx) => {
      const rowNum = idx + 1;
      const nombre = (raw.nombre || '').trim();
      const email  = (raw.email  || '').trim().toLowerCase() || null;

      if (!nombre) {
        skipped.push({ row: rowNum, motivo: 'Sin nombre', nombre: '', email });
        return;
      }
      const nLower = nombre.toLowerCase();
      if (existingNombres.has(nLower) || batchNombres.has(nLower)) {
        skipped.push({ row: rowNum, motivo: 'Nombre ya existe', nombre, email });
        return;
      }
      if (email && (existingEmails.has(email) || batchEmails.has(email))) {
        skipped.push({ row: rowNum, motivo: 'Email ya existe', nombre, email });
        return;
      }

      batchNombres.add(nLower);
      if (email) batchEmails.add(email);

      toCreate.push({
        nombre,
        contacto: raw.contacto  || null,
        telefono: raw.telefono  || null,
        email:    raw.email     || null,
        direccion: raw.direccion || null,
        lat: raw.lat == null || raw.lat === '' ? null : Number(raw.lat),
        lng: raw.lng == null || raw.lng === '' ? null : Number(raw.lng),
        contratoActivo: raw.contratoActivo === false ? false : true,
        notas: raw.notas || null,
      });
    });

    if (toCreate.length > 0) {
      await prisma.cliente.createMany({ data: toCreate });
    }

    res.json({ created: toCreate.length, skipped });
  } catch (err) {
    next(err);
  }
});

// IMPORTANTE: /api/reset borra TODO el contenido operativo. No toca usuarios.
app.post('/api/reset', async (req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.orden.deleteMany(),
      prisma.cliente.deleteMany(),
      prisma.tecnico.deleteMany(),
      prisma.tipo.deleteMany(),
      prisma.estado.deleteMany(),
      prisma.prioridad.deleteMany(),
    ]);
    // Reinicia las secuencias autoincrement para que los IDs vuelvan a empezar en 1.
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.table_name, c.column_name
          FROM information_schema.columns c
          WHERE c.table_schema = 'public'
            AND c.column_name = 'id'
            AND c.column_default LIKE 'nextval%'
            AND c.table_name IN ('Cliente','Tecnico','Tipo','Estado','Prioridad','Orden')
        LOOP
          EXECUTE format(
            'ALTER SEQUENCE %I RESTART WITH 1',
            substring(
              (SELECT column_default FROM information_schema.columns
               WHERE table_name = r.table_name AND column_name = r.column_name)
              FROM 'nextval\\(''(.+?)''')
          );
        END LOOP;
      END $$;
    `).catch(() => { /* si las secuencias no existen aún, ignora */ });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Diferencia entre crear y actualizar:
// - body sin `id` o id <= 0 → CREATE (el server asigna el id autoincrement)
// - body con `id` numérico válido → UPDATE
//
// Autorización: cada colección tiene su mapa de acciones (create/write/delete).
// Si el rol del caller no tiene la acción correspondiente, devolvemos 403.
app.post('/api/:collection', async (req, res, next) => {
  try {
    const model = collectionMap[req.params.collection];
    if (!model) return res.status(400).json({ error: 'Invalid collection' });

    const { id, createdAt, updatedAt, ...rest } = req.body;
    const isUpdate = Number.isInteger(id) && id > 0;

    // Chequeo de permiso según verbo (create vs write).
    const perms = COLLECTION_PERMS[req.params.collection];
    if (perms) {
      const action = isUpdate ? perms.write : perms.create;
      if (!hasPermission(req.user?.role, action)) {
        return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
      }
    }

    if (req.params.collection === 'ordenes') {
      // El número de orden ahora se autogenera vía la Sequence 'orden.numero'
      // si llega vacío al crear. Si el usuario lo escribió manualmente, se
      // respeta. La referencia externa (SAP u otro) va en `referenciaExterna`
      // y es siempre editable, sin autogenerar.
      if (typeof rest.numero === 'string' && !rest.numero.trim()) rest.numero = null;
      if (typeof rest.referenciaExterna === 'string' && !rest.referenciaExterna.trim()) {
        rest.referenciaExterna = null;
      }
      if (!isUpdate && !rest.numero) {
        try {
          rest.numero = await getNextNumber('orden.numero');
        } catch (err) {
          console.error('[api] getNextNumber falló:', err.message);
          // Si la sequence no existe / falla, seguimos sin numero (queda null).
          // El boot intenta crear el seed; si todavía no corrió, el próximo intento andará.
        }
      }

      // Técnicos asignados (tags): normalizar a enteros únicos y derivar el
      // técnico "principal" (tecnicoId = tecnicoIds[0] ?? null) para la relación.
      const raw = Array.isArray(rest.tecnicoIds)
        ? rest.tecnicoIds
        : (Number.isInteger(rest.tecnicoId) ? [rest.tecnicoId] : []);
      const ids = [...new Set(raw.map(v => Number(v)).filter(Number.isInteger))];
      rest.tecnicoIds = ids;
      rest.tecnicoId = ids.length ? ids[0] : null;
    }

    if (isUpdate) {
      const updated = await prisma[model].update({ where: { id }, data: rest });
      return res.json(updated);
    }

    const created = await prisma[model].create({ data: rest });
    res.json(created);
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un registro con ese valor único (por ejemplo, un número de orden repetido).' });
    }
    next(err);
  }
});

app.delete('/api/:collection/:id', async (req, res, next) => {
  try {
    const model = collectionMap[req.params.collection];
    if (!model) return res.status(400).json({ error: 'Invalid collection' });
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

    // Chequeo de permiso para borrar.
    const perms = COLLECTION_PERMS[req.params.collection];
    if (perms && !hasPermission(req.user?.role, perms.delete)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este registro.' });
    }

    await prisma[model].delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    if (err?.code === 'P2003') return res.status(409).json({ error: IN_USE_MESSAGE });
    next(err);
  }
});

app.use((err, req, res, _next) => {
  // Errores de multer (tamaño excedido, fileFilter rechazado, etc.) son
  // problemas del cliente — devolver 400 con el mensaje, no 500.
  if (err?.name === 'MulterError' || err?.message?.startsWith?.('Formato no permitido')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[api error]', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

// Backfill idempotente: para órdenes que ya existían antes del campo `tecnicoIds`,
// copia el técnico actual a la lista. Solo toca filas con la lista vacía y un
// tecnicoId puesto, así que correr esto en cada arranque no hace daño.
async function backfillTecnicoIds() {
  try {
    const n = await prisma.$executeRawUnsafe(
      `UPDATE "Orden" SET "tecnicoIds" = ARRAY["tecnicoId"]
         WHERE "tecnicoId" IS NOT NULL AND COALESCE(array_length("tecnicoIds", 1), 0) = 0`
    );
    if (n) console.log(`[api] backfill tecnicoIds: ${n} órdenes actualizadas`);
  } catch (err) {
    console.error('[api] backfill tecnicoIds falló (se ignora):', err.message);
  }
}

const port = process.env.PORT || 3000;

// Boot orquestado: corre los backfills/seeds idempotentes en serie ANTES
// de aceptar requests (excepto el listen, que arranca igual). Si alguno
// falla queda logueado pero no bloquea el API.
async function bootInit() {
  await backfillTecnicoIds();
  await seedDefaultSequences().catch(err => console.error('[api] seedDefaultSequences:', err.message));
  await backfillReferenciaExterna();
}

bootInit().finally(() => {
  app.listen(port, () => console.log(`[api] listening on :${port}`));
});
