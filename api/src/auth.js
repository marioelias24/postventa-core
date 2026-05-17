import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { hasPermission, isValidRole } from './permissions.js';

const prisma = new PrismaClient();

const SECRET = process.env.AUTH_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error('AUTH_SECRET env var is required (min 32 chars). Generate with: openssl rand -hex 32');
}

const COOKIE_NAME = 'pv_session';
const TTL_DAYS = 7;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: `${TTL_DAYS}d` });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  // Solo marca la cookie como `secure` si AUTH_COOKIE_SECURE=true.
  // En HTTP plano debe ser false o el navegador rechaza la cookie.
  // Cuando agregues HTTPS (Fase 3), cambia esto a true en el .env del server.
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.AUTH_COOKIE_SECURE === 'true',
    maxAge: TTL_SECONDS * 1000,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  setSessionCookie(res, signToken({ sub: user.id, email: user.email }));
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
}

export function logout(req, res) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

export async function me(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  res.json({ user: { id: user.id, email: user.email, role: user.role } });
}

// Middleware: rechaza con 401 si la cookie es inválida o falta. Hace una
// query fresca a User para que el rol esté actualizado (importante: si un
// admin baja el rol de otro usuario, el cambio aplica inmediatamente sin
// esperar a que expire la cookie). Sobrecoste: 1 query extra por request.
// Excluye /api/auth/* y /api/health.
export async function requireAuth(req, res, next) {
  if (req.path.startsWith('/api/auth/') || req.path === '/api/health') return next();

  const token = req.cookies?.[COOKIE_NAME];
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Not authenticated' });
    }
    req.user = { ...payload, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

// Middleware factory: rechaza con 403 si el rol del usuario no tiene el permiso
// pedido. Usar después de requireAuth. Ej.: app.delete(..., requirePermission('orden:delete'), handler).
export function requirePermission(action) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ error: 'Not authenticated' });
    if (!hasPermission(req.user.role, action)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    }
    next();
  };
}

// Cambia el rol de un usuario. Solo admin. Guardrail "último admin": no se
// puede cambiar el rol del único admin restante (quedaría nadie con gestión).
export async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id requerido' });
  if (!isValidRole(role)) return res.status(400).json({ error: 'Rol inválido' });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (target.role === 'admin' && role !== 'admin') {
    const adminsRestantes = await prisma.user.count({ where: { role: 'admin' } });
    if (adminsRestantes <= 1) {
      return res.status(409).json({
        error: 'No se puede cambiar el rol: este es el único administrador. Asigna el rol "Administrador" a otro usuario antes de bajar el rol de este.',
      });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  res.json({ user });
}

// Cambio de contraseña por el propio usuario. Pide la actual para verificar y
// la nueva (mínimo 8 chars). No requiere rol admin — cada uno cambia la suya.
export async function changePassword(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword y newPassword son obligatorios' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ ok: true });
}

// Listado de usuarios. Devuelve solo campos públicos (nunca passwordHash).
export async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ users });
}

// Crear un usuario nuevo. Solo admin. Email único, password mínimo 8 chars.
// Rol opcional (default 'tecnico' — el más restrictivo para alta nueva).
export async function createUser(req, res) {
  const { email, password, role = 'tecnico' } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  if (!isValidRole(role)) return res.status(400).json({ error: 'Rol inválido' });

  const normalized = String(email).toLowerCase().trim();
  if (!normalized.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: normalized, passwordHash, role },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  res.status(201).json({ user });
}

// Eliminar un usuario. Solo admin. Dos guardrails:
//  - No se puede borrar al último usuario del sistema (queda sin acceso).
//  - No se puede borrar al último admin (igual: queda sin gestión).
// Si el caller se borra a sí mismo, además limpia la cookie de sesión para
// forzar logout en el frontend.
export async function deleteUser(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id requerido' });

  const total = await prisma.user.count();
  if (total <= 1) {
    return res.status(409).json({
      error: 'No se puede eliminar al último usuario del sistema.',
    });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (target.role === 'admin') {
    const admins = await prisma.user.count({ where: { role: 'admin' } });
    if (admins <= 1) {
      return res.status(409).json({
        error: 'No se puede eliminar: es el único administrador del sistema.',
      });
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    throw err;
  }

  // Si el caller se borró a sí mismo, invalidar la sesión.
  if (req.user?.sub === id) clearSessionCookie(res);

  res.status(204).end();
}

// Reset de contraseña ajena (sin pedir la actual). En Fase 2 cualquier
// autenticado puede hacerlo; en Fase 3 se restringe a perfiles admin.
export async function resetUserPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id requerido' });
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  res.json({ ok: true });
}
