/**
 * YaadBooks Feature Matrix - Tier-based Access Control
 *
 * Defines which features are available on each subscription tier.
 * This is the single source of truth for feature gating.
 */

export type PlanTier = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';

export type Feature =
  | 'inventory'
  | 'payroll'
  | 'pos'
  | 'bank_reconciliation'
  | 'employee_portal'
  | 'ai_assistant'
  | 'advanced_analytics'
  | 'custom_reports'
  | 'api_access'
  | 'multi_location'
  | 'custom_integrations'
  | 'unlimited_invoices'
  | 'multi_user'
  | 'industry_modules'
  | 'offline_mode'
  | 'whatsapp_notifications';

/**
 * Feature Matrix: Maps features to the minimum tier required.
 *
 * Tier hierarchy (lowest to highest):
 *   free < starter < professional < business < enterprise
 *
 * A feature set to 'starter' means starter and above can access it.
 * A feature set to 'enterprise' means only enterprise can access it.
 */
export const FEATURE_MATRIX: Record<Feature, PlanTier> = {
  // Free tier has basic invoicing/expenses only
  // No additional features

  // Starter tier adds:
  inventory: 'starter',
  payroll: 'starter',
  bank_reconciliation: 'starter',
  unlimited_invoices: 'starter',

  // Professional tier adds:
  pos: 'professional',
  employee_portal: 'professional',
  ai_assistant: 'professional',
  industry_modules: 'professional',
  whatsapp_notifications: 'professional',
  multi_user: 'professional',

  // Business tier adds:
  advanced_analytics: 'business',
  custom_reports: 'business',
  multi_location: 'business',
  offline_mode: 'business',

  // Enterprise tier adds:
  api_access: 'enterprise',
  custom_integrations: 'enterprise',
};

/**
 * Tier hierarchy for comparison.
 * Higher index = higher tier.
 */
const TIER_HIERARCHY: PlanTier[] = [
  'free',
  'starter',
  'professional',
  'business',
  'enterprise',
];

/**
 * Check if a user's tier has access to a feature.
 *
 * @param userTier - The user's current subscription tier
 * @param feature - The feature to check access for
 * @returns true if the user's tier is >= the required tier
 */
export function hasFeatureAccess(userTier: PlanTier, feature: Feature): boolean {
  const requiredTier = FEATURE_MATRIX[feature];
  if (!requiredTier) return false;

  const userTierIndex = TIER_HIERARCHY.indexOf(userTier);
  const requiredTierIndex = TIER_HIERARCHY.indexOf(requiredTier);

  if (userTierIndex === -1 || requiredTierIndex === -1) return false;

  return userTierIndex >= requiredTierIndex;
}

/**
 * Get the minimum tier required for a feature.
 */
export function getRequiredTier(feature: Feature): PlanTier {
  return FEATURE_MATRIX[feature];
}

/**
 * Get all features available for a given tier.
 */
export function getFeaturesForTier(tier: PlanTier): Feature[] {
  const tierIndex = TIER_HIERARCHY.indexOf(tier);
  if (tierIndex === -1) return [];

  return (Object.entries(FEATURE_MATRIX) as [Feature, PlanTier][])
    .filter(([, requiredTier]) => {
      const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
      return tierIndex >= requiredIndex;
    })
    .map(([feature]) => feature);
}

/**
 * Compare two tiers.
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareTiers(a: PlanTier, b: PlanTier): number {
  return TIER_HIERARCHY.indexOf(a) - TIER_HIERARCHY.indexOf(b);
}

/**
 * Normalize tier string (handles legacy values).
 */
export function normalizeTier(tierString: string | null | undefined): PlanTier {
  if (!tierString) return 'free';

  const normalized = tierString.toLowerCase();
  const legacyMap: Record<string, PlanTier> = {
    'solo': 'starter',
    'team': 'professional',
    'pro': 'professional',
  };

  if (legacyMap[normalized]) return legacyMap[normalized];
  if (TIER_HIERARCHY.includes(normalized as PlanTier)) return normalized as PlanTier;

  return 'free';
}
