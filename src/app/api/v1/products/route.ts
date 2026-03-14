/**
 * GET  /api/v1/products — List products (paginated, company-scoped)
 * POST /api/v1/products — Create a new product
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
    const { user, error: authError } = await requirePermission(request, 'products:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const search = searchParams.get('search') ?? undefined;
    const category = searchParams.get('category') ?? undefined;

    const where = {
      companyId: companyId!,
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          { barcode: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
      ...(category ? { category } : {}),
    };

    const products = await prisma.product.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
    });

    const hasMore = products.length > limit;
    const data = hasMore ? products.slice(0, limit) : products;

    return NextResponse.json({
      data,
      pagination: { nextCursor: hasMore ? data[data.length - 1].id : null, hasMore, limit },
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list products');
  }
}

const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0),
  quantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(0),
  unit: z.enum(['EACH', 'BOX', 'CASE', 'DOZEN', 'KG', 'LB', 'LITRE', 'GALLON', 'METRE', 'FOOT', 'HOUR', 'DAY']).default('EACH'),
  taxable: z.boolean().default(true),
  gctRate: z.enum(['STANDARD', 'TELECOM', 'TOURISM', 'ZERO_RATED', 'EXEMPT']).default('STANDARD'),
  barcode: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'products:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const product = await prisma.product.create({
      data: { ...parsed.data, companyId: companyId!, createdBy: user!.sub },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create product');
  }
}

// Tier-protected exports: Requires 'inventory' feature (Starter+)
export const GET = withFeatureCheck('inventory', _GET);
export const POST = withFeatureCheck('inventory', _POST);
