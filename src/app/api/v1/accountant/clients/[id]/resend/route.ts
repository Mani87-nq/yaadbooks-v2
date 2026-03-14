/**
 * POST /api/v1/accountant/clients/[id]/resend — Resend invitation email
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { notFound, forbidden, badRequest, internalError } from '@/lib/api-error';
import { resendInvitation } from '@/lib/accountant/invitation-service';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can resend invitations');
    }

    const result = await resendInvitation(id, user!.sub);

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return notFound(result.error);
      }
      return badRequest(result.error || 'Failed to resend invitation');
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      data: result.invitation,
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to resend invitation');
  }
}
