/**
 * Centralized Prisma client.
 *
 * Why: Previously every route file did `new PrismaClient()` — that created
 * 18+ separate connection pools, each opening its own connections to
 * Postgres. On a small VPS this exhausts max_connections fast and wastes
 * memory. One shared instance + one pool is the standard pattern.
 *
 * Cite: performance plan section 1.3
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Avoid creating new clients during hot-reload in dev.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Prisma 7 requires a driver adapter; the connection string is no longer
// read from schema.prisma. One pool, shared across the app (see note above).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown — close the pool when the process exits.
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
