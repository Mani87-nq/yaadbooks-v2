/**
 * Feature Matrix Unit Tests
 * 
 * Tests for YaadBooks tier permission system.
 * These tests verify the core access control logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FEATURE_MATRIX,
  TIER_LIMITS,
  hasFeature,
  getTierLimits,
  canAccessModule,
  isValidTier,
  isValidFeature,
  getTierLevel,
  compareTiers,
  getRequiredTier,
  getAvailableFeatures,
  getLockedFeatures,
  isUnlimited,
  isWithinLimit,
  getNextTier,
  getUpgradeTierForFeature,
  getFeatureForRoute,
  type Tier,
  type Feature,
  type TierLimits,
} from '../feature-matrix';

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe('FEATURE_MATRIX', () => {
  it('should have all 20 features defined', () => {
    const features = Object.keys(FEATURE_MATRIX);
    expect(features).toHaveLength(20);
  });

  it('should have core features available at free tier', () => {
    expect(FEATURE_MATRIX.core_accounting).toBe('free');
    expect(FEATURE_MATRIX.expense_tracking).toBe('free');
    expect(FEATURE_MATRIX.basic_reports).toBe('free');
    expect(FEATURE_MATRIX.gct_calculation).toBe('free');
  });

  it('should have starter features at starter tier', () => {
    expect(FEATURE_MATRIX.pos).toBe('starter');
    expect(FEATURE_MATRIX.inventory).toBe('starter');
    expect(FEATURE_MATRIX.payroll).toBe('starter');
    expect(FEATURE_MATRIX.bank_reconciliation).toBe('starter');
    expect(FEATURE_MATRIX.offline_mode).toBe('starter');
  });

  it('should have professional features at professional tier', () => {
    expect(FEATURE_MATRIX.employee_portal).toBe('professional');
    expect(FEATURE_MATRIX.ai_assistant).toBe('professional');
    expect(FEATURE_MATRIX.whatsapp_notifications).toBe('professional');
    expect(FEATURE_MATRIX.industry_modules).toBe('professional');
  });

  it('should have business features at business tier', () => {
    expect(FEATURE_MATRIX.multi_location).toBe('business');
    expect(FEATURE_MATRIX.advanced_analytics).toBe('business');
    expect(FEATURE_MATRIX.custom_reports).toBe('business');
    expect(FEATURE_MATRIX.api_access).toBe('business');
  });

  it('should have enterprise features at enterprise tier', () => {
    expect(FEATURE_MATRIX.custom_integrations).toBe('enterprise');
    expect(FEATURE_MATRIX.sla_guarantee).toBe('enterprise');
    expect(FEATURE_MATRIX.dedicated_support).toBe('enterprise');
  });
});

describe('TIER_LIMITS', () => {
  it('should have limits for all 5 tiers', () => {
    const tiers = Object.keys(TIER_LIMITS);
    expect(tiers).toHaveLength(5);
    expect(tiers).toContain('free');
    expect(tiers).toContain('starter');
    expect(tiers).toContain('professional');
    expect(tiers).toContain('business');
    expect(tiers).toContain('enterprise');
  });

  describe('Free tier limits', () => {
    it('should have correct limits', () => {
      const limits = TIER_LIMITS.free;
      expect(limits.users).toBe(1);
      expect(limits.companies).toBe(1);
      expect(limits.invoicesPerMonth).toBe(50);
      expect(limits.payrollEmployees).toBe(0);
      expect(limits.storageMb).toBe(500);
      expect(limits.aiQuestionsPerMonth).toBe(1);
    });
  });

  describe('Starter tier limits', () => {
    it('should have correct limits', () => {
      const limits = TIER_LIMITS.starter;
      expect(limits.users).toBe(3);
      expect(limits.companies).toBe(1);
      expect(limits.invoicesPerMonth).toBe(200);
      expect(limits.payrollEmployees).toBe(5);
      expect(limits.storageMb).toBe(2048); // 2GB
      expect(limits.aiQuestionsPerMonth).toBe(25);
    });
  });

  describe('Professional tier limits', () => {
    it('should have correct limits', () => {
      const limits = TIER_LIMITS.professional;
      expect(limits.users).toBe(-1); // Unlimited
      expect(limits.companies).toBe(3);
      expect(limits.invoicesPerMonth).toBe(-1); // Unlimited
      expect(limits.payrollEmployees).toBe(-1); // Unlimited
      expect(limits.storageMb).toBe(10240); // 10GB
      expect(limits.aiQuestionsPerMonth).toBe(500);
    });
  });

  describe('Business tier limits', () => {
    it('should have correct limits', () => {
      const limits = TIER_LIMITS.business;
      expect(limits.users).toBe(-1); // Unlimited
      expect(limits.companies).toBe(10);
      expect(limits.invoicesPerMonth).toBe(-1); // Unlimited
      expect(limits.payrollEmployees).toBe(-1); // Unlimited
      expect(limits.storageMb).toBe(51200); // 50GB
      expect(limits.aiQuestionsPerMonth).toBe(-1); // Unlimited
    });
  });

  describe('Enterprise tier limits', () => {
    it('should have all unlimited', () => {
      const limits = TIER_LIMITS.enterprise;
      expect(limits.users).toBe(-1);
      expect(limits.companies).toBe(-1);
      expect(limits.invoicesPerMonth).toBe(-1);
      expect(limits.payrollEmployees).toBe(-1);
      expect(limits.storageMb).toBe(-1);
      expect(limits.aiQuestionsPerMonth).toBe(-1);
    });
  });
});

// =============================================================================
// hasFeature() TESTS - CRITICAL ACCESS CONTROL
// =============================================================================

describe('hasFeature()', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Free tier access', () => {
    it('should have access to core_accounting', () => {
      expect(hasFeature('free', 'core_accounting')).toBe(true);
    });

    it('should have access to expense_tracking', () => {
      expect(hasFeature('free', 'expense_tracking')).toBe(true);
    });

    it('should have access to basic_reports', () => {
      expect(hasFeature('free', 'basic_reports')).toBe(true);
    });

    it('should have access to gct_calculation', () => {
      expect(hasFeature('free', 'gct_calculation')).toBe(true);
    });

    // CHECKLIST TESTS - Free cannot access
    it('should NOT have access to inventory', () => {
      expect(hasFeature('free', 'inventory')).toBe(false);
    });

    it('should NOT have access to pos', () => {
      expect(hasFeature('free', 'pos')).toBe(false);
    });

    it('should NOT have access to payroll', () => {
      expect(hasFeature('free', 'payroll')).toBe(false);
    });

    it('should NOT have access to ai_assistant', () => {
      expect(hasFeature('free', 'ai_assistant')).toBe(false);
    });

    it('should NOT have access to bank_reconciliation', () => {
      expect(hasFeature('free', 'bank_reconciliation')).toBe(false);
    });

    it('should NOT have access to employee_portal', () => {
      expect(hasFeature('free', 'employee_portal')).toBe(false);
    });

    it('should NOT have access to advanced_analytics', () => {
      expect(hasFeature('free', 'advanced_analytics')).toBe(false);
    });

    it('should NOT have access to custom_integrations', () => {
      expect(hasFeature('free', 'custom_integrations')).toBe(false);
    });
  });

  describe('Starter tier access', () => {
    // CHECKLIST TEST - Starter can access inventory
    it('should have access to inventory', () => {
      expect(hasFeature('starter', 'inventory')).toBe(true);
    });

    it('should have access to pos', () => {
      expect(hasFeature('starter', 'pos')).toBe(true);
    });

    it('should have access to payroll', () => {
      expect(hasFeature('starter', 'payroll')).toBe(true);
    });

    it('should have access to bank_reconciliation', () => {
      expect(hasFeature('starter', 'bank_reconciliation')).toBe(true);
    });

    it('should have access to offline_mode', () => {
      expect(hasFeature('starter', 'offline_mode')).toBe(true);
    });

    // Starter should inherit free features
    it('should have access to core features', () => {
      expect(hasFeature('starter', 'core_accounting')).toBe(true);
      expect(hasFeature('starter', 'expense_tracking')).toBe(true);
    });

    // Starter cannot access professional+ features
    it('should NOT have access to employee_portal', () => {
      expect(hasFeature('starter', 'employee_portal')).toBe(false);
    });

    it('should NOT have access to ai_assistant', () => {
      expect(hasFeature('starter', 'ai_assistant')).toBe(false);
    });

    it('should NOT have access to industry_modules', () => {
      expect(hasFeature('starter', 'industry_modules')).toBe(false);
    });
  });

  describe('Professional tier access', () => {
    // CHECKLIST TEST - Professional can access ai_assistant
    it('should have access to ai_assistant', () => {
      expect(hasFeature('professional', 'ai_assistant')).toBe(true);
    });

    it('should have access to employee_portal', () => {
      expect(hasFeature('professional', 'employee_portal')).toBe(true);
    });

    it('should have access to whatsapp_notifications', () => {
      expect(hasFeature('professional', 'whatsapp_notifications')).toBe(true);
    });

    it('should have access to industry_modules', () => {
      expect(hasFeature('professional', 'industry_modules')).toBe(true);
    });

    // Should inherit starter features
    it('should have access to inventory', () => {
      expect(hasFeature('professional', 'inventory')).toBe(true);
    });

    it('should have access to payroll', () => {
      expect(hasFeature('professional', 'payroll')).toBe(true);
    });

    // Cannot access business+ features
    it('should NOT have access to multi_location', () => {
      expect(hasFeature('professional', 'multi_location')).toBe(false);
    });

    it('should NOT have access to api_access', () => {
      expect(hasFeature('professional', 'api_access')).toBe(false);
    });
  });

  describe('Business tier access', () => {
    it('should have access to multi_location', () => {
      expect(hasFeature('business', 'multi_location')).toBe(true);
    });

    it('should have access to advanced_analytics', () => {
      expect(hasFeature('business', 'advanced_analytics')).toBe(true);
    });

    it('should have access to custom_reports', () => {
      expect(hasFeature('business', 'custom_reports')).toBe(true);
    });

    it('should have access to api_access', () => {
      expect(hasFeature('business', 'api_access')).toBe(true);
    });

    // Should inherit all lower tier features
    it('should have access to ai_assistant', () => {
      expect(hasFeature('business', 'ai_assistant')).toBe(true);
    });

    it('should have access to inventory', () => {
      expect(hasFeature('business', 'inventory')).toBe(true);
    });

    // Cannot access enterprise features
    it('should NOT have access to custom_integrations', () => {
      expect(hasFeature('business', 'custom_integrations')).toBe(false);
    });

    it('should NOT have access to sla_guarantee', () => {
      expect(hasFeature('business', 'sla_guarantee')).toBe(false);
    });
  });

  describe('Enterprise tier access', () => {
    it('should have access to custom_integrations', () => {
      expect(hasFeature('enterprise', 'custom_integrations')).toBe(true);
    });

    it('should have access to sla_guarantee', () => {
      expect(hasFeature('enterprise', 'sla_guarantee')).toBe(true);
    });

    it('should have access to dedicated_support', () => {
      expect(hasFeature('enterprise', 'dedicated_support')).toBe(true);
    });

    // Should have access to ALL features
    it('should have access to all lower tier features', () => {
      expect(hasFeature('enterprise', 'core_accounting')).toBe(true);
      expect(hasFeature('enterprise', 'inventory')).toBe(true);
      expect(hasFeature('enterprise', 'ai_assistant')).toBe(true);
      expect(hasFeature('enterprise', 'multi_location')).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should return false for invalid tier', () => {
      expect(hasFeature('invalid_tier', 'inventory')).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return false for invalid feature', () => {
      expect(hasFeature('professional', 'invalid_feature')).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return false for empty strings', () => {
      expect(hasFeature('', 'inventory')).toBe(false);
      expect(hasFeature('professional', '')).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      // Tiers and features should be lowercase
      expect(hasFeature('FREE', 'core_accounting')).toBe(false);
      expect(hasFeature('free', 'CORE_ACCOUNTING')).toBe(false);
    });
  });
});

// =============================================================================
// getTierLimits() TESTS
// =============================================================================

describe('getTierLimits()', () => {
  it('should return limits for free tier', () => {
    const limits = getTierLimits('free');
    expect(limits.users).toBe(1);
    expect(limits.invoicesPerMonth).toBe(50);
  });

  it('should return limits for enterprise tier', () => {
    const limits = getTierLimits('enterprise');
    expect(limits.users).toBe(-1);
    expect(limits.companies).toBe(-1);
  });

  it('should return a copy, not the original object', () => {
    const limits = getTierLimits('free');
    limits.users = 999;
    
    // Original should be unchanged
    const original = getTierLimits('free');
    expect(original.users).toBe(1);
  });

  it('should throw error for invalid tier', () => {
    expect(() => getTierLimits('invalid')).toThrow('Invalid tier: invalid');
  });
});

// =============================================================================
// canAccessModule() TESTS
// =============================================================================

describe('canAccessModule()', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Free/Starter (no access to industry modules)', () => {
    it('should deny free tier access to retail', () => {
      expect(canAccessModule('free', null, 'retail')).toBe(false);
    });

    it('should deny free tier access to restaurant', () => {
      expect(canAccessModule('free', null, 'restaurant')).toBe(false);
    });

    it('should deny starter tier access to retail', () => {
      expect(canAccessModule('starter', null, 'retail')).toBe(false);
    });
  });

  describe('Professional tier (single module access)', () => {
    it('should allow access to selected module (retail)', () => {
      expect(canAccessModule('professional', 'retail', 'retail')).toBe(true);
    });

    it('should deny access to non-selected module', () => {
      expect(canAccessModule('professional', 'retail', 'restaurant')).toBe(false);
    });

    it('should deny access to salon when retail selected', () => {
      expect(canAccessModule('professional', 'retail', 'salon')).toBe(false);
    });

    it('should allow access to core module', () => {
      expect(canAccessModule('professional', 'retail', 'core')).toBe(true);
    });

    it('should deny access when no module selected', () => {
      expect(canAccessModule('professional', null, 'retail')).toBe(false);
    });
  });

  describe('Business tier (single module access)', () => {
    it('should allow access to selected module', () => {
      expect(canAccessModule('business', 'restaurant', 'restaurant')).toBe(true);
    });

    it('should deny access to non-selected module', () => {
      expect(canAccessModule('business', 'restaurant', 'retail')).toBe(false);
    });

    it('should allow access to core module', () => {
      expect(canAccessModule('business', 'restaurant', 'core')).toBe(true);
    });
  });

  describe('Enterprise tier (all modules access)', () => {
    it('should allow access to retail', () => {
      expect(canAccessModule('enterprise', 'retail', 'retail')).toBe(true);
    });

    it('should allow access to restaurant regardless of selection', () => {
      expect(canAccessModule('enterprise', 'retail', 'restaurant')).toBe(true);
    });

    it('should allow access to salon regardless of selection', () => {
      expect(canAccessModule('enterprise', 'retail', 'salon')).toBe(true);
    });

    it('should allow access to all modules even with null selection', () => {
      expect(canAccessModule('enterprise', null, 'retail')).toBe(true);
      expect(canAccessModule('enterprise', null, 'restaurant')).toBe(true);
      expect(canAccessModule('enterprise', null, 'salon')).toBe(true);
    });

    it('should allow access to core module', () => {
      expect(canAccessModule('enterprise', null, 'core')).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should return false for invalid tier', () => {
      expect(canAccessModule('invalid', 'retail', 'retail')).toBe(false);
    });
  });
});

// =============================================================================
// VALIDATION HELPER TESTS
// =============================================================================

describe('isValidTier()', () => {
  it('should return true for valid tiers', () => {
    expect(isValidTier('free')).toBe(true);
    expect(isValidTier('starter')).toBe(true);
    expect(isValidTier('professional')).toBe(true);
    expect(isValidTier('business')).toBe(true);
    expect(isValidTier('enterprise')).toBe(true);
  });

  it('should return false for invalid tiers', () => {
    expect(isValidTier('invalid')).toBe(false);
    expect(isValidTier('premium')).toBe(false);
    expect(isValidTier('')).toBe(false);
    expect(isValidTier('FREE')).toBe(false);
  });
});

describe('isValidFeature()', () => {
  it('should return true for valid features', () => {
    expect(isValidFeature('inventory')).toBe(true);
    expect(isValidFeature('ai_assistant')).toBe(true);
    expect(isValidFeature('custom_integrations')).toBe(true);
  });

  it('should return false for invalid features', () => {
    expect(isValidFeature('invalid')).toBe(false);
    expect(isValidFeature('')).toBe(false);
    expect(isValidFeature('INVENTORY')).toBe(false);
  });
});

describe('getTierLevel()', () => {
  it('should return correct hierarchy levels', () => {
    expect(getTierLevel('free')).toBe(0);
    expect(getTierLevel('starter')).toBe(1);
    expect(getTierLevel('professional')).toBe(2);
    expect(getTierLevel('business')).toBe(3);
    expect(getTierLevel('enterprise')).toBe(4);
  });
});

describe('compareTiers()', () => {
  it('should return negative when first tier is lower', () => {
    expect(compareTiers('free', 'starter')).toBeLessThan(0);
    expect(compareTiers('starter', 'professional')).toBeLessThan(0);
  });

  it('should return positive when first tier is higher', () => {
    expect(compareTiers('enterprise', 'free')).toBeGreaterThan(0);
    expect(compareTiers('business', 'starter')).toBeGreaterThan(0);
  });

  it('should return 0 when tiers are equal', () => {
    expect(compareTiers('professional', 'professional')).toBe(0);
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('getRequiredTier()', () => {
  it('should return correct tier for features', () => {
    expect(getRequiredTier('core_accounting')).toBe('free');
    expect(getRequiredTier('inventory')).toBe('starter');
    expect(getRequiredTier('ai_assistant')).toBe('professional');
    expect(getRequiredTier('api_access')).toBe('business');
    expect(getRequiredTier('custom_integrations')).toBe('enterprise');
  });

  it('should return null for invalid feature', () => {
    expect(getRequiredTier('invalid')).toBe(null);
  });
});

describe('getAvailableFeatures()', () => {
  it('should return 4 features for free tier', () => {
    const features = getAvailableFeatures('free');
    expect(features).toHaveLength(4);
    expect(features).toContain('core_accounting');
    expect(features).toContain('expense_tracking');
    expect(features).toContain('basic_reports');
    expect(features).toContain('gct_calculation');
  });

  it('should return 9 features for starter tier', () => {
    const features = getAvailableFeatures('starter');
    expect(features).toHaveLength(9);
    expect(features).toContain('inventory');
    expect(features).toContain('pos');
    expect(features).toContain('payroll');
  });

  it('should return all 20 features for enterprise tier', () => {
    const features = getAvailableFeatures('enterprise');
    expect(features).toHaveLength(20);
  });

  it('should return empty array for invalid tier', () => {
    const features = getAvailableFeatures('invalid');
    expect(features).toHaveLength(0);
  });
});

describe('getLockedFeatures()', () => {
  it('should return 16 locked features for free tier', () => {
    const locked = getLockedFeatures('free');
    expect(locked).toHaveLength(16);
    expect(locked).toContain('inventory');
    expect(locked).toContain('custom_integrations');
  });

  it('should return no locked features for enterprise tier', () => {
    const locked = getLockedFeatures('enterprise');
    expect(locked).toHaveLength(0);
  });
});

describe('isUnlimited()', () => {
  it('should return true for -1', () => {
    expect(isUnlimited(-1)).toBe(true);
  });

  it('should return false for other values', () => {
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(50)).toBe(false);
    expect(isUnlimited(1000)).toBe(false);
  });
});

describe('isWithinLimit()', () => {
  it('should return true when usage is below limit', () => {
    expect(isWithinLimit(10, 50)).toBe(true);
    expect(isWithinLimit(0, 1)).toBe(true);
  });

  it('should return false when usage equals or exceeds limit', () => {
    expect(isWithinLimit(50, 50)).toBe(false);
    expect(isWithinLimit(51, 50)).toBe(false);
  });

  it('should always return true for unlimited (-1)', () => {
    expect(isWithinLimit(9999999, -1)).toBe(true);
    expect(isWithinLimit(0, -1)).toBe(true);
  });
});

describe('getNextTier()', () => {
  it('should return next tier in hierarchy', () => {
    expect(getNextTier('free')).toBe('starter');
    expect(getNextTier('starter')).toBe('professional');
    expect(getNextTier('professional')).toBe('business');
    expect(getNextTier('business')).toBe('enterprise');
  });

  it('should return null for enterprise (highest)', () => {
    expect(getNextTier('enterprise')).toBe(null);
  });

  it('should return null for invalid tier', () => {
    expect(getNextTier('invalid')).toBe(null);
  });
});

describe('getUpgradeTierForFeature()', () => {
  it('should return required tier when feature is locked', () => {
    expect(getUpgradeTierForFeature('free', 'inventory')).toBe('starter');
    expect(getUpgradeTierForFeature('starter', 'ai_assistant')).toBe('professional');
    expect(getUpgradeTierForFeature('professional', 'api_access')).toBe('business');
  });

  it('should return null when feature is already accessible', () => {
    expect(getUpgradeTierForFeature('starter', 'inventory')).toBe(null);
    expect(getUpgradeTierForFeature('enterprise', 'custom_integrations')).toBe(null);
  });

  it('should return null for invalid inputs', () => {
    expect(getUpgradeTierForFeature('invalid', 'inventory')).toBe(null);
    expect(getUpgradeTierForFeature('free', 'invalid')).toBe(null);
  });
});

// =============================================================================
// ROUTE MAPPING TESTS
// =============================================================================

describe('getFeatureForRoute()', () => {
  it('should return correct feature for exact route matches', () => {
    expect(getFeatureForRoute('/admin/inventory')).toBe('inventory');
    expect(getFeatureForRoute('/admin/payroll')).toBe('payroll');
    expect(getFeatureForRoute('/admin/pos')).toBe('pos');
    expect(getFeatureForRoute('/admin/analytics')).toBe('advanced_analytics');
  });

  it('should return correct feature for nested routes', () => {
    expect(getFeatureForRoute('/admin/inventory/items')).toBe('inventory');
    expect(getFeatureForRoute('/admin/inventory/categories/add')).toBe('inventory');
    expect(getFeatureForRoute('/admin/payroll/employees')).toBe('payroll');
    expect(getFeatureForRoute('/admin/retail/products')).toBe('industry_modules');
  });

  it('should return null for unmapped routes', () => {
    expect(getFeatureForRoute('/admin/dashboard')).toBe(null);
    expect(getFeatureForRoute('/admin/settings')).toBe(null);
    expect(getFeatureForRoute('/login')).toBe(null);
  });
});

// =============================================================================
// COMPREHENSIVE FEATURE COUNT TEST
// =============================================================================

describe('All 15 key features mapped and tested', () => {
  // The checklist mentions 15 features, but we have 20 total
  // These are the critical access-controlled features
  const keyFeatures = [
    'pos',
    'inventory',
    'payroll',
    'bank_reconciliation',
    'offline_mode',
    'employee_portal',
    'ai_assistant',
    'whatsapp_notifications',
    'industry_modules',
    'multi_location',
    'advanced_analytics',
    'custom_reports',
    'api_access',
    'custom_integrations',
    'sla_guarantee',
  ];

  it('should have all 15 key features in FEATURE_MATRIX', () => {
    keyFeatures.forEach(feature => {
      expect(FEATURE_MATRIX).toHaveProperty(feature);
    });
  });

  it('should have correct tier requirements for all key features', () => {
    // Starter features
    expect(FEATURE_MATRIX.pos).toBe('starter');
    expect(FEATURE_MATRIX.inventory).toBe('starter');
    expect(FEATURE_MATRIX.payroll).toBe('starter');
    expect(FEATURE_MATRIX.bank_reconciliation).toBe('starter');
    expect(FEATURE_MATRIX.offline_mode).toBe('starter');
    
    // Professional features
    expect(FEATURE_MATRIX.employee_portal).toBe('professional');
    expect(FEATURE_MATRIX.ai_assistant).toBe('professional');
    expect(FEATURE_MATRIX.whatsapp_notifications).toBe('professional');
    expect(FEATURE_MATRIX.industry_modules).toBe('professional');
    
    // Business features
    expect(FEATURE_MATRIX.multi_location).toBe('business');
    expect(FEATURE_MATRIX.advanced_analytics).toBe('business');
    expect(FEATURE_MATRIX.custom_reports).toBe('business');
    expect(FEATURE_MATRIX.api_access).toBe('business');
    
    // Enterprise features
    expect(FEATURE_MATRIX.custom_integrations).toBe('enterprise');
    expect(FEATURE_MATRIX.sla_guarantee).toBe('enterprise');
  });
});
