import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let migrationAttempted = false;
async function ensureColumns() {
  if (migrationAttempted) return;
  migrationAttempted = true;
  try {
    const invCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info(inventories);');
    const colNames = Array.isArray(invCols) ? invCols.map((c) => c.name) : [];
    if (!colNames.includes('notes')) {
      await prisma.$executeRawUnsafe('ALTER TABLE inventories ADD COLUMN notes TEXT;');
    }
    if (!colNames.includes('price')) {
      await prisma.$executeRawUnsafe('ALTER TABLE inventories ADD COLUMN price REAL;');
    }
  } catch {}

  try {
    const logCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info(logistics);');
    const colNames = Array.isArray(logCols) ? logCols.map((c) => c.name) : [];
    if (!colNames.includes('notes')) {
      await prisma.$executeRawUnsafe('ALTER TABLE logistics ADD COLUMN notes TEXT;');
    }
    if (!colNames.includes('price')) {
      await prisma.$executeRawUnsafe('ALTER TABLE logistics ADD COLUMN price REAL;');
    }
  } catch {}
}

ensureColumns().catch(() => {});

