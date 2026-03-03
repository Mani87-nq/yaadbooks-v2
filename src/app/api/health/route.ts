/**
 * GET /api/health
 *
 * Health check endpoint for container orchestration (Docker HEALTHCHECK, Coolify).
 * Tests database connectivity and returns application status.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        detail: 'Database connection failed',
      },
      { status: 503 }
    );
  }
}
