/**
 * Middleware exports for YaadBooks tier-based access control.
 * 
 * @example
 * // In an API route:
 * import { requireFeature, checkInvoiceLimit } from '@/middleware';
 * 
 * export async function POST(request: NextRequest) {
 *   const { user, error } = await requireFeature(request, 'inventory');
 *   if (error) return error;
 *   
 *   // Feature access granted, proceed...
 * }
 */

// Feature access middleware
export {
  requireFeature,
  requireModule,
  requireAllFeatures,
  withFeature,
  withModule,
} from './requireFeature';

// Limit enforcement middleware
export {
  checkUserLimit,
  checkCompanyLimit,
  checkInvoiceLimit,
  checkPayrollLimit,
  checkAiLimit,
  checkStorageLimit,
  checkLocationLimit,
  incrementInvoiceCount,
  incrementAiCount,
  updateStorageUsage,
  getUsageSummary,
} from './requireLimit';

// Route mapping
export {
  PAGE_ROUTE_FEATURES,
  API_ROUTE_FEATURES,
  getPageFeatureRequirement,
  getApiFeatureRequirement,
  requiresFeatureCheck,
  isPublicRoute,
} from './route-feature-map';
