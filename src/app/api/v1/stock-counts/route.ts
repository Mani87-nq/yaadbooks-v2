/**
 * GET  /api/v1/stock-counts — List stock counts (paginated, company-scoped)
 * POST /api/v1/stock-counts — Create a new stock count
 *
 * TIER PROTECTED: Requires 'inventory' feature (Starter+)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { withFeatureCheck } from '@/lib/tier';

async function _GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'inventory:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);

    const statusParam = searchParams.get('status');
    const validStatuses = ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'POSTED', 'CANCELLED'] as const;
    const status = statusParam && validStatuses.includes(statusParam as any) ? statusParam : undefined;
    if (statusParam && !status) {
      return badRequest('Invalid stock count status');
    }

    const typeParam = searchParams.get('type');
    const validTypes = ['FULL', 'CYCLE', 'SPOT', 'ANNUAL'] as const;
    const type = typeParam && validTypes.includes(typeParam as any) ? typeParam : undefined;
    if (typeParam && !type) {
      return badRequest('Invalid stock count type');
    }

    const warehouseId = searchParams.get('warehouseId') ?? undefined;

    const where = {
      companyId: companyId!,
      ...(status ? { status: status as any } : {}),
      ...(type ? { type: type as any } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    };

    const stockCounts = await prisma.stockCount.findMany({
      where,
      include: {
        _count: { select: { items: true } },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = stockCounts.length > limit;
    const data = hasMore ? stockCounts.slice(0, limit) : stockCounts;

    return NextResponse.json({
      data,
      pagination: { nextCursor: hasMore ? data[data.length - 1].id : null, hasMore, limit },
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list stock counts');
  }
}

const createStockCountSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['FULL', 'CYCLE', 'SPOT', 'ANNUAL']).default('FULL'),
  scheduledDate: z.coerce.date(),
  warehouseId: z.string().optional(),
  warehouseName: z.string().max(200).optional(),
  categoryIds: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'inventory:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createStockCountSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const countNumber = await generateCountNumber(companyId!);

    const stockCount = await prisma.stockCount.create({
      data: {
        ...parsed.data,
        countNumber,
        companyId: companyId!,
        warehouseId: parsed.data.warehouseId || null,
        warehouseName: parsed.data.warehouseName || null,
      },
      include: { items: true },
    });

    return NextResponse.json(stockCount, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create stock count');
  }
}

// Tier-protected exports: Requires 'inventory' feature (Starter+)
export const GET = withFeatureCheck('inventory', _GET);
export const POST = withFeatureCheck('inventory', _POST);

async function generateCountNumber(_companyId: string): Promise<string> {
  return `SC-${Date.now().toString(36).toUpperCase()}`;
}
