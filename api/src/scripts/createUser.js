import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const [, , emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error('Usage: node src/scripts/createUser.js <email> <password>');
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
const password = passwordArg;

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });

  console.log(`✓ User saved: ${user.email} (id ${user.id})`);
} catch (err) {
  console.error('✗ Error:', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
