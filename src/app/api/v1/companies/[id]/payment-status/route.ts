/**
 * GET /api/v1/companies/[id]/payment-status
 * 
 * Returns payment failure status for the PaymentWarningBanner component.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract and verify access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!payload?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user has access to this company
    const membership = await prisma.companyMember.findFirst({
      where: {
        id,
        userId: payload.sub,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: id },
      select: {
        paymentFailedAt: true,
        gracePeriodNotified: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      paymentFailedAt: company.paymentFailedAt?.toISOString() || null,
      gracePeriodNotified: company.gracePeriodNotified,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionPlan: company.subscriptionPlan,
    });
  } catch (error) {
    console.error('[PaymentStatus] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
