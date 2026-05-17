import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const prisma = new PrismaClient();

// Directorio de uploads. En contenedor: /app/uploads (volumen Docker).
// En dev local sin contenedor: ./uploads relativo al cwd de la API.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('uploads');

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Multer (upload de logo) ----------

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Sufijo único para evitar colisiones; extensión derivada del mimetype.
    const ext = ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg' })[file.mimetype];
    cb(null, `logo-${Date.now()}${ext || ''}`);
  },
});

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error('Formato no permitido. Usa PNG, JPG, WEBP o SVG.'));
    cb(null, true);
  },
}).single('logo');

// ---------- Helpers ----------

// Devuelve la fila singleton; la crea si no existe (id fijo = 1).
// El nombre por defecto en la creación viene del env del deployment para no
// hardcodear empresas específicas en el core.
async function getOrCreateEmpresa() {
  const existing = await prisma.empresa.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.empresa.create({
    data: {
      id: 1,
      nombre: process.env.BRAND_DEFAULT_NAME || 'Post Venta',
    },
  });
}

// ---------- Handlers ----------

export async function getEmpresa(_req, res, next) {
  try {
    const empresa = await getOrCreateEmpresa();
    res.json({ empresa });
  } catch (err) { next(err); }
}

export async function updateEmpresa(req, res, next) {
  try {
    const { nombre, ruc, telefono, email, direccion } = req.body || {};
    const data = {};
    if (nombre !== undefined) data.nombre = String(nombre || '').trim();
    if (ruc !== undefined) data.ruc = ruc ? String(ruc).trim() : null;
    if (telefono !== undefined) data.telefono = telefono ? String(telefono).trim() : null;
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (direccion !== undefined) data.direccion = direccion ? String(direccion).trim() : null;

    if (data.nombre === '') {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
    }

    await getOrCreateEmpresa();
    const empresa = await prisma.empresa.update({ where: { id: 1 }, data });
    res.json({ empresa });
  } catch (err) { next(err); }
}

export async function uploadEmpresaLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo (campo `logo`).' });

    await getOrCreateEmpresa();
    const previous = await prisma.empresa.findUnique({ where: { id: 1 } });

    const empresa = await prisma.empresa.update({
      where: { id: 1 },
      data: { logoFile: req.file.filename },
    });

    // Borra el logo anterior si era distinto (mejor effort, no falla la request).
    if (previous?.logoFile && previous.logoFile !== req.file.filename) {
      const oldPath = path.join(UPLOAD_DIR, previous.logoFile);
      fs.unlink(oldPath).catch(() => {});
    }

    res.json({ empresa });
  } catch (err) { next(err); }
}

export async function deleteEmpresaLogo(_req, res, next) {
  try {
    const previous = await prisma.empresa.findUnique({ where: { id: 1 } });
    if (previous?.logoFile) {
      const oldPath = path.join(UPLOAD_DIR, previous.logoFile);
      fs.unlink(oldPath).catch(() => {});
    }
    const empresa = await prisma.empresa.update({ where: { id: 1 }, data: { logoFile: null } });
    res.json({ empresa });
  } catch (err) { next(err); }
}
