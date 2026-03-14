/**
 * Tier-based API Route Protection Middleware
 *
 * Wraps API route handlers with subscription tier checks.
 * Blocks access and logs attempts when the user's tier doesn't
 * have access to the requested feature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { hasFeatureAccess, normalizeTier, getRequiredTier, type Feature, type PlanTier } from './feature-matrix';

// ─── Types ────────────────────────────────────────────────────────

export type ApiHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export interface TierBlockedLog {
  timestamp: string;
  userId: string | null;
  companyId: string | null;
  endpoint: string;
  method: string;
  feature: Feature;
  userTier: PlanTier;
  requiredTier: PlanTier;
  ip: string | null;
  userAgent: string | null;
}

// ─── Logging ──────────────────────────────────────────────────────

/**
 * Log tier-blocked attempts for analytics and security monitoring.
 * In production, this would write to a proper logging service.
 */
async function logBlockedAttempt(log: TierBlockedLog): Promise<void> {
  // Console log for development/debugging
  console.warn('[TIER_BLOCKED]', JSON.stringify(log));

  // In production, persist to database for analytics
  if (process.env.NODE_ENV === 'production') {
    try {
      const prisma = (await import('@/lib/db')).default;

      await prisma.auditLog.create({
        data: {
          userId: log.userId,
          companyId: log.companyId,
          action: 'SECURITY_ALERT',
          entityType: 'api_endpoint',
          entityId: log.endpoint,
          notes: JSON.stringify({
            feature: log.feature,
            userTier: log.userTier,
            requiredTier: log.requiredTier,
            method: log.method,
          }),
          ipAddress: log.ip,
          userAgent: log.userAgent,
        },
      });
    } catch (err) {
      // Don't fail the request if logging fails
      console.error('[TIER_BLOCKED] Failed to persist log:', err);
    }
  }
}

// ─── Response Helpers ─────────────────────────────────────────────

/**
 * Standard 403 response for tier-blocked requests.
 */
export function tierBlockedResponse(
  feature: Feature,
  userTier: PlanTier,
  requiredTier: PlanTier
): NextResponse {
  return NextResponse.json(
    {
      error: 'Feature not available on your plan',
      upgrade_required: true,
      current_plan: userTier,
      required_plan: requiredTier,
      feature: feature,
      upgrade_url: '/settings/billing',
    },
    { status: 403 }
  );
}

// ─── Tier Fetching ────────────────────────────────────────────────

/**
 * Get the subscription tier for a company.
 * Fetches from database and normalizes legacy plan IDs.
 */
async function getCompanyTier(companyId: string): Promise<PlanTier> {
  try {
    const prisma = (await import('@/lib/db')).default;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { subscriptionPlan: true, subscriptionStatus: true },
    });

    if (!company) return 'free';

    // If subscription is not active (except FREE), downgrade to free
    const status = company.subscriptionStatus;
    if (status !== 'ACTIVE' && status !== 'TRIALING' && status !== 'PAST_DUE') {
      // Inactive subscription = free tier access only
      return 'free';
    }

    return normalizeTier(company.subscriptionPlan);
  } catch {
    // On error, default to free for security
    return 'free';
  }
}

// ─── Main Middleware ──────────────────────────────────────────────

/**
 * Wrap an API route handler with tier-based feature access check.
 *
 * @param feature - The feature required to access this endpoint
 * @param handler - The actual API route handler
 * @returns Wrapped handler that checks tier before executing
 *
 * @example
 * ```ts
 * export const GET = withFeatureCheck('inventory', async (request) => {
 *   // This only runs if user has inventory access
 *   return NextResponse.json({ data: await getInventory() });
 * });
 * ```
 */
export function withFeatureCheck(
  feature: Feature,
  handler: ApiHandler
): ApiHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    // 1. Get authenticated user
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get company tier
    const companyId = user.activeCompanyId;
    if (!companyId) {
      return NextResponse.json(
        { error: 'No active company selected' },
        { status: 403 }
      );
    }

    const userTier = await getCompanyTier(companyId);
    const requiredTier = getRequiredTier(feature);

    // 3. Check feature access
    if (!hasFeatureAccess(userTier, feature)) {
      // Log the blocked attempt
      await logBlockedAttempt({
        timestamp: new Date().toISOString(),
        userId: user.sub,
        companyId,
        endpoint: request.nextUrl.pathname,
        method: request.method,
        feature,
        userTier,
        requiredTier,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });

      return tierBlockedResponse(feature, userTier, requiredTier);
    }

    // 4. Feature access granted - execute handler
    return handler(request, context);
  };
}

/**
 * HOC to protect all methods (GET, POST, PUT, DELETE, PATCH) in a route file.
 *
 * @example
 * ```ts
 * import { protectRoute } from '@/lib/tier/middleware';
 *
 * const handlers = protectRoute('inventory', {
 *   GET: async (request) => { ... },
 *   POST: async (request) => { ... },
 * });
 *
 * export const { GET, POST } = handlers;
 * ```
 */
export function protectRoute<T extends Record<string, ApiHandler>>(
  feature: Feature,
  handlers: T
): T {
  const protected_ = {} as T;

  for (const [method, handler] of Object.entries(handlers)) {
    (protected_ as Record<string, ApiHandler>)[method] = withFeatureCheck(feature, handler);
  }

  return protected_;
}

/**
 * Check feature access without blocking (for conditional UI/logic).
 * Returns the access status without returning a response.
 */
export async function checkFeatureAccess(
  request: NextRequest,
  feature: Feature
): Promise<{ hasAccess: boolean; userTier: PlanTier; requiredTier: PlanTier }> {
  const user = await getAuthUser(request);

  if (!user || !user.activeCompanyId) {
    return { hasAccess: false, userTier: 'free', requiredTier: getRequiredTier(feature) };
  }

  const userTier = await getCompanyTier(user.activeCompanyId);
  const requiredTier = getRequiredTier(feature);
  const hasAccess = hasFeatureAccess(userTier, feature);

  return { hasAccess, userTier, requiredTier };
}
