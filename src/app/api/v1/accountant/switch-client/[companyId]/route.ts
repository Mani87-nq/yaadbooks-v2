/**
 * POST /api/v1/accountant/switch-client/[companyId]
 * Switch the accountant's active company context to a client's books.
 * 
 * This:
 * 1. Verifies the accountant has access to this company
 * 2. Issues a new access token with the updated activeCompanyId
 * 3. Returns the new token for client-side session update
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { signAccessToken } from '@/lib/auth/jwt';
import { notFound, forbidden, internalError } from '@/lib/api-error';

type RouteContext = { params: Promise<{ companyId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { companyId } = await context.params;
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can switch client context');
    }

    // Verify accountant has active access to this company
    const clientRelationship = await prisma.accountantClient.findFirst({
      where: {
        accountantId: user!.sub,
        companyId,
        status: 'ACTIVE',
      },
      include: {
        company: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (!clientRelationship) {
      return notFound('You do not have access to this company');
    }

    // Get all company IDs this accountant can access
    const allClientCompanies = await prisma.accountantClient.findMany({
      where: {
        accountantId: user!.sub,
        status: 'ACTIVE',
      },
      select: { companyId: true },
    });

    // Also include any companies where user is a direct member
    const directMemberships = await prisma.companyMember.findMany({
      where: { userId: user!.sub },
      select: { companyId: true },
    });

    const allCompanyIds = [
      ...new Set([
        ...allClientCompanies.map(c => c.companyId),
        ...directMemberships.map(m => m.companyId),
      ]),
    ];

    // Issue new access token with updated context
    const newAccessToken = await signAccessToken({
      sub: user!.sub,
      email: user!.email,
      role: user!.role,
      activeCompanyId: companyId,
      companies: allCompanyIds,
    });

    return NextResponse.json({
      data: {
        accessToken: newAccessToken,
        activeCompany: {
          id: clientRelationship.company.id,
          businessName: clientRelationship.company.businessName,
        },
      },
      message: `Switched to ${clientRelationship.company.businessName}`,
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to switch client');
  }
}
