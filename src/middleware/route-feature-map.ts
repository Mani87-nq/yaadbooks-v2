/**
 * Route-to-Feature Mapping for YaadBooks.
 * 
 * Maps URL patterns to required features for middleware enforcement.
 * Used by Next.js middleware to check feature access on page navigation.
 */

import type { FeatureKey, IndustryModule } from '@/lib/permissions/feature-matrix';

// ─── Route Pattern Types ──────────────────────────────────────────

interface RouteFeatureRule {
  pattern: RegExp;
  feature: FeatureKey;
  module?: IndustryModule;  // For industry-specific routes
}

// ─── Page Routes ──────────────────────────────────────────────────

export const PAGE_ROUTE_FEATURES: RouteFeatureRule[] = [
  // ─── Inventory Routes ───────────────────────────────────────────
  { pattern: /^\/admin\/inventory(\/.*)?$/, feature: 'inventory' },
  { pattern: /^\/admin\/purchase-orders(\/.*)?$/, feature: 'inventory' },
  { pattern: /^\/admin\/goods-received(\/.*)?$/, feature: 'inventory' },

  // ─── Payroll Routes ─────────────────────────────────────────────
  { pattern: /^\/admin\/payroll(\/.*)?$/, feature: 'payroll' },
  { pattern: /^\/admin\/payslips(\/.*)?$/, feature: 'payroll' },

  // ─── POS Routes ─────────────────────────────────────────────────
  { pattern: /^\/admin\/pos(\/.*)?$/, feature: 'pos' },
  { pattern: /^\/pos(\/.*)?$/, feature: 'pos' },
  { pattern: /^\/terminal(\/.*)?$/, feature: 'pos' },

  // ─── Bank Reconciliation ────────────────────────────────────────
  { pattern: /^\/admin\/bank-reconciliation(\/.*)?$/, feature: 'bank_reconciliation' },
  { pattern: /^\/admin\/banking\/reconcile(\/.*)?$/, feature: 'bank_reconciliation' },

  // ─── Employee Portal ────────────────────────────────────────────
  { pattern: /^\/admin\/employee-portal(\/.*)?$/, feature: 'employee_portal' },
  { pattern: /^\/admin\/kiosk(\/.*)?$/, feature: 'employee_portal' },
  { pattern: /^\/admin\/time-clock(\/.*)?$/, feature: 'employee_portal' },
  { pattern: /^\/employee(\/.*)?$/, feature: 'employee_portal' },

  // ─── AI Assistant ───────────────────────────────────────────────
  { pattern: /^\/admin\/ai(\/.*)?$/, feature: 'ai_assistant' },
  { pattern: /^\/admin\/chat(\/.*)?$/, feature: 'ai_assistant' },
  { pattern: /^\/admin\/assistant(\/.*)?$/, feature: 'ai_assistant' },

  // ─── Advanced Analytics ─────────────────────────────────────────
  { pattern: /^\/admin\/analytics(\/.*)?$/, feature: 'advanced_analytics' },
  { pattern: /^\/admin\/insights(\/.*)?$/, feature: 'advanced_analytics' },
  { pattern: /^\/admin\/dashboard\/advanced(\/.*)?$/, feature: 'advanced_analytics' },

  // ─── Custom Reports ─────────────────────────────────────────────
  { pattern: /^\/admin\/custom-reports(\/.*)?$/, feature: 'custom_reports' },
  { pattern: /^\/admin\/report-builder(\/.*)?$/, feature: 'custom_reports' },

  // ─── Multi-Location ─────────────────────────────────────────────
  { pattern: /^\/admin\/locations(\/.*)?$/, feature: 'multi_location' },
  { pattern: /^\/admin\/branches(\/.*)?$/, feature: 'multi_location' },

  // ─── API Access ─────────────────────────────────────────────────
  { pattern: /^\/admin\/api-settings(\/.*)?$/, feature: 'api_access' },
  { pattern: /^\/admin\/api-keys(\/.*)?$/, feature: 'api_access' },
  { pattern: /^\/admin\/developer(\/.*)?$/, feature: 'api_access' },
  { pattern: /^\/admin\/webhooks(\/.*)?$/, feature: 'api_access' },

  // ─── Custom Integrations ────────────────────────────────────────
  { pattern: /^\/admin\/integrations(\/.*)?$/, feature: 'custom_integrations' },

  // ─── Industry Modules: Retail ───────────────────────────────────
  { pattern: /^\/admin\/retail(\/.*)?$/, feature: 'industry_modules', module: 'retail' },
  { pattern: /^\/admin\/loyalty(\/.*)?$/, feature: 'industry_modules', module: 'retail' },
  { pattern: /^\/admin\/promotions(\/.*)?$/, feature: 'industry_modules', module: 'retail' },
  { pattern: /^\/admin\/members(\/.*)?$/, feature: 'industry_modules', module: 'retail' },

  // ─── Industry Modules: Restaurant ───────────────────────────────
  { pattern: /^\/admin\/restaurant(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/admin\/menu(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/admin\/tables(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/admin\/kitchen(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/admin\/reservations(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/admin\/orders(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },

  // ─── Industry Modules: Salon ────────────────────────────────────
  { pattern: /^\/admin\/salon(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
  { pattern: /^\/admin\/appointments(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
  { pattern: /^\/admin\/services(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
  { pattern: /^\/admin\/stylists(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
  { pattern: /^\/admin\/walkins(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
];

// ─── API Routes ───────────────────────────────────────────────────

export const API_ROUTE_FEATURES: RouteFeatureRule[] = [
  // ─── Inventory APIs ─────────────────────────────────────────────
  { pattern: /^\/api\/v1\/inventory(\/.*)?$/, feature: 'inventory' },
  { pattern: /^\/api\/v1\/purchase-orders(\/.*)?$/, feature: 'inventory' },
  { pattern: /^\/api\/v1\/goods-received(\/.*)?$/, feature: 'inventory' },
  { pattern: /^\/api\/inventory(\/.*)?$/, feature: 'inventory' },

  // ─── Payroll APIs ───────────────────────────────────────────────
  { pattern: /^\/api\/v1\/payroll(\/.*)?$/, feature: 'payroll' },
  { pattern: /^\/api\/payroll(\/.*)?$/, feature: 'payroll' },

  // ─── POS APIs ───────────────────────────────────────────────────
  { pattern: /^\/api\/v1\/pos(\/.*)?$/, feature: 'pos' },
  { pattern: /^\/api\/pos(\/.*)?$/, feature: 'pos' },

  // ─── Bank Reconciliation APIs ───────────────────────────────────
  { pattern: /^\/api\/v1\/bank-reconciliation(\/.*)?$/, feature: 'bank_reconciliation' },
  { pattern: /^\/api\/banking\/reconcile(\/.*)?$/, feature: 'bank_reconciliation' },

  // ─── Employee Portal APIs ───────────────────────────────────────
  { pattern: /^\/api\/employee(\/.*)?$/, feature: 'employee_portal' },
  { pattern: /^\/api\/v1\/employees\/clock(\/.*)?$/, feature: 'employee_portal' },
  { pattern: /^\/api\/v1\/employees\/kiosk(\/.*)?$/, feature: 'employee_portal' },

  // ─── AI APIs ────────────────────────────────────────────────────
  { pattern: /^\/api\/v1\/ai(\/.*)?$/, feature: 'ai_assistant' },
  { pattern: /^\/api\/chat(\/.*)?$/, feature: 'ai_assistant' },

  // ─── Analytics APIs ─────────────────────────────────────────────
  { pattern: /^\/api\/v1\/analytics(\/.*)?$/, feature: 'advanced_analytics' },

  // ─── Custom Reports APIs ────────────────────────────────────────
  { pattern: /^\/api\/v1\/reports\/custom(\/.*)?$/, feature: 'custom_reports' },
  { pattern: /^\/api\/reports\/custom(\/.*)?$/, feature: 'custom_reports' },

  // ─── External API Access (v1 endpoints for external use) ────────
  // Note: Some v1 endpoints are for internal use, this is for explicitly external ones
  { pattern: /^\/api\/external(\/.*)?$/, feature: 'api_access' },

  // ─── Multi-Location APIs ────────────────────────────────────────
  { pattern: /^\/api\/v1\/locations(\/.*)?$/, feature: 'multi_location' },

  // ─── Integrations APIs ──────────────────────────────────────────
  { pattern: /^\/api\/v1\/integrations(\/.*)?$/, feature: 'custom_integrations' },
  { pattern: /^\/api\/webhooks(\/.*)?$/, feature: 'custom_integrations' },

  // ─── Industry Module APIs: Retail ───────────────────────────────
  { pattern: /^\/api\/v1\/retail(\/.*)?$/, feature: 'industry_modules', module: 'retail' },
  { pattern: /^\/api\/v1\/loyalty(\/.*)?$/, feature: 'industry_modules', module: 'retail' },
  { pattern: /^\/api\/v1\/promotions(\/.*)?$/, feature: 'industry_modules', module: 'retail' },

  // ─── Industry Module APIs: Restaurant ───────────────────────────
  { pattern: /^\/api\/v1\/restaurant(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/api\/v1\/menu(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/api\/v1\/tables(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },
  { pattern: /^\/api\/v1\/kitchen(\/.*)?$/, feature: 'industry_modules', module: 'restaurant' },

  // ─── Industry Module APIs: Salon ────────────────────────────────
  { pattern: /^\/api\/v1\/salon(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
  { pattern: /^\/api\/v1\/appointments(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
  { pattern: /^\/api\/v1\/services(\/.*)?$/, feature: 'industry_modules', module: 'salon' },
];

// ─── Lookup Functions ─────────────────────────────────────────────

/**
 * Find the feature requirement for a page route.
 */
export function getPageFeatureRequirement(pathname: string): RouteFeatureRule | null {
  for (const rule of PAGE_ROUTE_FEATURES) {
    if (rule.pattern.test(pathname)) {
      return rule;
    }
  }
  return null;
}

/**
 * Find the feature requirement for an API route.
 */
export function getApiFeatureRequirement(pathname: string): RouteFeatureRule | null {
  for (const rule of API_ROUTE_FEATURES) {
    if (rule.pattern.test(pathname)) {
      return rule;
    }
  }
  return null;
}

/**
 * Check if a route requires any feature (page or API).
 */
export function requiresFeatureCheck(pathname: string): boolean {
  return !!(getPageFeatureRequirement(pathname) || getApiFeatureRequirement(pathname));
}

// ─── Public Route Whitelist ───────────────────────────────────────

/**
 * Routes that should never be feature-gated (auth, public pages, etc.)
 */
export const PUBLIC_ROUTES = [
  /^\/$/,
  /^\/login(\/.*)?$/,
  /^\/register(\/.*)?$/,
  /^\/forgot-password(\/.*)?$/,
  /^\/reset-password(\/.*)?$/,
  /^\/verify-email(\/.*)?$/,
  /^\/pricing(\/.*)?$/,
  /^\/about(\/.*)?$/,
  /^\/contact(\/.*)?$/,
  /^\/terms(\/.*)?$/,
  /^\/privacy(\/.*)?$/,
  /^\/api\/auth(\/.*)?$/,
  /^\/api\/health(\/.*)?$/,
  /^\/api\/billing\/webhook(\/.*)?$/,
  /^\/_next(\/.*)?$/,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(pattern => pattern.test(pathname));
}
