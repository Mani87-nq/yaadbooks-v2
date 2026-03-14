/**
 * Limit Enforcement Middleware for YaadBooks.
 * 
 * Checks usage against tier limits and blocks actions when limits are exceeded.
 * 
 * Usage in API routes:
 *   const { allowed, error } = await checkUserLimit(request, 'maxUsers');
 *   if (error) return error;
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { 
  getTierLimits, 
  checkLimit,
  type Tier,
  type TierLimits 
} from '@/lib/permissions/feature-matrix';
import prisma from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────

type LimitKey = keyof TierLimits;

interface LimitCheckResponse {
  allowed: boolean;
  current: number;
  limit: number;
  warning?: boolean;
  error: NextResponse | null;
}

interface LimitExceededResponse {
  error: string;
  code: 'LIMIT_EXCEEDED';
  upgrade_required: true;
  limit_type: string;
  current: number;
  limit: number;
  current_tier: Tier;
}

// ─── User Tier & Usage Lookup ─────────────────────────────────────

interface UserSubscription {
  tier: Tier;
  invoiceCountThisMonth: number;
  aiQuestionsThisMonth: number;
  storageUsedMb: number;
  billingCycleStart: Date | null;
}

async function getUserSubscription(userId: string): Promise<UserSubscription> {
  try {
    // Get user's active company and its subscription details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeCompanyId: true },
    });

    if (user?.activeCompanyId) {
      const company = await prisma.company.findUnique({
        where: { id: user.activeCompanyId },
        select: {
          subscriptionPlan: true,
          invoiceCountThisMonth: true,
          aiQuestionsThisMonth: true,
          storageUsedMb: true,
          billingCycleStart: true,
        },
      });

      if (company) {
        return {
          tier: (company.subscriptionPlan?.toLowerCase() ?? 'free') as Tier,
          invoiceCountThisMonth: company.invoiceCountThisMonth ?? 0,
          aiQuestionsThisMonth: company.aiQuestionsThisMonth ?? 0,
          storageUsedMb: company.storageUsedMb ?? 0,
          billingCycleStart: company.billingCycleStart,
        };
      }
    }

    return {
      tier: 'free',
      invoiceCountThisMonth: 0,
      aiQuestionsThisMonth: 0,
      storageUsedMb: 0,
      billingCycleStart: null,
    };
  } catch (error) {
    console.error('[requireLimit] Failed to fetch user subscription:', error);
    return {
      tier: 'free',
      invoiceCountThisMonth: 0,
      aiQuestionsThisMonth: 0,
      storageUsedMb: 0,
      billingCycleStart: null,
    };
  }
}

// ─── Usage Counters ───────────────────────────────────────────────

/**
 * Count current users in a company.
 */
async function countCompanyUsers(companyId: string): Promise<number> {
  const count = await prisma.companyMember.count({
    where: { companyId },
  });
  return count;
}

/**
 * Count companies a user owns/has access to.
 */
async function countUserCompanies(userId: string): Promise<number> {
  const count = await prisma.companyMember.count({
    where: { userId },
  });
  return count;
}

/**
 * Count payroll employees in a company.
 */
async function countPayrollEmployees(companyId: string): Promise<number> {
  const count = await prisma.employee.count({
    where: { 
      companyId, 
      terminationDate: null, // Active employees only
    },
  });
  return count;
}

/**
 * Count locations for a company.
 */
async function countCompanyLocations(companyId: string): Promise<number> {
  const count = await prisma.warehouse.count({
    where: { companyId },
  });
  return count;
}

// ─── Limit Enforcement Functions ──────────────────────────────────

/**
 * Check if adding a user would exceed the limit.
 */
export async function checkUserLimit(
  request: NextRequest,
  companyId: string
): Promise<LimitCheckResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  const subscription = await getUserSubscription(authUser.sub);
  const currentUsers = await countCompanyUsers(companyId);
  const result = checkLimit(subscription.tier, 'maxUsers', currentUsers);

  if (!result.allowed) {
    return {
      ...result,
      error: createLimitExceededResponse(
        subscription.tier,
        'maxUsers',
        result.current,
        result.limit,
        'user'
      ),
    };
  }

  return { ...result, error: null };
}

/**
 * Check if creating a company would exceed the limit.
 */
export async function checkCompanyLimit(
  request: NextRequest
): Promise<LimitCheckResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  const subscription = await getUserSubscription(authUser.sub);
  const currentCompanies = await countUserCompanies(authUser.sub);
  const result = checkLimit(subscription.tier, 'maxCompanies', currentCompanies);

  if (!result.allowed) {
    return {
      ...result,
      error: createLimitExceededResponse(
        subscription.tier,
        'maxCompanies',
        result.current,
        result.limit,
        'company'
      ),
    };
  }

  return { ...result, error: null };
}

/**
 * Check if creating an invoice would exceed the monthly limit.
 */
export async function checkInvoiceLimit(
  request: NextRequest
): Promise<LimitCheckResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  const subscription = await getUserSubscription(authUser.sub);
  const result = checkLimit(
    subscription.tier,
    'maxInvoicesPerMonth',
    subscription.invoiceCountThisMonth
  );

  if (!result.allowed) {
    return {
      ...result,
      error: createLimitExceededResponse(
        subscription.tier,
        'maxInvoicesPerMonth',
        result.current,
        result.limit,
        'invoice'
      ),
    };
  }

  return { ...result, error: null };
}

/**
 * Check if adding a payroll employee would exceed the limit.
 */
export async function checkPayrollLimit(
  request: NextRequest,
  companyId: string
): Promise<LimitCheckResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  const subscription = await getUserSubscription(authUser.sub);
  const currentEmployees = await countPayrollEmployees(companyId);
  const result = checkLimit(subscription.tier, 'maxPayrollEmployees', currentEmployees);

  if (!result.allowed) {
    return {
      ...result,
      error: createLimitExceededResponse(
        subscription.tier,
        'maxPayrollEmployees',
        result.current,
        result.limit,
        'payroll employee'
      ),
    };
  }

  return { ...result, error: null };
}

/**
 * Check if using AI would exceed the monthly limit.
 */
export async function checkAiLimit(
  request: NextRequest
): Promise<LimitCheckResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  const subscription = await getUserSubscription(authUser.sub);
  const result = checkLimit(
    subscription.tier,
    'maxAiQuestionsPerMonth',
    subscription.aiQuestionsThisMonth
  );

  if (!result.allowed) {
    return {
      ...result,
      error: createLimitExceededResponse(
        subscription.tier,
        'maxAiQuestionsPerMonth',
        result.current,
        result.limit,
        'AI question'
      ),
    };
  }

  return { ...result, error: null };
}

/**
 * Check if uploading would exceed storage limit.
 */
export async function checkStorageLimit(
  request: NextRequest,
  additionalMb: number = 0
): Promise<LimitCheckResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  const subscription = await getUserSubscription(authUser.sub);
  const totalAfterUpload = subscription.storageUsedMb + additionalMb;
  const result = checkLimit(subscription.tier, 'maxStorageMb', totalAfterUpload);

  if (!result.allowed) {
    return {
      ...result,
      error: createLimitExceededResponse(
        subscription.tier,
        'maxStorageMb',
        result.current,
        result.limit,
        'MB of storage'
      ),
    };
  }

  return { ...result, error: null };
}

/**
 * Check if adding a location would exceed the limit.
 */
export async function checkLocationLimit(
  request: NextRequest,
  companyId: string
): Promise<LimitCheckResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  const subscription = await getUserSubscription(authUser.sub);
  const currentLocations = await countCompanyLocations(companyId);
  const result = checkLimit(subscription.tier, 'maxLocations', currentLocations);

  if (!result.allowed) {
    return {
      ...result,
      error: createLimitExceededResponse(
        subscription.tier,
        'maxLocations',
        result.current,
        result.limit,
        'location'
      ),
    };
  }

  return { ...result, error: null };
}

// ─── Increment Usage Counters ─────────────────────────────────────

/**
 * Increment the monthly invoice counter for a user's active company.
 */
export async function incrementInvoiceCount(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeCompanyId: true },
    });
    if (user?.activeCompanyId) {
      await prisma.company.update({
        where: { id: user.activeCompanyId },
        data: { invoiceCountThisMonth: { increment: 1 } },
      });
    }
  } catch (error) {
    console.error('[requireLimit] Failed to increment invoice count:', error);
  }
}

/**
 * Increment the monthly AI question counter for a user's active company.
 */
export async function incrementAiCount(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeCompanyId: true },
    });
    if (user?.activeCompanyId) {
      await prisma.company.update({
        where: { id: user.activeCompanyId },
        data: { aiQuestionsThisMonth: { increment: 1 } },
      });
    }
  } catch (error) {
    console.error('[requireLimit] Failed to increment AI count:', error);
  }
}

/**
 * Update storage usage for a user's active company.
 */
export async function updateStorageUsage(userId: string, totalMb: number): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeCompanyId: true },
    });
    if (user?.activeCompanyId) {
      await prisma.company.update({
        where: { id: user.activeCompanyId },
        data: { storageUsedMb: totalMb },
      });
    }
  } catch (error) {
    console.error('[requireLimit] Failed to update storage usage:', error);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function createLimitExceededResponse(
  tier: Tier,
  limitType: string,
  current: number,
  limit: number,
  itemName: string
): NextResponse {
  const response: LimitExceededResponse = {
    error: `You've reached the ${itemName} limit for your ${tier} plan (${current}/${limit}). Upgrade to add more.`,
    code: 'LIMIT_EXCEEDED',
    upgrade_required: true,
    limit_type: limitType,
    current,
    limit,
    current_tier: tier,
  };

  // Log the limit exceeded event
  console.warn(
    `[LIMIT_EXCEEDED] Tier: ${tier} | Limit: ${limitType} | ` +
    `Current: ${current} | Max: ${limit}`
  );

  return NextResponse.json(response, { status: 403 });
}

/**
 * Get usage summary for display in UI.
 */
export async function getUsageSummary(userId: string, companyId: string): Promise<{
  tier: Tier;
  limits: TierLimits;
  usage: {
    users: { current: number; limit: number; percent: number };
    companies: { current: number; limit: number; percent: number };
    invoices: { current: number; limit: number; percent: number };
    payrollEmployees: { current: number; limit: number; percent: number };
    aiQuestions: { current: number; limit: number; percent: number };
    storage: { current: number; limit: number; percent: number };
    locations: { current: number; limit: number; percent: number };
  };
}> {
  const subscription = await getUserSubscription(userId);
  const limits = getTierLimits(subscription.tier);

  const [userCount, companyCount, payrollCount, locationCount] = await Promise.all([
    countCompanyUsers(companyId),
    countUserCompanies(userId),
    countPayrollEmployees(companyId),
    countCompanyLocations(companyId),
  ]);

  const calcPercent = (current: number, limit: number) => 
    limit === -1 ? 0 : Math.round((current / limit) * 100);

  return {
    tier: subscription.tier,
    limits,
    usage: {
      users: {
        current: userCount,
        limit: limits.maxUsers,
        percent: calcPercent(userCount, limits.maxUsers),
      },
      companies: {
        current: companyCount,
        limit: limits.maxCompanies,
        percent: calcPercent(companyCount, limits.maxCompanies),
      },
      invoices: {
        current: subscription.invoiceCountThisMonth,
        limit: limits.maxInvoicesPerMonth,
        percent: calcPercent(subscription.invoiceCountThisMonth, limits.maxInvoicesPerMonth),
      },
      payrollEmployees: {
        current: payrollCount,
        limit: limits.maxPayrollEmployees,
        percent: calcPercent(payrollCount, limits.maxPayrollEmployees),
      },
      aiQuestions: {
        current: subscription.aiQuestionsThisMonth,
        limit: limits.maxAiQuestionsPerMonth,
        percent: calcPercent(subscription.aiQuestionsThisMonth, limits.maxAiQuestionsPerMonth),
      },
      storage: {
        current: subscription.storageUsedMb,
        limit: limits.maxStorageMb,
        percent: calcPercent(subscription.storageUsedMb, limits.maxStorageMb),
      },
      locations: {
        current: locationCount,
        limit: limits.maxLocations,
        percent: calcPercent(locationCount, limits.maxLocations),
      },
    },
  };
}
