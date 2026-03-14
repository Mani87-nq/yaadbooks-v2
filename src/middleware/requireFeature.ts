/**
 * Feature Guard Middleware for YaadBooks.
 * 
 * Checks user's tier against the feature matrix and blocks access
 * to features the user's plan doesn't include.
 * 
 * Usage in API routes:
 *   const { user, error } = await requireFeature(request, 'inventory');
 *   if (error) return error;
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { 
  hasFeature, 
  getUpgradeInfo, 
  canAccessModule,
  type FeatureKey, 
  type Tier,
  type IndustryModule 
} from '@/lib/permissions/feature-matrix';
import prisma from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────

interface FeatureCheckResult {
  user: {
    sub: string;
    email: string;
    role: string;
    tier: Tier;
    selectedModule: IndustryModule;
    activeCompanyId: string | null;
    companies: string[];
  } | null;
  error: NextResponse | null;
}

interface BlockedResponse {
  error: string;
  code: 'FEATURE_LOCKED';
  upgrade_required: true;
  required_tier: Tier;
  tier_name: string;
  price_jmd: number;
  price_usd: number;
  current_tier: Tier;
  feature: FeatureKey;
}

// ─── Logging ──────────────────────────────────────────────────────

async function logBlockedAccess(
  userId: string,
  email: string,
  tier: Tier,
  feature: FeatureKey,
  requiredTier: Tier,
  request: NextRequest
): Promise<void> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
                      request.headers.get('x-real-ip') ??
                      'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';
    const url = request.url;

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SECURITY_ALERT',
        entityType: 'Feature',
        entityId: feature,
        newValues: {
          feature,
          required_tier: requiredTier,
          user_tier: tier,
          url,
        },
        changedFields: ['access_denied'],
        ipAddress,
        userAgent,
      },
    });

    // Also log to console for monitoring
    console.warn(
      `[FEATURE_BLOCKED] User ${email} (tier: ${tier}) attempted to access "${feature}" ` +
      `(requires: ${requiredTier}) | IP: ${ipAddress} | URL: ${url}`
    );
  } catch (error) {
    // Don't let logging failures break the middleware
    console.error('[requireFeature] Failed to log blocked access:', error);
  }
}

// ─── User Tier Lookup ─────────────────────────────────────────────

interface UserTierInfo {
  tier: Tier;
  selectedModule: IndustryModule;
}

async function getUserTier(userId: string): Promise<UserTierInfo> {
  try {
    // Look up user's active company and its subscription from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeCompanyId: true,
      },
    });

    if (user?.activeCompanyId) {
      const company = await prisma.company.findUnique({
        where: { id: user.activeCompanyId },
        select: {
          subscriptionPlan: true,
          selectedModule: true,
        },
      });

      if (company) {
        return {
          tier: (company.subscriptionPlan?.toLowerCase() ?? 'free') as Tier,
          selectedModule: company.selectedModule as IndustryModule,
        };
      }
    }

    // Fall back to free tier if no subscription found
    return { tier: 'free', selectedModule: null };
  } catch (error) {
    console.error('[requireFeature] Failed to fetch user tier:', error);
    // Default to free tier on error (fail secure)
    return { tier: 'free', selectedModule: null };
  }
}

// ─── Main Middleware ──────────────────────────────────────────────

/**
 * Require a specific feature to be available in the user's tier.
 * Returns 403 with upgrade info if the feature is locked.
 */
export async function requireFeature(
  request: NextRequest,
  feature: FeatureKey
): Promise<FeatureCheckResult> {
  // First, authenticate the user
  const authUser = await getAuthUser(request);
  
  if (!authUser) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  // Get user's tier from database
  const { tier, selectedModule } = await getUserTier(authUser.sub);

  // Check if user has access to the feature
  if (!hasFeature(tier, feature)) {
    const upgradeInfo = getUpgradeInfo(feature);

    // Log the blocked access attempt
    await logBlockedAccess(
      authUser.sub,
      authUser.email ?? 'unknown',
      tier,
      feature,
      upgradeInfo.requiredTier,
      request
    );

    const response: BlockedResponse = {
      error: `This feature requires the ${upgradeInfo.tierName} plan or higher`,
      code: 'FEATURE_LOCKED',
      upgrade_required: true,
      required_tier: upgradeInfo.requiredTier,
      tier_name: upgradeInfo.tierName,
      price_jmd: upgradeInfo.priceJmd,
      price_usd: upgradeInfo.priceUsd,
      current_tier: tier,
      feature,
    };

    return {
      user: null,
      error: NextResponse.json(response, { status: 403 }),
    };
  }

  // Feature access granted
  return {
    user: {
      ...authUser,
      tier,
      selectedModule,
    },
    error: null,
  };
}

/**
 * Require access to a specific industry module.
 * Checks both feature access and module selection.
 */
export async function requireModule(
  request: NextRequest,
  module: IndustryModule
): Promise<FeatureCheckResult> {
  // First check general industry module access
  const { user, error } = await requireFeature(request, 'industry_modules');
  if (error) return { user: null, error };

  // Then check specific module access
  if (!canAccessModule(user!.tier, user!.selectedModule, module)) {
    const response = {
      error: `You don't have access to the ${module} module. Your plan includes: ${user!.selectedModule ?? 'none'}`,
      code: 'MODULE_LOCKED',
      upgrade_required: true,
      selected_module: user!.selectedModule,
      requested_module: module,
      current_tier: user!.tier,
    };

    // Log blocked module access
    console.warn(
      `[MODULE_BLOCKED] User ${user!.email ?? user!.sub} (tier: ${user!.tier}, module: ${user!.selectedModule}) ` +
      `attempted to access "${module}" module`
    );

    return {
      user: null,
      error: NextResponse.json(response, { status: 403 }),
    };
  }

  return { user, error: null };
}

/**
 * Require multiple features (all must be available).
 */
export async function requireAllFeatures(
  request: NextRequest,
  features: FeatureKey[]
): Promise<FeatureCheckResult> {
  // Get user info from first feature check
  const firstResult = await requireFeature(request, features[0]);
  if (firstResult.error) return firstResult;

  // Check remaining features
  for (const feature of features.slice(1)) {
    if (!hasFeature(firstResult.user!.tier, feature)) {
      const upgradeInfo = getUpgradeInfo(feature);
      
      return {
        user: null,
        error: NextResponse.json({
          error: `This feature requires the ${upgradeInfo.tierName} plan or higher`,
          code: 'FEATURE_LOCKED',
          upgrade_required: true,
          required_tier: upgradeInfo.requiredTier,
          tier_name: upgradeInfo.tierName,
          current_tier: firstResult.user!.tier,
          feature,
        }, { status: 403 }),
      };
    }
  }

  return firstResult;
}

/**
 * Higher-order function to wrap an API handler with feature checking.
 * 
 * Usage:
 *   export const POST = withFeature('inventory', async (request, user) => {
 *     // Handler code here
 *   });
 */
export function withFeature<T>(
  feature: FeatureKey,
  handler: (request: NextRequest, user: NonNullable<FeatureCheckResult['user']>) => Promise<T>
) {
  return async (request: NextRequest): Promise<T | NextResponse> => {
    const { user, error } = await requireFeature(request, feature);
    if (error) return error;
    return handler(request, user!);
  };
}

/**
 * Higher-order function to wrap an API handler with module checking.
 */
export function withModule<T>(
  module: IndustryModule,
  handler: (request: NextRequest, user: NonNullable<FeatureCheckResult['user']>) => Promise<T>
) {
  return async (request: NextRequest): Promise<T | NextResponse> => {
    const { user, error } = await requireModule(request, module);
    if (error) return error;
    return handler(request, user!);
  };
}
