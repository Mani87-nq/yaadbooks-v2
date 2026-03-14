/**
 * GET  /api/v1/accountant/clients — List all clients this accountant manages
 * POST /api/v1/accountant/clients — Invite a new client (by email)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { badRequest, forbidden, internalError } from '@/lib/api-error';

// ---- GET (List Clients) ----

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    // User must have ACCOUNTANT role or higher (ADMIN/OWNER)
    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can access this endpoint');
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const status = searchParams.get('status') as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | undefined;

    const where = {
      accountantId: user!.sub,
      ...(status ? { status } : {}),
    };

    const clients = await prisma.accountantClient.findMany({
      where,
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
            createdAt: true,
          },
        },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = clients.length > limit;
    const data = hasMore ? clients.slice(0, limit) : clients;

    return NextResponse.json({
      data,
      pagination: { nextCursor: hasMore ? data[data.length - 1].id : null, hasMore, limit },
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list clients');
  }
}

// ---- POST (Invite Client) ----

const inviteClientSchema = z.object({
  email: z.email('Invalid email address'),
  notes: z.string().max(500).optional(),
  canAccessPayroll: z.boolean().default(true),
  canAccessBanking: z.boolean().default(true),
  canExportData: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can invite clients');
    }

    const body = await request.json();
    const validation = inviteClientSchema.safeParse(body);
    if (!validation.success) {
      return badRequest('Validation failed', { validation: [validation.error.message] });
    }

    const { email, notes, canAccessPayroll, canAccessBanking, canExportData } = validation.data;

    // Find the company by owner email
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { email: email },
          { owner: { email: email } },
        ],
      },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!company) {
      return badRequest('No company found with this email. The business must have a YaadBooks account first.');
    }

    // Check if relationship already exists
    const existing = await prisma.accountantClient.findUnique({
      where: {
        accountantId_companyId: {
          accountantId: user!.sub,
          companyId: company.id,
        },
      },
    });

    if (existing) {
      return badRequest('You already have a relationship with this client');
    }

    // Create the accountant-client relationship
    const accountantClient = await prisma.accountantClient.create({
      data: {
        accountantId: user!.sub,
        companyId: company.id,
        invitedEmail: email,
        status: 'PENDING',
        notes,
        canAccessPayroll,
        canAccessBanking,
        canExportData,
      },
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

    // TODO: Send invitation email to company owner
    // await sendAccountantInvitationEmail(company.owner.email, user!.email);

    return NextResponse.json({ data: accountantClient }, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to invite client');
  }
}
