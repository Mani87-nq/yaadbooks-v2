'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Modal, Button } from '@/components/ui';
import { useTier, type TierFeature, TIER_ORDER, getPlan } from '@/hooks/useTier';
import {
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  ArrowRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
  StarIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/solid';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: TierFeature;
  requiredTier: string;
}

// Feature display names
const FEATURE_NAMES: Record<TierFeature, string> = {
  invoices: 'Invoicing',
  expenses: 'Expense Tracking',
  customers: 'Customer Management',
  basic_reports: 'Basic Reports',
  gct_compliance: 'GCT Compliance',
  inventory: 'Inventory Management',
  payroll: 'Payroll & Compliance',
  bank_reconciliation: 'Bank Reconciliation',
  all_reports: 'All Report Types',
  multiple_users: 'Multiple Users',
  pos: 'Point of Sale System',
  employee_portal: 'Employee Portal',
  kiosk_mode: 'Kiosk Mode',
  industry_modules: 'Industry Modules',
  ai_assistant: 'AI Business Assistant',
  whatsapp_notifications: 'WhatsApp Notifications',
  multi_location: 'Multi-Location Support',
  advanced_analytics: 'Advanced Analytics',
  custom_reports: 'Custom Report Builder',
  api_access: 'API Access',
  unlimited_modules: 'Unlimited Modules',
  custom_integrations: 'Custom Integrations',
};

// Tier icons
const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  free: SparklesIcon,
  starter: RocketLaunchIcon,
  professional: StarIcon,
  business: BuildingOfficeIcon,
  enterprise: BuildingOfficeIcon,
};

// Key benefits by tier
const TIER_BENEFITS: Record<string, string[]> = {
  starter: [
    'Unlimited Invoicing',
    'Inventory Management',
    'Payroll for up to 5 employees',
    'Bank Reconciliation',
    'All 11 Report Types',
    'Up to 3 Users',
  ],
  professional: [
    'Everything in Starter, plus:',
    'Full POS System',
    'Employee Portal & Kiosk',
    '1 Industry Module',
    'AI Business Assistant',
    'WhatsApp Notifications',
    'Unlimited Users',
  ],
  business: [
    'Everything in Professional, plus:',
    '1 Module + ALL Sub-Modules',
    'Multi-Location Support (up to 3)',
    'Advanced Analytics',
    'Custom Report Builder',
    'Dedicated Support Rep',
  ],
  enterprise: [
    'Everything in Business, plus:',
    'ALL Industry Modules',
    'Unlimited Locations',
    'API Access',
    'Custom Integrations',
    'Onboarding & Training',
    'Priority Support',
  ],
};

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  requiredTier,
}: UpgradeModalProps) {
  const router = useRouter();
  const { tier, tierName } = useTier();
  
  const requiredPlan = getPlan(requiredTier);
  const requiredTierName = requiredPlan?.name || requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);
  const featureName = FEATURE_NAMES[feature] || feature;
  const RequiredIcon = TIER_ICONS[requiredTier] || StarIcon;
  const CurrentIcon = TIER_ICONS[tier] || SparklesIcon;
  
  const benefits = TIER_BENEFITS[requiredTier] || [];
  const currentTierIndex = TIER_ORDER.indexOf(tier);
  const requiredTierIndex = TIER_ORDER.indexOf(requiredTier);
  
  const handleUpgrade = () => {
    onClose();
    router.push('/billing?upgrade=' + requiredTier);
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
    >
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
              <LockClosedIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Unlock {featureName}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This feature requires the <span className="font-semibold text-emerald-600 dark:text-emerald-400">{requiredTierName}</span> plan or higher
          </p>
        </div>
        
        {/* Tier Comparison */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Current Tier */}
          <div className="flex flex-col items-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 min-w-[120px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 mb-2">
              <CurrentIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tierName}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Current</span>
          </div>
          
          {/* Arrow */}
          <ArrowRightIcon className="h-6 w-6 text-emerald-500" />
          
          {/* Required Tier */}
          <div className="flex flex-col items-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 dark:border-emerald-400 min-w-[120px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 dark:bg-emerald-500 mb-2">
              <RequiredIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{requiredTierName}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Required</span>
          </div>
        </div>
        
        {/* Benefits */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            What you&apos;ll get with {requiredTierName}:
          </h3>
          <ul className="space-y-2">
            {benefits.map((benefit, idx) => {
              const isHeader = benefit.includes('Everything in');
              return (
                <li key={idx} className="flex items-start gap-2">
                  {isHeader ? (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {benefit}
                    </span>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{benefit}</span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        
        {/* Pricing Preview */}
        {requiredPlan && requiredPlan.priceJmd > 0 && (
          <div className="text-center mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              J${requiredPlan.priceJmd.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              or ${requiredPlan.priceUsd.toFixed(2)} USD · Save 2 months with annual billing
            </p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Maybe Later
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleUpgrade}
            icon={<ArrowRightIcon className="h-4 w-4" />}
          >
            Upgrade Now
          </Button>
        </div>
        
        {/* Trial Notice */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Start with a 14-day free trial · No credit card required
        </p>
      </div>
    </Modal>
  );
}

export default UpgradeModal;
