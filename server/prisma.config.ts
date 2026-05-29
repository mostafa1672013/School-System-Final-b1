import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 moved the connection URL out of schema.prisma.
// The CLI (migrate / db / studio) reads it from here; the runtime
// PrismaClient gets it via the pg driver adapter (see src/lib/prisma.ts).
//
// We read process.env directly rather than prisma/config's `env()` helper:
// `env()` throws if the variable is missing, which breaks `prisma generate`
// at Docker build time (no DB connection is needed to generate the client).
// A missing URL only matters for commands that actually connect (migrate/studio).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
