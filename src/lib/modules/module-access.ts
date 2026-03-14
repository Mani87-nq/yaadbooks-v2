/**
 * Industry Module Access Control
 *
 * Manages module selection and access for Professional+ tiers.
 * Professional tier users select ONE module (retail/restaurant/salon).
 * Business tier gets their selected module + all sub-features.
 * Enterprise tier gets ALL modules.
 *
 * @module modules/module-access
 */

import prisma from '@/lib/db';
import { auditModuleChange } from '@/lib/audit';
import type { Tier } from '@/lib/permissions/feature-matrix';

// =============================================================================
// TYPES
// =============================================================================

export type IndustryModule = 'retail' | 'restaurant' | 'salon';

export interface ModuleDefinition {
  id: IndustryModule;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  routes: string[];
}

// =============================================================================
// MODULE DEFINITIONS
// =============================================================================

/**
 * Complete module definitions with features and route patterns.
 */
export const MODULE_DEFINITIONS: Record<IndustryModule, ModuleDefinition> = {
  retail: {
    id: 'retail',
    name: 'Retail & Loyalty',
    description: 'Complete retail management with customer loyalty, promotions, and inventory tracking.',
    icon: 'ShoppingBagIcon',
    color: 'blue',
    features: [
      'Customer loyalty points & rewards',
      'Promotion & discount campaigns',
      'Barcode scanning & label printing',
      'Stock alerts & reorder points',
      'Gift cards & store credit',
      'Multi-location inventory sync',
    ],
    routes: [
      '/admin/retail',
      '/admin/loyalty',
      '/admin/promotions',
      '/admin/gift-cards',
      '/admin/rewards',
    ],
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant & Bar',
    description: 'Full-service restaurant management with kitchen display, table service, and bar tabs.',
    icon: 'BuildingStorefrontIcon',
    color: 'orange',
    features: [
      'Kitchen Display System (KDS)',
      'Table management & floor plans',
      'Bar tab & split billing',
      'Recipe costing & menu engineering',
      'Ingredient tracking & wastage',
      'Reservation management',
    ],
    routes: [
      '/admin/restaurant',
      '/admin/kitchen',
      '/admin/tables',
      '/admin/recipes',
      '/admin/reservations',
      '/admin/bar-tabs',
    ],
  },
  salon: {
    id: 'salon',
    name: 'Salon & Spa',
    description: 'Appointment booking, stylist management, and client preferences for salons and spas.',
    icon: 'SparklesIcon',
    color: 'pink',
    features: [
      'Online appointment booking',
      'Stylist/therapist scheduling',
      'Client preferences & history',
      'Service duration tracking',
      'Commission calculations',
      'Product usage per service',
    ],
    routes: [
      '/admin/salon',
      '/admin/appointments',
      '/admin/stylists',
      '/admin/services',
      '/admin/bookings',
      '/admin/commissions',
    ],
  },
};

// =============================================================================
// MODULE SELECTION
// =============================================================================

/**
 * Sets the selected industry module for a company.
 * This is a ONE-TIME selection (requires support to change).
 *
 * @param companyId - The company ID
 * @param userId - The user making the selection (for audit)
 * @param module - The module to select
 * @param request - Optional request object for audit logging
 * @returns The updated company
 * @throws Error if company not found or module already selected
 */
export async function setSelectedModule(
  companyId: string,
  userId: string,
  module: IndustryModule,
  request?: Request
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch current company state
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        businessName: true,
        selectedModule: true,
        subscriptionPlan: true,
      },
    });

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    // Check if module already selected
    if (company.selectedModule) {
      return {
        success: false,
        error: 'Module already selected. Contact support to change your selection.',
      };
    }

    // Validate tier has access to modules
    const tier = (company.subscriptionPlan || 'FREE').toLowerCase();
    if (!['professional', 'business', 'enterprise'].includes(tier)) {
      return {
        success: false,
        error: 'Upgrade to Professional tier to select an industry module.',
      };
    }

    // Convert to Prisma enum format (uppercase)
    const prismaModule = module.toUpperCase() as 'RETAIL' | 'RESTAURANT' | 'SALON';

    // Update company with selected module
    await prisma.company.update({
      where: { id: companyId },
      data: { selectedModule: prismaModule },
    });

    // Audit log the module selection (fire-and-forget)
    auditModuleChange(
      'MODULE_SELECTED',
      module,
      companyId,
      userId,
      null, // No previous module
      {
        moduleName: MODULE_DEFINITIONS[module].name,
        tier: tier,
      },
      request
    ).catch(() => {});

    return { success: true };
  } catch (error) {
    console.error('[setSelectedModule] Error:', error);
    return {
      success: false,
      error: 'Failed to set module. Please try again.',
    };
  }
}

// =============================================================================
// ACCESS CONTROL
// =============================================================================

/**
 * Checks if a user can access a specific industry module.
 *
 * Rules:
 * - Free/Starter: No access to industry modules
 * - Professional: Only their selected module
 * - Business: Selected module + enhanced features
 * - Enterprise: ALL modules
 *
 * @param tier - User's subscription tier
 * @param selectedModule - The module selected by the company (or null)
 * @param requestedModule - The module being accessed
 * @returns true if access is allowed
 */
export function canAccessModule(
  tier: string,
  selectedModule: string | null | undefined,
  requestedModule: IndustryModule
): boolean {
  const normalizedTier = tier.toLowerCase() as Tier;

  // Free/Starter have no module access
  if (normalizedTier === 'free' || normalizedTier === 'starter') {
    return false;
  }

  // Enterprise has full access to ALL modules
  if (normalizedTier === 'enterprise') {
    return true;
  }

  // Professional and Business: must have selected a module
  if (!selectedModule) {
    return false;
  }

  // Check if requested module matches selected module
  const normalizedSelected = selectedModule.toLowerCase();
  return normalizedSelected === requestedModule;
}

/**
 * Checks if a user needs to select a module (Professional tier without selection).
 */
export function needsModuleSelection(
  tier: string,
  selectedModule: string | null | undefined
): boolean {
  const normalizedTier = tier.toLowerCase();

  // Only Professional+ tiers need to select
  if (!['professional', 'business', 'enterprise'].includes(normalizedTier)) {
    return false;
  }

  // Enterprise doesn't need to select (has all)
  if (normalizedTier === 'enterprise') {
    return false;
  }

  // Needs selection if not yet selected
  return !selectedModule;
}

// =============================================================================
// ROUTE ACCESS
// =============================================================================

/**
 * Gets all route patterns for a specific module.
 */
export function getModuleRoutes(module: IndustryModule): string[] {
  return MODULE_DEFINITIONS[module]?.routes || [];
}

/**
 * Gets all available route patterns based on tier and selected module.
 */
export function getAvailableModuleRoutes(
  tier: string,
  selectedModule: string | null | undefined
): string[] {
  const normalizedTier = tier.toLowerCase();

  // Free/Starter: no module routes
  if (normalizedTier === 'free' || normalizedTier === 'starter') {
    return [];
  }

  // Enterprise: all module routes
  if (normalizedTier === 'enterprise') {
    return Object.values(MODULE_DEFINITIONS).flatMap((m) => m.routes);
  }

  // Professional/Business: only selected module routes
  if (selectedModule) {
    const normalizedModule = selectedModule.toLowerCase() as IndustryModule;
    return getModuleRoutes(normalizedModule);
  }

  return [];
}

/**
 * Determines which module a route belongs to.
 * Returns null if route is not module-specific.
 */
export function getModuleForRoute(route: string): IndustryModule | null {
  for (const [moduleId, definition] of Object.entries(MODULE_DEFINITIONS)) {
    for (const pattern of definition.routes) {
      // Exact match or prefix match
      if (route === pattern || route.startsWith(pattern + '/')) {
        return moduleId as IndustryModule;
      }
    }
  }
  return null;
}

/**
 * Checks if a route requires module access and if the user has that access.
 *
 * @returns { allowed: true } if access granted
 * @returns { allowed: false, module, upgradeRequired } if blocked
 */
export function checkRouteModuleAccess(
  route: string,
  tier: string,
  selectedModule: string | null | undefined
): {
  allowed: boolean;
  module?: IndustryModule;
  upgradeRequired?: boolean;
  message?: string;
} {
  const routeModule = getModuleForRoute(route);

  // Route is not module-specific
  if (!routeModule) {
    return { allowed: true };
  }

  // Check access
  if (canAccessModule(tier, selectedModule, routeModule)) {
    return { allowed: true, module: routeModule };
  }

  // Determine why access was denied
  const normalizedTier = tier.toLowerCase();

  if (normalizedTier === 'free' || normalizedTier === 'starter') {
    return {
      allowed: false,
      module: routeModule,
      upgradeRequired: true,
      message: 'Upgrade to Professional tier to access industry modules.',
    };
  }

  if (!selectedModule) {
    return {
      allowed: false,
      module: routeModule,
      message: 'Please select your industry module to continue.',
    };
  }

  // User selected a different module
  return {
    allowed: false,
    module: routeModule,
    upgradeRequired: true,
    message: `This feature is part of the ${MODULE_DEFINITIONS[routeModule].name} module. Upgrade to Enterprise for access to all modules.`,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gets the module definition for a given module ID.
 */
export function getModuleDefinition(module: IndustryModule): ModuleDefinition {
  return MODULE_DEFINITIONS[module];
}

/**
 * Gets all module definitions as an array.
 */
export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_DEFINITIONS);
}

/**
 * Validates if a string is a valid module ID.
 */
export function isValidModule(module: string): module is IndustryModule {
  return module in MODULE_DEFINITIONS;
}
