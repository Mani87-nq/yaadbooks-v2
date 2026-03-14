/**
 * Client-safe billing plan definitions and formatting helpers.
 *
 * This module contains ONLY pure data and functions that are safe
 * to import in client components. Server-side functions (Stripe,
 * Prisma) remain in service.ts.
 */

// ─── Plan Definitions ─────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceJmd: number;           // Monthly JMD
  priceJmdAnnual: number;     // Annual JMD (2 months free = 10x monthly)
  priceUsd: number;           // Monthly USD (for Stripe processing)
  priceUsdAnnual: number;     // Annual USD (for Stripe processing)
  maxUsers: number;           // -1 = unlimited
  maxCompanies: number;
  maxInvoicesPerMonth: number; // -1 = unlimited
  includesModules: number;    // Number of industry modules included
  includesPOS: boolean;
  includesEmployeePortal: boolean;
  features: string[];
  popular?: boolean;          // Highlight on pricing page
}

// JMD/USD approximate rate: 155 JMD = 1 USD (as of Feb 2026)
// Prices set in both currencies to avoid exchange rate drift

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    priceJmd: 0,
    priceJmdAnnual: 0,
    priceUsd: 0,
    priceUsdAnnual: 0,
    maxUsers: 1,
    maxCompanies: 1,
    maxInvoicesPerMonth: 50,
    includesModules: 0,
    includesPOS: false,
    includesEmployeePortal: false,
    features: [
      'Basic Invoicing (50/month)',
      'Expense Tracking',
      'GCT Compliance',
      'Basic Reports',
      '1 User',
      'Email Support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceJmd: 3499,
    priceJmdAnnual: 34990,
    priceUsd: 22.50,
    priceUsdAnnual: 225.00,
    maxUsers: 3,
    maxCompanies: 1,
    maxInvoicesPerMonth: -1,
    includesModules: 0,
    includesPOS: false,
    includesEmployeePortal: false,
    features: [
      'Unlimited Invoicing & Quotations',
      'Inventory Management',
      'Payroll & Compliance (PAYE, NIS, NHT, EdTax)',
      'Bank Reconciliation',
      'GCT & Tax Reports',
      'All 11 Report Types',
      'Up to 3 Users',
      'Email Support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    priceJmd: 7499,
    priceJmdAnnual: 74990,
    priceUsd: 48.25,
    priceUsdAnnual: 482.50,
    maxUsers: -1,
    maxCompanies: 1,
    maxInvoicesPerMonth: -1,
    includesModules: 1,
    includesPOS: true,
    includesEmployeePortal: true,
    popular: true,
    features: [
      'Everything in Starter, plus:',
      '1 Industry Module (Retail, Restaurant, or Salon)',
      'POS System',
      'Employee Portal & Kiosk Mode',
      'UNLIMITED Users & Terminals',
      'AI Business Assistant',
      // HIDDEN: WhatsApp not yet implemented
      // 'WhatsApp Notifications',
      'Priority Support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    priceJmd: 13999,
    priceJmdAnnual: 139990,
    priceUsd: 90.00,
    priceUsdAnnual: 900.00,
    maxUsers: -1,
    maxCompanies: 3,
    maxInvoicesPerMonth: -1,
    includesModules: 1,
    includesPOS: true,
    includesEmployeePortal: true,
    features: [
      'Everything in Professional, plus:',
      '1 Industry Module + ALL Sub-Modules',
      'Multi-Location Support (up to 3)',
      'Advanced Analytics Dashboard',
      'Offline Mode (Full POS)',
      'Custom Report Builder',
      'Dedicated Support Rep',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceJmd: 22999,
    priceJmdAnnual: 229990,
    priceUsd: 148.00,
    priceUsdAnnual: 1480.00,
    maxUsers: -1,
    maxCompanies: -1,
    maxInvoicesPerMonth: -1,
    includesModules: -1,
    includesPOS: true,
    includesEmployeePortal: true,
    features: [
      'Everything in Business, plus:',
      'ALL Industry Modules Included',
      'Unlimited Locations',
      'Unlimited Companies',
      'API Access',
      'Custom Integrations',
      'Onboarding & Training',
      // HIDDEN: WhatsApp not yet implemented
      // 'Priority Phone & WhatsApp Support',
      'Priority Phone Support',
    ],
  },
];

// ─── Add-On Pricing ───────────────────────────────────────────────

export interface AddOn {
  id: string;
  name: string;
  priceJmd: number;
  priceUsd: number;
  description: string;
}

export const ADD_ONS: AddOn[] = [
  {
    id: 'additional-module',
    name: 'Additional Industry Module',
    priceJmd: 2999,
    priceUsd: 19.30,
    description: 'Add another industry module (Retail, Restaurant, Salon, etc.)',
  },
  {
    id: 'sub-module',
    name: 'Individual Sub-Module',
    priceJmd: 1499,
    priceUsd: 9.65,
    description: 'Add a specific sub-module (Loyalty, Time Clock, etc.)',
  },
  {
    id: 'extra-location',
    name: 'Additional Location',
    priceJmd: 1999,
    priceUsd: 12.85,
    description: 'Add another business location',
  },
];

// ─── Plan Lookup ──────────────────────────────────────────────────

/**
 * Map legacy plan IDs to new tier structure.
 */
export function migrateLegacyPlanId(planId: string): string {
  const map: Record<string, string> = {
    'solo': 'starter',
    'team': 'professional',
    'pro': 'professional',
    'free': 'free',
    'starter': 'starter',
    'professional': 'professional',
    'business': 'business',
    'enterprise': 'enterprise',
  };
  return map[planId.toLowerCase()] || 'free';
}

export function getPlan(planId: string): SubscriptionPlan | undefined {
  const normalized = migrateLegacyPlanId(planId);
  return PLANS.find(p => p.id === normalized);
}

export function checkPlanLimits(
  planId: string,
  currentUsers: number,
  currentCompanies: number
): { withinLimits: boolean; userLimit: number; companyLimit: number } {
  const plan = getPlan(planId);
  if (!plan) return { withinLimits: false, userLimit: 0, companyLimit: 0 };

  const withinLimits =
    (plan.maxUsers === -1 || currentUsers <= plan.maxUsers) &&
    (plan.maxCompanies === -1 || currentCompanies <= plan.maxCompanies);

  return { withinLimits, userLimit: plan.maxUsers, companyLimit: plan.maxCompanies };
}

export function checkModuleAccess(planId: string, activeModuleCount: number): boolean {
  const plan = getPlan(planId);
  if (!plan) return false;
  if (plan.includesModules === -1) return true;
  return activeModuleCount <= plan.includesModules;
}

// ─── Formatting Helpers ───────────────────────────────────────────

export function formatJmd(amount: number): string {
  if (amount === 0) return 'Free';
  return `J$${amount.toLocaleString('en-JM')}`;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return 'Free';
  return `$${amount.toFixed(2)} USD`;
}

export type BillingInterval = 'month' | 'year';
