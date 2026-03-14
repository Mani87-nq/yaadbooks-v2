/**
 * GET  /api/v1/warehouses — List warehouses
 * POST /api/v1/warehouses — Create a warehouse
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
    const isActive = searchParams.get('isActive');

    const warehouses = await prisma.warehouse.findMany({
      where: {
        companyId: companyId!,
        ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
      },
      include: {
        _count: { select: { outgoingTransfers: true, incomingTransfers: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: warehouses });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list warehouses');
  }
}

const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20).transform((v) => v.toUpperCase()),
  address: z.string().max(500).optional(),
  parish: z.string().optional(),
  phone: z.string().max(30).optional(),
  email: z.email().optional(),
  manager: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'inventory:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createWarehouseSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    // Check code uniqueness
    const existing = await prisma.warehouse.findUnique({
      where: { companyId_code: { companyId: companyId!, code: parsed.data.code } },
    });
    if (existing) return badRequest(`Warehouse code "${parsed.data.code}" already exists.`);

    const warehouse = await prisma.$transaction(async (tx) => {
      // If setting as default, unset others
      if (parsed.data.isDefault) {
        await tx.warehouse.updateMany({
          where: { companyId: companyId!, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.warehouse.create({
        data: {
          companyId: companyId!,
          name: parsed.data.name,
          code: parsed.data.code,
          address: parsed.data.address ?? null,
          parish: parsed.data.parish as any ?? null,
          phone: parsed.data.phone ?? null,
          email: parsed.data.email ?? null,
          manager: parsed.data.manager ?? null,
          isDefault: parsed.data.isDefault ?? false,
        },
      });
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create warehouse');
  }
}

// Tier-protected exports: Requires 'inventory' feature (Starter+)
export const GET = withFeatureCheck('inventory', _GET);
export const POST = withFeatureCheck('inventory', _POST);
