/**
 * Module Access Guards for API Routes
 *
 * Provides utilities for protecting API routes based on module access.
 * Use these in your route handlers to enforce module-based access control.
 *
 * @module modules/api-guard
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type AccessTokenPayload } from '@/lib/auth/jwt';
import prisma from '@/lib/db';
import {
  canAccessModule,
  needsModuleSelection,
  type IndustryModule,
} from './module-access';

// =============================================================================
// TYPES
// =============================================================================

export interface ModuleAccessResult {
  allowed: boolean;
  user?: AccessTokenPayload;
  companyId?: string;
  tier?: string;
  selectedModule?: string | null;
  error?: {
    status: number;
    type: string;
    title: string;
    detail: string;
  };
}

// =============================================================================
// MAIN GUARD FUNCTION
// =============================================================================

/**
 * Checks if the authenticated user has access to a specific module.
 *
 * Usage in API route:
 * ```ts
 * const result = await checkModuleAccess(request, 'salon');
 * if (!result.allowed) {
 *   return NextResponse.json(result.error, { status: result.error.status });
 * }
 * // Proceed with route logic...
 * const { user, companyId, tier, selectedModule } = result;
 * ```
 *
 * @param request - The incoming request
 * @param requiredModule - The module required for this route
 * @returns ModuleAccessResult with user info if allowed, or error details if not
 */
export async function checkModuleAccess(
  request: NextRequest,
  requiredModule: IndustryModule
): Promise<ModuleAccessResult> {
  // 1. Authenticate
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get('accessToken')?.value;

  if (!token) {
    return {
      allowed: false,
      error: {
        status: 401,
        type: 'unauthorized',
        title: 'Authentication required',
        detail: 'Please log in to access this resource.',
      },
    };
  }

  let user: AccessTokenPayload;
  try {
    user = await verifyAccessToken(token);
  } catch {
    return {
      allowed: false,
      error: {
        status: 401,
        type: 'unauthorized',
        title: 'Invalid token',
        detail: 'Your session has expired. Please log in again.',
      },
    };
  }

  const { activeCompanyId } = user;

  if (!activeCompanyId) {
    return {
      allowed: false,
      error: {
        status: 400,
        type: 'bad_request',
        title: 'No active company',
        detail: 'Please select a company to continue.',
      },
    };
  }

  // 2. Get company subscription info
  const company = await prisma.company.findUnique({
    where: { id: activeCompanyId },
    select: {
      id: true,
      subscriptionPlan: true,
      selectedModule: true,
    },
  });

  if (!company) {
    return {
      allowed: false,
      error: {
        status: 404,
        type: 'not_found',
        title: 'Company not found',
        detail: 'The company could not be found.',
      },
    };
  }

  const tier = (company.subscriptionPlan || 'FREE').toLowerCase();
  const selectedModule = company.selectedModule?.toLowerCase() || null;

  // 3. Check if user needs to select a module first
  if (needsModuleSelection(tier, selectedModule)) {
    return {
      allowed: false,
      user,
      companyId: company.id,
      tier,
      selectedModule,
      error: {
        status: 403,
        type: 'module_selection_required',
        title: 'Module selection required',
        detail: 'Please select your industry module before accessing this feature.',
      },
    };
  }

  // 4. Check module access
  if (!canAccessModule(tier, selectedModule, requiredModule)) {
    // Determine the reason for denial
    if (tier === 'free' || tier === 'starter') {
      return {
        allowed: false,
        user,
        companyId: company.id,
        tier,
        selectedModule,
        error: {
          status: 403,
          type: 'upgrade_required',
          title: 'Upgrade required',
          detail: 'Upgrade to Professional tier or higher to access industry modules.',
        },
      };
    }

    // User has a different module selected
    return {
      allowed: false,
      user,
      companyId: company.id,
      tier,
      selectedModule,
      error: {
        status: 403,
        type: 'wrong_module',
        title: 'Module not available',
        detail: `This feature requires the ${requiredModule} module. Upgrade to Enterprise for access to all modules.`,
      },
    };
  }

  // 5. Access granted
  return {
    allowed: true,
    user,
    companyId: company.id,
    tier,
    selectedModule,
  };
}

// =============================================================================
// CONVENIENCE WRAPPER
// =============================================================================

/**
 * Higher-order function that wraps a route handler with module access check.
 *
 * Usage:
 * ```ts
 * export const GET = withModuleAccess('salon', async (request, { user, companyId }) => {
 *   // Route logic here...
 *   return NextResponse.json({ data: '...' });
 * });
 * ```
 */
export function withModuleAccess(
  requiredModule: IndustryModule,
  handler: (
    request: NextRequest,
    context: {
      user: AccessTokenPayload;
      companyId: string;
      tier: string;
      selectedModule: string | null;
    }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await checkModuleAccess(request, requiredModule);

    if (!result.allowed) {
      return NextResponse.json(result.error, { status: result.error!.status });
    }

    return handler(request, {
      user: result.user!,
      companyId: result.companyId!,
      tier: result.tier!,
      selectedModule: result.selectedModule ?? null,
    });
  };
}

// =============================================================================
// ERROR RESPONSE HELPERS
// =============================================================================

/**
 * Creates a standard module access error response.
 */
export function moduleAccessError(
  type: 'unauthorized' | 'upgrade_required' | 'wrong_module' | 'module_selection_required',
  detail?: string
): NextResponse {
  const errors = {
    unauthorized: {
      status: 401,
      title: 'Authentication required',
      detail: detail || 'Please log in to access this resource.',
    },
    upgrade_required: {
      status: 403,
      title: 'Upgrade required',
      detail: detail || 'Upgrade to Professional tier or higher to access industry modules.',
    },
    wrong_module: {
      status: 403,
      title: 'Module not available',
      detail: detail || 'This feature is not available with your current module. Upgrade to Enterprise for all modules.',
    },
    module_selection_required: {
      status: 403,
      title: 'Module selection required',
      detail: detail || 'Please select your industry module before accessing this feature.',
    },
  };

  const error = errors[type];
  return NextResponse.json(
    { type, ...error },
    { status: error.status }
  );
}
