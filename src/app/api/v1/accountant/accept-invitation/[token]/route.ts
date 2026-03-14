/**
 * GET  /api/v1/accountant/accept-invitation/[token] — Validate invitation token
 * POST /api/v1/accountant/accept-invitation/[token] — Accept the invitation
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/auth/middleware';
import { badRequest, unauthorized, internalError } from '@/lib/api-error';
import {
  validateInvitationToken,
  acceptInvitation,
} from '@/lib/accountant/invitation-service';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// ---- GET (Validate Token) ----
// This can be called without auth to show invitation details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return badRequest('Token is required');
    }

    const result = await validateInvitationToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 400 }
      );
    }

    const { invitation } = result;

    return NextResponse.json({
      data: {
        accountantName: `${invitation!.accountant.firstName} ${invitation!.accountant.lastName}`.trim(),
        accountantEmail: invitation!.accountant.email,
        companyName: invitation!.company.businessName,
        permissions: {
          canAccessPayroll: true, // Will need to fetch from DB
          canAccessBanking: true,
          canExportData: true,
        },
      },
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Validation failed');
  }
}

// ---- POST (Accept Invitation) ----
// Requires authentication
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return badRequest('Token is required');
    }

    // Require auth - user must be logged in to accept
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const result = await acceptInvitation(token, user!.sub);

    if (!result.success) {
      return badRequest(result.error || 'Failed to accept invitation');
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to accept invitation');
  }
}
