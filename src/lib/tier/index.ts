/**
 * Tier Module - Subscription-based Feature Gating
 *
 * Usage:
 *   import { withFeatureCheck, hasFeatureAccess, FEATURE_MATRIX } from '@/lib/tier';
 */

export {
  FEATURE_MATRIX,
  hasFeatureAccess,
  getRequiredTier,
  getFeaturesForTier,
  compareTiers,
  normalizeTier,
  type PlanTier,
  type Feature,
} from './feature-matrix';

export {
  withFeatureCheck,
  protectRoute,
  checkFeatureAccess,
  tierBlockedResponse,
  type ApiHandler,
  type TierBlockedLog,
} from './middleware';
