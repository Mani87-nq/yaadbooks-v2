/**
 * Prisma client singleton — prevents multiple instances in development.
 * In production, a single instance is used.
 * In development, hot-reload would create new instances, so we cache on `globalThis`.
 *
 * Prisma 7 uses the "client" engine by default and requires a driver adapter.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/yaadbooks';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({ connectionString });
  // Type cast to satisfy @prisma/adapter-pg's bundled @types/pg
  // which may differ from the root @types/pg version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
