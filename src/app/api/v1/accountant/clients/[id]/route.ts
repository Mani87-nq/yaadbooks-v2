/**
 * GET    /api/v1/accountant/clients/[id] — Get client details
 * PUT    /api/v1/accountant/clients/[id] — Update client settings
 * DELETE /api/v1/accountant/clients/[id] — Remove client access
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { notFound, forbidden, badRequest, internalError } from '@/lib/api-error';

type RouteContext = { params: Promise<{ id: string }> };

// ---- GET ----

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can access this endpoint');
    }

    const client = await prisma.accountantClient.findFirst({
      where: { id, accountantId: user!.sub },
      include: {
        company: {
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
            trnNumber: true,
            gctNumber: true,
            industry: true,
            fiscalYearEnd: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      return notFound('Client relationship not found');
    }

    return NextResponse.json({ data: client });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to get client');
  }
}

// ---- PUT (Update) ----

const updateClientSchema = z.object({
  notes: z.string().max(500).optional(),
  canAccessPayroll: z.boolean().optional(),
  canAccessBanking: z.boolean().optional(),
  canExportData: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can update client settings');
    }

    const existing = await prisma.accountantClient.findFirst({
      where: { id, accountantId: user!.sub },
    });

    if (!existing) {
      return notFound('Client relationship not found');
    }

    const body = await request.json();
    const validation = updateClientSchema.safeParse(body);
    if (!validation.success) {
      return badRequest('Validation failed', { validation: [validation.error.message] });
    }

    const updated = await prisma.accountantClient.update({
      where: { id },
      data: validation.data,
      include: {
        company: {
          select: {
            id: true,
            businessName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to update client');
  }
}

// ---- DELETE ----

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can remove clients');
    }

    const existing = await prisma.accountantClient.findFirst({
      where: { id, accountantId: user!.sub },
    });

    if (!existing) {
      return notFound('Client relationship not found');
    }

    // Soft revoke rather than hard delete for audit trail
    await prisma.accountantClient.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    return NextResponse.json({ success: true, message: 'Client access revoked' });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to remove client');
  }
}
