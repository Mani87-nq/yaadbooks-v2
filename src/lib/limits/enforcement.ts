/**
 * YaadBooks Tier Limit Enforcement
 * 
 * Centralized limit checking for all subscription-gated features.
 * Each function queries current usage and returns whether an action is allowed.
 * 
 * IMPORTANT: Limits are checked BEFORE actions are performed.
 * Use counter.ts to increment usage AFTER successful actions.
 */

import prisma from '@/lib/db';
import { migrateLegacyPlanId } from '@/lib/billing/plans';

// ─── Type Definitions ──────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;        // -1 means unlimited
  remaining: number;    // -1 means unlimited
  tier: SubscriptionTier;
  message?: string;     // Human-readable explanation when denied
}

// ─── Limit Constants ───────────────────────────────────────────────

const USER_LIMITS: Record<SubscriptionTier, number> = {
  free: 1,
  starter: 3,
  professional: -1,  // unlimited
  business: -1,
  enterprise: -1,
};

const COMPANY_LIMITS: Record<SubscriptionTier, number> = {
  free: 1,
  starter: 1,
  professional: 3,
  business: 10,
  enterprise: -1,    // unlimited
};

const INVOICE_LIMITS: Record<SubscriptionTier, number> = {
  free: 10,          // Reduced from 50 - upgrade incentive
  starter: -1,       // Unlimited
  professional: -1,  // Unlimited
  business: -1,
  enterprise: -1,
};

const QUOTATION_LIMITS: Record<SubscriptionTier, number> = {
  free: 3,           // Limited quotations
  starter: -1,       // Unlimited
  professional: -1,
  business: -1,
  enterprise: -1,
};

const CUSTOMER_LIMITS: Record<SubscriptionTier, number> = {
  free: 15,          // Limited customer base
  starter: -1,       // Unlimited
  professional: -1,
  business: -1,
  enterprise: -1,
};

const PAYROLL_EMPLOYEE_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,           // No payroll access
  starter: 5,
  professional: -1,  // unlimited
  business: -1,
  enterprise: -1,
};

const STORAGE_LIMITS_MB: Record<SubscriptionTier, number> = {
  free: 250,         // Reduced from 500 MB - upgrade incentive
  starter: 2048,     // 2 GB
  professional: 10240,  // 10 GB
  business: 51200,   // 50 GB
  enterprise: -1,    // Unlimited
};

const AI_QUESTION_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,           // No AI - upgrade to unlock
  starter: 25,
  professional: 500,
  business: -1,      // Unlimited
  enterprise: -1,
};

const STORAGE_LIMITS_MB_UPDATED: Record<SubscriptionTier, number> = {
  free: 250,         // Reduced from 500 MB
  starter: 2048,     // 2 GB
  professional: 10240,  // 10 GB
  business: 51200,   // 50 GB
  enterprise: -1,    // Unlimited
};

// ─── Helper Functions ──────────────────────────────────────────────

function normalizeTier(tierInput: string | null | undefined): SubscriptionTier {
  if (!tierInput) return 'free';
  const normalized = migrateLegacyPlanId(tierInput.toLowerCase());
  if (['free', 'starter', 'professional', 'business', 'enterprise'].includes(normalized)) {
    return normalized as SubscriptionTier;
  }
  return 'free';
}

function buildResult(
  current: number,
  limit: number,
  tier: SubscriptionTier,
  resourceName: string
): LimitCheckResult {
  const isUnlimited = limit === -1;
  const allowed = isUnlimited || current < limit;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - current);
  
  let message: string | undefined;
  if (!allowed) {
    if (isUnlimited) {
      // This shouldn't happen, but handle it gracefully
      message = `Unexpected limit check failure for ${resourceName}`;
    } else {
      message = `${resourceName} limit reached (${current}/${limit}). Upgrade your plan for more.`;
    }
  }
  
  return { allowed, current, limit, remaining, tier, message };
}

// ─── User Limit Check ──────────────────────────────────────────────

/**
 * Check if a company can add more users based on their tier.
 * 
 * @param companyId - The company to check
 * @param tier - Override tier (if not provided, fetches from company)
 * @returns LimitCheckResult with current user count and allowance
 */
export async function checkUserLimit(
  companyId: string,
  tier?: string
): Promise<LimitCheckResult> {
  // Get company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      _count: {
        select: { members: true },
      },
    },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      tier: 'free',
      message: 'Company not found',
    };
  }

  const normalizedTier = normalizeTier(tier ?? company.subscriptionPlan);
  const limit = USER_LIMITS[normalizedTier];
  const current = company._count.members;

  return buildResult(current, limit, normalizedTier, 'User');
}

// ─── Company Limit Check ───────────────────────────────────────────

/**
 * Check if a user can create/own more companies based on their highest tier.
 * 
 * Note: Uses the highest tier among all companies the user owns.
 * 
 * @param userId - The user to check
 * @param tier - Override tier (if not provided, uses highest owned tier)
 * @returns LimitCheckResult with current company count and allowance
 */
export async function checkCompanyLimit(
  userId: string,
  tier?: string
): Promise<LimitCheckResult> {
  // Get all companies where user is OWNER
  const ownedCompanies = await prisma.companyMember.findMany({
    where: {
      userId,
      role: 'OWNER',
    },
    select: {
      company: {
        select: {
          id: true,
          subscriptionPlan: true,
        },
      },
    },
  });

  const current = ownedCompanies.length;

  // Determine effective tier - use provided or highest among owned companies
  let effectiveTier: SubscriptionTier = 'free';
  if (tier) {
    effectiveTier = normalizeTier(tier);
  } else {
    // Find highest tier among owned companies
    const tierOrder: SubscriptionTier[] = ['free', 'starter', 'professional', 'business', 'enterprise'];
    for (const cu of ownedCompanies) {
      const compTier = normalizeTier(cu.company.subscriptionPlan);
      if (tierOrder.indexOf(compTier) > tierOrder.indexOf(effectiveTier)) {
        effectiveTier = compTier;
      }
    }
  }

  const limit = COMPANY_LIMITS[effectiveTier];
  return buildResult(current, limit, effectiveTier, 'Company');
}

// ─── Invoice Limit Check ───────────────────────────────────────────

/**
 * Check if a company can create more invoices this month.
 * 
 * IMPORTANT: Drafts count. Deleted invoices count.
 * Uses the invoiceCountThisMonth field from the company record.
 * 
 * @param companyId - The company to check
 * @param tier - Override tier (if not provided, fetches from company)
 * @param currentMonthCount - Override current count (if not provided, fetches from company)
 * @returns LimitCheckResult with current invoice count and allowance
 */
export async function checkInvoiceLimit(
  companyId: string,
  tier?: string,
  currentMonthCount?: number
): Promise<LimitCheckResult> {
  // Get company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      invoiceCountThisMonth: true,
    },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      tier: 'free',
      message: 'Company not found',
    };
  }

  const normalizedTier = normalizeTier(tier ?? company.subscriptionPlan);
  const limit = INVOICE_LIMITS[normalizedTier];
  const current = currentMonthCount ?? company.invoiceCountThisMonth;

  return buildResult(current, limit, normalizedTier, 'Invoice');
}

// ─── Payroll Limit Check ───────────────────────────────────────────

/**
 * Check if a company can add more employees to payroll.
 * 
 * Free tier: No payroll access (limit = 0)
 * Starter: Max 5 employees
 * Professional+: Unlimited
 * 
 * @param companyId - The company to check
 * @param tier - Override tier (if not provided, fetches from company)
 * @returns LimitCheckResult with current employee count and allowance
 */
export async function checkPayrollLimit(
  companyId: string,
  tier?: string
): Promise<LimitCheckResult> {
  // Get company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      _count: {
        select: { employees: true },
      },
    },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      tier: 'free',
      message: 'Company not found',
    };
  }

  const normalizedTier = normalizeTier(tier ?? company.subscriptionPlan);
  const limit = PAYROLL_EMPLOYEE_LIMITS[normalizedTier];
  const current = company._count.employees;

  // Special message for free tier
  const result = buildResult(current, limit, normalizedTier, 'Employee');
  if (limit === 0) {
    result.message = 'Payroll is not available on the Free plan. Upgrade to Starter or higher.';
  }

  return result;
}

// ─── Storage Limit Check ───────────────────────────────────────────

/**
 * Check if a company has storage capacity remaining.
 * 
 * @param companyId - The company to check
 * @param tier - Override tier (if not provided, fetches from company)
 * @param storageUsedMb - Override storage used (if not provided, fetches from company)
 * @returns LimitCheckResult with current storage usage and allowance
 */
export async function checkStorageLimit(
  companyId: string,
  tier?: string,
  storageUsedMb?: number
): Promise<LimitCheckResult> {
  // Get company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      storageUsedMb: true,
    },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      tier: 'free',
      message: 'Company not found',
    };
  }

  const normalizedTier = normalizeTier(tier ?? company.subscriptionPlan);
  const limit = STORAGE_LIMITS_MB[normalizedTier];
  const current = storageUsedMb ?? company.storageUsedMb;

  const result = buildResult(current, limit, normalizedTier, 'Storage');
  if (!result.allowed && limit !== -1) {
    result.message = `Storage limit reached (${current}MB / ${limit}MB). Upgrade your plan for more storage.`;
  }

  return result;
}

// ─── AI Question Limit Check ───────────────────────────────────────

/**
 * Check if a company can use more AI assistant questions this month.
 * 
 * Note: AI limits are tracked per company, not per user.
 * The userId parameter is for audit/logging purposes.
 * 
 * @param companyId - The company to check
 * @param tier - Override tier (if not provided, fetches from company)
 * @param questionsThisMonth - Override current count (if not provided, fetches from company)
 * @returns LimitCheckResult with current question count and allowance
 */
export async function checkAILimit(
  companyId: string,
  tier?: string,
  questionsThisMonth?: number
): Promise<LimitCheckResult> {
  // Get company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      aiQuestionsThisMonth: true,
    },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      tier: 'free',
      message: 'Company not found',
    };
  }

  const normalizedTier = normalizeTier(tier ?? company.subscriptionPlan);
  const limit = AI_QUESTION_LIMITS[normalizedTier];
  const current = questionsThisMonth ?? company.aiQuestionsThisMonth;

  const result = buildResult(current, limit, normalizedTier, 'AI question');
  if (!result.allowed) {
    if (normalizedTier === 'free') {
      result.message = 'You\'ve used your free AI question this month. Upgrade for more AI assistance.';
    } else {
      result.message = `AI question limit reached (${current}/${limit}). Upgrade for unlimited AI assistance.`;
    }
  }

  return result;
}

// ─── Quotation Limit Check ─────────────────────────────────────────

/**
 * Check if a company can create more quotations this month.
 * 
 * Free tier: 3 quotations/month
 * Starter+: Unlimited
 * 
 * @param companyId - The company to check
 * @param tier - Override tier (if not provided, fetches from company)
 * @returns LimitCheckResult with current quotation count and allowance
 */
export async function checkQuotationLimit(
  companyId: string,
  tier?: string
): Promise<LimitCheckResult> {
  // Get company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
    },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      tier: 'free',
      message: 'Company not found',
    };
  }

  // Count quotations this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const current = await prisma.quotation.count({
    where: {
      companyId,
      createdAt: { gte: startOfMonth },
    },
  });

  const normalizedTier = normalizeTier(tier ?? company.subscriptionPlan);
  const limit = QUOTATION_LIMITS[normalizedTier];

  const result = buildResult(current, limit, normalizedTier, 'Quotation');
  if (!result.allowed) {
    result.message = `Quotation limit reached (${current}/${limit} this month). Upgrade to Starter for unlimited quotations.`;
  }

  return result;
}

// ─── Customer Limit Check ──────────────────────────────────────────

/**
 * Check if a company can add more customers.
 * 
 * Free tier: 15 customers max
 * Starter+: Unlimited
 * 
 * @param companyId - The company to check
 * @param tier - Override tier (if not provided, fetches from company)
 * @returns LimitCheckResult with current customer count and allowance
 */
export async function checkCustomerLimit(
  companyId: string,
  tier?: string
): Promise<LimitCheckResult> {
  // Get company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      _count: {
        select: { customers: true },
      },
    },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      tier: 'free',
      message: 'Company not found',
    };
  }

  const normalizedTier = normalizeTier(tier ?? company.subscriptionPlan);
  const limit = CUSTOMER_LIMITS[normalizedTier];
  const current = company._count.customers;

  const result = buildResult(current, limit, normalizedTier, 'Customer');
  if (!result.allowed) {
    result.message = `Customer limit reached (${current}/${limit}). Upgrade to Starter for unlimited customers.`;
  }

  return result;
}

// ─── Bulk Check ────────────────────────────────────────────────────

/**
 * Check all limits for a company at once.
 * Useful for displaying limit status in dashboards.
 */
export async function checkAllLimits(companyId: string): Promise<{
  users: LimitCheckResult;
  invoices: LimitCheckResult;
  quotations: LimitCheckResult;
  customers: LimitCheckResult;
  payroll: LimitCheckResult;
  storage: LimitCheckResult;
  ai: LimitCheckResult;
}> {
  const [users, invoices, quotations, customers, payroll, storage, ai] = await Promise.all([
    checkUserLimit(companyId),
    checkInvoiceLimit(companyId),
    checkQuotationLimit(companyId),
    checkCustomerLimit(companyId),
    checkPayrollLimit(companyId),
    checkStorageLimit(companyId),
    checkAILimit(companyId),
  ]);

  return { users, invoices, quotations, customers, payroll, storage, ai };
}

// ─── Export Limit Constants (for UI display) ───────────────────────

export const LIMITS = {
  users: USER_LIMITS,
  companies: COMPANY_LIMITS,
  invoices: INVOICE_LIMITS,
  payrollEmployees: PAYROLL_EMPLOYEE_LIMITS,
  storageMb: STORAGE_LIMITS_MB,
  aiQuestions: AI_QUESTION_LIMITS,
} as const;

/**
 * Get limits for a specific tier (for display purposes).
 */
export function getTierLimits(tier: SubscriptionTier) {
  return {
    users: USER_LIMITS[tier],
    companies: COMPANY_LIMITS[tier],
    invoicesPerMonth: INVOICE_LIMITS[tier],
    payrollEmployees: PAYROLL_EMPLOYEE_LIMITS[tier],
    storageMb: STORAGE_LIMITS_MB[tier],
    aiQuestionsPerMonth: AI_QUESTION_LIMITS[tier],
  };
}
