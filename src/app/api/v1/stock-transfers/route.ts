/**
 * GET  /api/v1/stock-transfers — List transfers (paginated, filterable)
 * POST /api/v1/stock-transfers — Create a new stock transfer
 *
 * TIER PROTECTED: Requires 'inventory' feature (Starter+)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { withFeatureCheck } from '@/lib/tier';

const VALID_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;

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
    const status = statusParam && VALID_STATUSES.includes(statusParam as any) ? statusParam : undefined;
    const warehouseId = searchParams.get('warehouseId') ?? undefined;

    const where = {
      companyId: companyId!,
      ...(status ? { status: status as any } : {}),
      ...(warehouseId
        ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] }
        : {}),
    };

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
        _count: { select: { items: true } },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = transfers.length > limit;
    const data = hasMore ? transfers.slice(0, limit) : transfers;

    return NextResponse.json({
      data,
      pagination: { nextCursor: hasMore ? data[data.length - 1].id : null, hasMore, limit },
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list stock transfers');
  }
}

const itemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  sku: z.string().min(1),
  quantityRequested: z.number().positive(),
  unitCost: z.number().min(0),
  uomCode: z.string().default('EA'),
  notes: z.string().optional(),
});

const createTransferSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  items: z.array(itemSchema).min(1).max(200),
  notes: z.string().max(1000).optional(),
  status: z.enum(['DRAFT', 'PENDING']).default('DRAFT'),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'inventory:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createTransferSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    if (parsed.data.fromWarehouseId === parsed.data.toWarehouseId) {
      return badRequest('Source and destination warehouses must be different.');
    }

    // Verify both warehouses belong to this company
    const [fromWh, toWh] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: parsed.data.fromWarehouseId, companyId: companyId!, isActive: true } }),
      prisma.warehouse.findFirst({ where: { id: parsed.data.toWarehouseId, companyId: companyId!, isActive: true } }),
    ]);
    if (!fromWh) return badRequest('Source warehouse not found or inactive.');
    if (!toWh) return badRequest('Destination warehouse not found or inactive.');

    // Generate transfer number
    const now = new Date();
    const prefix = `TRF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastTransfer = await prisma.stockTransfer.findFirst({
      where: { companyId: companyId!, transferNumber: { startsWith: prefix } },
      orderBy: { transferNumber: 'desc' },
      select: { transferNumber: true },
    });
    const seq = lastTransfer
      ? parseInt(lastTransfer.transferNumber.slice(-4)) + 1
      : 1;
    const transferNumber = `${prefix}-${String(seq).padStart(4, '0')}`;

    // Calculate totals
    let totalQuantity = 0;
    let totalValue = 0;
    for (const item of parsed.data.items) {
      totalQuantity += item.quantityRequested;
      totalValue += item.quantityRequested * item.unitCost;
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        companyId: companyId!,
        transferNumber,
        fromWarehouseId: parsed.data.fromWarehouseId,
        toWarehouseId: parsed.data.toWarehouseId,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
        requestedBy: user!.sub,
        totalItems: parsed.data.items.length,
        totalQuantity,
        totalValue,
        items: {
          create: parsed.data.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantityRequested: item.quantityRequested,
            unitCost: item.unitCost,
            uomCode: item.uomCode ?? 'EA',
            notes: item.notes ?? null,
          })),
        },
      },
      include: {
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
        items: true,
      },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create stock transfer');
  }
}

// Tier-protected exports: Requires 'inventory' feature (Starter+)
export const GET = withFeatureCheck('inventory', _GET);
export const POST = withFeatureCheck('inventory', _POST);
