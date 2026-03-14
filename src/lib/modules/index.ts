/**
 * Industry Module System Exports
 *
 * Central export point for all module-related utilities.
 *
 * @module modules
 */

// Core module access control
export {
  // Types
  type IndustryModule,
  type ModuleDefinition,
  // Constants
  MODULE_DEFINITIONS,
  // Module selection
  setSelectedModule,
  // Access control
  canAccessModule,
  needsModuleSelection,
  // Route helpers
  getModuleRoutes,
  getAvailableModuleRoutes,
  getModuleForRoute,
  checkRouteModuleAccess,
  // Utilities
  getModuleDefinition,
  getAllModules,
  isValidModule,
} from './module-access';

// API route guards
export {
  type ModuleAccessResult,
  checkModuleAccess,
  withModuleAccess,
  moduleAccessError,
} from './api-guard';
