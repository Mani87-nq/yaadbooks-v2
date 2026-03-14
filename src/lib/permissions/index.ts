/**
 * Permission system exports for YaadBooks.
 * 
 * @example
 * import { hasFeature, getTierLimits } from '@/lib/permissions';
 * 
 * if (hasFeature(user.tier, 'inventory')) {
 *   // Show inventory UI
 * }
 */

export {
  // Types
  type Tier,
  type FeatureKey,
  type IndustryModule,
  type TierLimits,
  type LimitCheckResult,
  type UpgradeInfo,
  
  // Constants
  FEATURE_MATRIX,
  TIER_LIMITS,
  
  // Feature checks
  hasFeature,
  hasAllFeatures,
  hasAnyFeature,
  getRequiredTier,
  getAvailableFeatures,
  getLockedFeatures,
  
  // Tier utilities
  getTierLevel,
  tierMeetsMinimum,
  getTierLimits,
  
  // Module access
  canAccessModule,
  
  // Upgrade info
  getUpgradeInfo,
  
  // Limit checking
  checkLimit,
} from './feature-matrix';
