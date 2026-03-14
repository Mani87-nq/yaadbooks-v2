/**
 * GET /api/v1/accountant/context
 * Returns the current accountant view context.
 * Used by the UI to check if user is in accountant mode.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getAccountantViewContext } from '@/lib/auth/accountant-access';
import { internalError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const context = await getAccountantViewContext(
      user!.sub,
      user!.role,
      user!.activeCompanyId
    );

    return NextResponse.json({ data: context });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to get accountant context');
  }
}
