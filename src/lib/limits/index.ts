/**
 * YaadBooks Tier Limits Module
 * 
 * Usage:
 * 
 * // Check limits before allowing an action
 * import { checkInvoiceLimit, checkUserLimit } from '@/lib/limits';
 * 
 * const result = await checkInvoiceLimit(companyId);
 * if (!result.allowed) {
 *   return { error: result.message };
 * }
 * 
 * // Increment counters after successful actions
 * import { incrementInvoiceCount } from '@/lib/limits';
 * 
 * await createInvoice(data);
 * await incrementInvoiceCount(companyId);
 */

// Limit enforcement (check before actions)
export {
  type SubscriptionTier,
  type LimitCheckResult,
  checkUserLimit,
  checkCompanyLimit,
  checkInvoiceLimit,
  checkPayrollLimit,
  checkStorageLimit,
  checkAILimit,
  checkAllLimits,
  getTierLimits,
  LIMITS,
} from './enforcement';

// Usage counters (increment after actions)
export {
  type CompanyUsageStats,
  incrementInvoiceCount,
  decrementInvoiceCount,
  incrementAICount,
  incrementStorageUsed,
  decrementStorageUsed,
  setStorageUsed,
  resetMonthlyCounters,
  resetExpiredBillingCycles,
  resetCompanyMonthlyCounters,
  getUsageStats,
} from './counter';
