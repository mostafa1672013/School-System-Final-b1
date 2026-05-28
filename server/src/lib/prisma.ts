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

// Avoid creating new clients during hot-reload in dev.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
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
