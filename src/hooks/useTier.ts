'use client';

/**
 * useTier - Hook for tier-based feature gating
 * 
 * Provides access to the user's current subscription tier,
 * usage limits, and feature access checks.
 */

import { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { getPlan, PLANS, type SubscriptionPlan } from '@/lib/billing/plans';

// ─── Feature Definitions ────────────────────────────────────────────

export type TierFeature =
  // Core Features
  | 'invoices'
  | 'expenses'
  | 'customers'
  | 'basic_reports'
  | 'gct_compliance'
  // Starter+
  | 'inventory'
  | 'payroll'
  | 'bank_reconciliation'
  | 'all_reports'
  | 'multiple_users'
  // Professional+
  | 'pos'
  | 'employee_portal'
  | 'kiosk_mode'
  | 'industry_modules'
  | 'ai_assistant'
  | 'whatsapp_notifications'
  // Business+
  | 'multi_location'
  | 'advanced_analytics'
  | 'custom_reports'
  | 'api_access'
  // Enterprise
  | 'unlimited_modules'
  | 'custom_integrations';

// Feature → minimum tier required
const FEATURE_TIERS: Record<TierFeature, string> = {
  // Free tier features
  invoices: 'free',
  expenses: 'free',
  customers: 'free',
  basic_reports: 'free',
  gct_compliance: 'free',
  // Starter tier features
  inventory: 'starter',
  payroll: 'starter',
  bank_reconciliation: 'starter',
  all_reports: 'starter',
  multiple_users: 'starter',
  // Professional tier features
  pos: 'professional',
  employee_portal: 'professional',
  kiosk_mode: 'professional',
  industry_modules: 'professional',
  ai_assistant: 'professional',
  whatsapp_notifications: 'professional',
  // Business tier features
  multi_location: 'business',
  advanced_analytics: 'business',
  custom_reports: 'business',
  api_access: 'business',
  // Enterprise tier features
  unlimited_modules: 'enterprise',
  custom_integrations: 'enterprise',
};

// Tier hierarchy for comparison
const TIER_ORDER: string[] = ['free', 'starter', 'professional', 'business', 'enterprise'];

// ─── Limit Types ────────────────────────────────────────────────────

export type LimitType = 'invoices' | 'users' | 'companies' | 'storage' | 'ai_questions';

export interface UsageLimit {
  current: number;
  limit: number;
  unlimited: boolean;
  percentage: number;
  isApproaching: boolean; // >= 80%
  isAtLimit: boolean;     // >= 100%
}

export interface TierInfo {
  tier: string;
  tierName: string;
  plan: SubscriptionPlan | undefined;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  hasFeature: (feature: TierFeature) => boolean;
  getRequiredTier: (feature: TierFeature) => string;
  getRequiredTierName: (feature: TierFeature) => string;
  canUpgradeTo: (targetTier: string) => boolean;
  usage: Record<LimitType, UsageLimit>;
}

// ─── Hook Implementation ────────────────────────────────────────────

export function useTier(): TierInfo {
  const activeCompany = useAppStore((s) => s.activeCompany);
  const invoices = useAppStore((s) => s.invoices);
  
  const tierInfo = useMemo(() => {
    // Get current subscription plan
    const subscriptionPlan = activeCompany?.subscriptionPlan?.toLowerCase() || 'free';
    const tier = subscriptionPlan === 'trialing' ? 'starter' : subscriptionPlan;
    const plan = getPlan(tier);
    
    // Calculate trial info
    const isTrialing = activeCompany?.subscriptionStatus === 'TRIALING';
    let trialDaysRemaining: number | null = null;
    if (isTrialing && activeCompany?.subscriptionEndDate) {
      const endDate = new Date(activeCompany.subscriptionEndDate);
      const now = new Date();
      trialDaysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    // Check if user has access to a feature
    const hasFeature = (feature: TierFeature): boolean => {
      const requiredTier = FEATURE_TIERS[feature];
      const currentTierIndex = TIER_ORDER.indexOf(tier);
      const requiredTierIndex = TIER_ORDER.indexOf(requiredTier);
      return currentTierIndex >= requiredTierIndex;
    };
    
    // Get required tier for a feature
    const getRequiredTier = (feature: TierFeature): string => {
      return FEATURE_TIERS[feature];
    };
    
    // Get required tier name for a feature
    const getRequiredTierName = (feature: TierFeature): string => {
      const tierId = FEATURE_TIERS[feature];
      const tierPlan = getPlan(tierId);
      return tierPlan?.name || tierId.charAt(0).toUpperCase() + tierId.slice(1);
    };
    
    // Check if can upgrade to a target tier
    const canUpgradeTo = (targetTier: string): boolean => {
      const currentIndex = TIER_ORDER.indexOf(tier);
      const targetIndex = TIER_ORDER.indexOf(targetTier.toLowerCase());
      return targetIndex > currentIndex;
    };
    
    // Calculate usage limits
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const monthlyInvoices = invoices.filter(inv => {
      const invoiceDate = new Date(inv.createdAt);
      return invoiceDate >= currentMonthStart && inv.companyId === activeCompany?.id;
    }).length;
    
    const invoiceLimit = plan?.maxInvoicesPerMonth ?? 50;
    const userLimit = plan?.maxUsers ?? 1;
    const companyLimit = plan?.maxCompanies ?? 1;
    
    const createUsageLimit = (current: number, limit: number): UsageLimit => {
      const unlimited = limit === -1;
      const percentage = unlimited ? 0 : Math.min(100, (current / limit) * 100);
      return {
        current,
        limit: unlimited ? -1 : limit,
        unlimited,
        percentage,
        isApproaching: !unlimited && percentage >= 80 && percentage < 100,
        isAtLimit: !unlimited && percentage >= 100,
      };
    };
    
    const usage: Record<LimitType, UsageLimit> = {
      invoices: createUsageLimit(monthlyInvoices, invoiceLimit),
      users: createUsageLimit(1, userLimit), // TODO: Get actual user count from API
      companies: createUsageLimit(1, companyLimit), // TODO: Get actual company count
      storage: createUsageLimit(0, 1000), // TODO: Implement storage tracking (MB)
      ai_questions: createUsageLimit(0, tier === 'free' ? 0 : tier === 'starter' ? 0 : -1),
    };
    
    return {
      tier,
      tierName: plan?.name || 'Free',
      plan,
      isTrialing,
      trialDaysRemaining,
      hasFeature,
      getRequiredTier,
      getRequiredTierName,
      canUpgradeTo,
      usage,
    };
  }, [activeCompany, invoices]);
  
  return tierInfo;
}

// ─── Utility Exports ────────────────────────────────────────────────

export { FEATURE_TIERS, TIER_ORDER };
export { PLANS, getPlan } from '@/lib/billing/plans';
