/**
 * Feature Matrix - Central permission config for YaadBooks tier-based access.
 * 
 * This is the SINGLE SOURCE OF TRUTH for what features each tier can access.
 * All middleware, UI components, and API routes should reference this file.
 */

// ─── Tier Definitions ─────────────────────────────────────────────

export type Tier = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';

export type IndustryModule = 'retail' | 'restaurant' | 'salon' | null;

// ─── Feature Keys ─────────────────────────────────────────────────

export type FeatureKey =
  // Core features
  | 'invoicing'
  | 'quotations'
  | 'expenses'
  | 'basic_reports'
  | 'gct_compliance'
  // Starter+ features
  | 'inventory'
  | 'payroll'
  | 'bank_reconciliation'
  | 'all_reports'
  // Professional+ features
  | 'pos'
  | 'employee_portal'
  | 'ai_assistant'
  | 'industry_modules'
  | 'whatsapp_notifications'
  // Business+ features
  | 'multi_location'
  | 'advanced_analytics'
  | 'custom_reports'
  | 'offline_mode'
  // Enterprise only
  | 'api_access'
  | 'custom_integrations'
  | 'unlimited_companies'
  | 'all_modules';

// ─── Feature Matrix ───────────────────────────────────────────────

/**
 * Maps each feature to the minimum tier required.
 * Tiers are hierarchical: free < starter < professional < business < enterprise
 */
export const FEATURE_MATRIX: Record<FeatureKey, Tier> = {
  // Free tier features
  invoicing: 'free',
  quotations: 'free',
  expenses: 'free',
  basic_reports: 'free',
  gct_compliance: 'free',

  // Starter+ features
  inventory: 'starter',
  payroll: 'starter',
  bank_reconciliation: 'starter',
  all_reports: 'starter',

  // Professional+ features
  pos: 'professional',
  employee_portal: 'professional',
  ai_assistant: 'professional',
  industry_modules: 'professional',
  whatsapp_notifications: 'professional',

  // Business+ features
  multi_location: 'business',
  advanced_analytics: 'business',
  custom_reports: 'business',
  offline_mode: 'business',

  // Enterprise only
  api_access: 'enterprise',
  custom_integrations: 'enterprise',
  unlimited_companies: 'enterprise',
  all_modules: 'enterprise',
};

// ─── Tier Limits ──────────────────────────────────────────────────

export interface TierLimits {
  maxUsers: number;           // -1 = unlimited
  maxCompanies: number;       // -1 = unlimited
  maxInvoicesPerMonth: number; // -1 = unlimited
  maxQuotationsPerMonth: number; // -1 = unlimited
  maxCustomers: number;       // -1 = unlimited
  maxPayrollEmployees: number; // -1 = unlimited
  maxStorageMb: number;       // -1 = unlimited
  maxAiQuestionsPerMonth: number; // -1 = unlimited
  maxLocations: number;       // -1 = unlimited
  includesModules: number;    // Number of industry modules, -1 = all
  reportHistoryDays: number;  // -1 = unlimited, else days of history
  invoiceWatermark: boolean;  // true = "Powered by YaadBooks" on PDFs
  gctExportEnabled: boolean;  // false = view only, no TAJ export
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    maxUsers: 1,
    maxCompanies: 1,
    maxInvoicesPerMonth: 10,      // Reduced from 50 - upgrade incentive
    maxQuotationsPerMonth: 3,     // Limited quotations
    maxCustomers: 15,             // Limited customer base
    maxPayrollEmployees: 0,       // No payroll
    maxStorageMb: 250,            // Reduced from 500
    maxAiQuestionsPerMonth: 0,    // No AI - upgrade to unlock
    maxLocations: 1,
    includesModules: 0,
    reportHistoryDays: 30,        // Last 30 days only
    invoiceWatermark: true,       // "Powered by YaadBooks" on PDFs
    gctExportEnabled: false,      // View only, no TAJ export
  },
  starter: {
    maxUsers: 3,
    maxCompanies: 1,
    maxInvoicesPerMonth: -1,      // Unlimited invoices
    maxQuotationsPerMonth: -1,    // Unlimited quotations
    maxCustomers: -1,             // Unlimited customers
    maxPayrollEmployees: 5,
    maxStorageMb: 2048,           // 2GB
    maxAiQuestionsPerMonth: 25,
    maxLocations: 1,
    includesModules: 0,
    reportHistoryDays: -1,        // Full history
    invoiceWatermark: false,      // Clean invoices
    gctExportEnabled: true,       // Full GCT export
  },
  professional: {
    maxUsers: -1,                 // Unlimited
    maxCompanies: 1,
    maxInvoicesPerMonth: -1,      // Unlimited
    maxQuotationsPerMonth: -1,    // Unlimited
    maxCustomers: -1,             // Unlimited
    maxPayrollEmployees: -1,      // Unlimited
    maxStorageMb: 10240,          // 10GB
    maxAiQuestionsPerMonth: 500,
    maxLocations: 1,
    includesModules: 1,
    reportHistoryDays: -1,        // Full history
    invoiceWatermark: false,      // Clean invoices
    gctExportEnabled: true,       // Full GCT export
  },
  business: {
    maxUsers: -1,
    maxCompanies: 3,
    maxInvoicesPerMonth: -1,
    maxQuotationsPerMonth: -1,
    maxCustomers: -1,
    maxPayrollEmployees: -1,
    maxStorageMb: 51200,          // 50GB
    maxAiQuestionsPerMonth: -1,   // Unlimited
    maxLocations: 3,
    includesModules: 1,           // 1 module with ALL sub-modules
    reportHistoryDays: -1,        // Full history
    invoiceWatermark: false,      // Clean invoices
    gctExportEnabled: true,       // Full GCT export
  },
  enterprise: {
    maxUsers: -1,
    maxCompanies: -1,
    maxInvoicesPerMonth: -1,
    maxQuotationsPerMonth: -1,
    maxCustomers: -1,
    maxPayrollEmployees: -1,
    maxStorageMb: -1,             // Unlimited
    maxAiQuestionsPerMonth: -1,
    maxLocations: -1,
    includesModules: -1,          // All modules
    reportHistoryDays: -1,        // Full history
    invoiceWatermark: false,      // Clean invoices
    gctExportEnabled: true,       // Full GCT export
  },
};

// ─── Tier Hierarchy ───────────────────────────────────────────────

const TIER_ORDER: Tier[] = ['free', 'starter', 'professional', 'business', 'enterprise'];

/**
 * Get numeric level of a tier (higher = more access).
 */
export function getTierLevel(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Check if tier A is >= tier B.
 */
export function tierMeetsMinimum(userTier: Tier, requiredTier: Tier): boolean {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
}

// ─── Feature Check Functions ──────────────────────────────────────

/**
 * Check if a tier has access to a specific feature.
 */
export function hasFeature(tier: Tier, feature: FeatureKey): boolean {
  const requiredTier = FEATURE_MATRIX[feature];
  return tierMeetsMinimum(tier, requiredTier);
}

/**
 * Check if a tier has access to all specified features.
 */
export function hasAllFeatures(tier: Tier, features: FeatureKey[]): boolean {
  return features.every(f => hasFeature(tier, f));
}

/**
 * Check if a tier has access to any of the specified features.
 */
export function hasAnyFeature(tier: Tier, features: FeatureKey[]): boolean {
  return features.some(f => hasFeature(tier, f));
}

/**
 * Get the limits for a specific tier.
 */
export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Get the minimum tier required for a feature.
 */
export function getRequiredTier(feature: FeatureKey): Tier {
  return FEATURE_MATRIX[feature];
}

/**
 * Get all features available to a tier.
 */
export function getAvailableFeatures(tier: Tier): FeatureKey[] {
  return (Object.keys(FEATURE_MATRIX) as FeatureKey[]).filter(f => hasFeature(tier, f));
}

/**
 * Get all features NOT available to a tier (locked features).
 */
export function getLockedFeatures(tier: Tier): FeatureKey[] {
  return (Object.keys(FEATURE_MATRIX) as FeatureKey[]).filter(f => !hasFeature(tier, f));
}

// ─── Industry Module Access ───────────────────────────────────────

/**
 * Check if user can access a specific industry module.
 * - Professional/Business: Only their selected module
 * - Enterprise: All modules
 */
export function canAccessModule(
  tier: Tier,
  selectedModule: IndustryModule,
  requestedModule: IndustryModule
): boolean {
  // No module access below Professional
  if (!hasFeature(tier, 'industry_modules')) {
    return false;
  }

  // Enterprise can access all modules
  if (tier === 'enterprise') {
    return true;
  }

  // Professional/Business: Only their selected module
  return selectedModule === requestedModule;
}

// ─── Upgrade Suggestions ──────────────────────────────────────────

export interface UpgradeInfo {
  requiredTier: Tier;
  tierName: string;
  priceJmd: number;
  priceUsd: number;
}

const TIER_PRICING: Record<Tier, { name: string; priceJmd: number; priceUsd: number }> = {
  free: { name: 'Free', priceJmd: 0, priceUsd: 0 },
  starter: { name: 'Starter', priceJmd: 3499, priceUsd: 22.50 },
  professional: { name: 'Professional', priceJmd: 7499, priceUsd: 48.25 },
  business: { name: 'Business', priceJmd: 13999, priceUsd: 90.00 },
  enterprise: { name: 'Enterprise', priceJmd: 22999, priceUsd: 148.00 },
};

/**
 * Get upgrade information for a locked feature.
 */
export function getUpgradeInfo(feature: FeatureKey): UpgradeInfo {
  const requiredTier = FEATURE_MATRIX[feature];
  const pricing = TIER_PRICING[requiredTier];
  return {
    requiredTier,
    tierName: pricing.name,
    priceJmd: pricing.priceJmd,
    priceUsd: pricing.priceUsd,
  };
}

// ─── Limit Checking ───────────────────────────────────────────────

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  limitType: string;
  percentUsed: number;
  warning?: boolean;  // True if approaching limit (>80%)
}

/**
 * Check if a numeric value is within tier limits.
 * Returns detailed info about the limit status.
 */
export function checkLimit(
  tier: Tier,
  limitKey: keyof TierLimits,
  currentValue: number
): LimitCheckResult {
  const limits = TIER_LIMITS[tier];
  const limit = limits[limitKey] as number;

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current: currentValue,
      limit: -1,
      limitType: limitKey,
      percentUsed: 0,
    };
  }

  const percentUsed = (currentValue / limit) * 100;
  const allowed = currentValue < limit;
  const warning = percentUsed >= 80 && percentUsed < 100;

  return {
    allowed,
    current: currentValue,
    limit,
    limitType: limitKey,
    percentUsed,
    warning,
  };
}
