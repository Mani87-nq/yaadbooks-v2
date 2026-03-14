/**
 * Prisma client singleton — prevents multiple instances in development.
 * In production, a single instance is used.
 * In development, hot-reload would create new instances, so we cache on `globalThis`.
 *
 * Prisma 7 uses the "client" engine by default and requires a driver adapter.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// ─── GLOBAL FIX: Prisma Decimal → number in JSON ────────────────
// Prisma Decimal fields (from decimal.js) serialize as STRINGS by default.
// This causes "12000" + "27600" = "1200027600" in client-side JS.
// Override toJSON so JSON.stringify outputs actual numbers.
// This MUST run before any API response is created.
if (typeof Prisma?.Decimal?.prototype?.toJSON === 'function' || Prisma?.Decimal?.prototype) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Prisma.Decimal.prototype as any).toJSON = function () {
    return Number(this);
  };
}

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/yaadbooks';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({ connectionString });
  // Type assertion needed: @prisma/adapter-pg bundles its own @types/pg
  // which can conflict with the top-level @types/pg version
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
