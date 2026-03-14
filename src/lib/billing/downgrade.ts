/**
 * Downgrade Protection
 * 
 * Handles tier downgrades while PRESERVING ALL DATA.
 * Data is never deleted - only features are locked based on the new tier.
 * 
 * Key principle: Users can always upgrade to restore access to their data.
 */

import prisma from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';
import { getPlan, type SubscriptionPlan } from './plans';

export interface DowngradeResult {
  success: boolean;
  companyId: string;
  oldTier: string;
  newTier: string;
  actionsPerformed: string[];
  message: string;
}

/**
 * Handle tier downgrade.
 * 
 * NEVER deletes data - only locks features based on new tier limits.
 * 
 * Actions performed on downgrade:
 * - Update subscription plan in database
 * - Disable API keys if downgrading from Business/Enterprise
 * - Lock premium features based on new tier
 * - Create notification for user
 * - Log audit event with full details
 */
export async function handleDowngrade(
  companyId: string,
  oldTier: string,
  newTier: string
): Promise<DowngradeResult> {
  const actionsPerformed: string[] = [];

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: { select: { id: true } },
      },
    });

    if (!company) {
      return {
        success: false,
        companyId,
        oldTier,
        newTier,
        actionsPerformed,
        message: 'Company not found',
      };
    }

    // Get plan details for both tiers
    const oldPlan = getPlan(oldTier.toLowerCase());
    const newPlan = getPlan(newTier.toLowerCase());

    if (!newPlan) {
      return {
        success: false,
        companyId,
        oldTier,
        newTier,
        actionsPerformed,
        message: `Invalid target tier: ${newTier}`,
      };
    }

    // ─── 1. Update Subscription Plan ───────────────────────────────
    const normalizedNewTier = newTier.toUpperCase() as any;
    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionPlan: normalizedNewTier,
      },
    });
    actionsPerformed.push(`Updated tier: ${oldTier} → ${newTier}`);

    // ─── 2. API Keys (Future Feature) ───────────────────────────────
    // Note: API key management will be added in a future version
    // When implemented, downgrade logic should revoke API keys if
    // the new tier doesn't support API access

    // ─── 3. Handle Module Access ───────────────────────────────────
    // Note: We don't delete module data, just lock access via tier checks
    // The checkModuleAccess() function in plans.ts handles runtime access control
    if (oldPlan && newPlan) {
      const oldModuleCount = oldPlan.includesModules;
      const newModuleCount = newPlan.includesModules;
      
      if (newModuleCount !== -1 && (oldModuleCount === -1 || oldModuleCount > newModuleCount)) {
        actionsPerformed.push(`Module access reduced: ${oldModuleCount === -1 ? 'unlimited' : oldModuleCount} → ${newModuleCount}`);
      }
    }

    // ─── 4. Handle POS Access ───────────────────────────────────────
    if (oldPlan?.includesPOS && !newPlan.includesPOS) {
      actionsPerformed.push('POS access locked (data preserved)');
    }

    // ─── 5. Handle Employee Portal Access ───────────────────────────
    if (oldPlan?.includesEmployeePortal && !newPlan.includesEmployeePortal) {
      actionsPerformed.push('Employee portal access locked (data preserved)');
    }

    // ─── 6. Handle User Limits ──────────────────────────────────────
    // Note: We don't remove users, just prevent adding more
    if (newPlan.maxUsers !== -1 && (!oldPlan || oldPlan.maxUsers === -1 || oldPlan.maxUsers > newPlan.maxUsers)) {
      actionsPerformed.push(`User limit changed to ${newPlan.maxUsers}`);
    }

    // ─── 7. Handle Invoice Limits ───────────────────────────────────
    if (newPlan.maxInvoicesPerMonth !== -1 && (!oldPlan || oldPlan.maxInvoicesPerMonth === -1)) {
      actionsPerformed.push(`Invoice limit set to ${newPlan.maxInvoicesPerMonth}/month`);
    }

    // ─── 8. Create Notification ─────────────────────────────────────
    await prisma.notification.create({
      data: {
        companyId,
        type: 'SYSTEM',
        priority: 'MEDIUM',
        title: 'Subscription Plan Changed',
        message: getDowngradeMessage(oldTier, newTier, actionsPerformed),
        link: '/settings/billing',
        relatedType: 'billing',
      },
    });

    // ─── 9. Audit Log ───────────────────────────────────────────────
    await auditLog({
      companyId,
      userId: company.ownerId,
      action: 'UPDATE',
      entityType: 'Subscription',
      entityId: companyId,
      entityLabel: company.businessName,
      before: {
        subscriptionPlan: oldTier,
      },
      after: {
        subscriptionPlan: newTier,
        actionsPerformed,
        dataPreserved: true, // Explicit flag that data was not deleted
      },
    });

    console.log(`[Downgrade] Completed - Company: ${companyId}, ${oldTier} → ${newTier}`, actionsPerformed);

    return {
      success: true,
      companyId,
      oldTier,
      newTier,
      actionsPerformed,
      message: `Successfully downgraded from ${oldTier} to ${newTier}. All data preserved.`,
    };

  } catch (error) {
    console.error(`[Downgrade] Error:`, error);
    return {
      success: false,
      companyId,
      oldTier,
      newTier,
      actionsPerformed,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a downgrade would affect specific features.
 * Useful for showing users what they'll lose before they cancel.
 */
export async function previewDowngrade(
  companyId: string,
  newTier: string
): Promise<{
  willLoseFeatures: string[];
  willLockData: string[];
  activeApiKeys: number;
  currentUsers: number;
  newUserLimit: number;
}> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      members: true,
    },
  });

  if (!company) {
    return {
      willLoseFeatures: [],
      willLockData: [],
      activeApiKeys: 0,
      currentUsers: 0,
      newUserLimit: 1,
    };
  }

  const currentPlan = getPlan(company.subscriptionPlan?.toLowerCase() || 'free');
  const targetPlan = getPlan(newTier.toLowerCase());

  const willLoseFeatures: string[] = [];
  const willLockData: string[] = [];

  if (!targetPlan) {
    return {
      willLoseFeatures: ['Invalid target tier'],
      willLockData: [],
      activeApiKeys: 0, // API keys feature not yet implemented
      currentUsers: company.members.length,
      newUserLimit: 1,
    };
  }

  // Check API access (Future feature)
  // Note: API key management will be added in a future version
  if (currentPlan?.id === 'enterprise' && targetPlan.id !== 'enterprise') {
    willLoseFeatures.push('API Access');
  }

  // Check POS
  if (currentPlan?.includesPOS && !targetPlan.includesPOS) {
    willLoseFeatures.push('Point of Sale (POS)');
  }

  // Check Employee Portal
  if (currentPlan?.includesEmployeePortal && !targetPlan.includesEmployeePortal) {
    willLoseFeatures.push('Employee Portal & Kiosk');
  }

  // Check modules
  if (currentPlan && targetPlan.includesModules !== -1) {
    if (currentPlan.includesModules === -1 || currentPlan.includesModules > targetPlan.includesModules) {
      willLoseFeatures.push(`Industry Modules (reduced to ${targetPlan.includesModules})`);
    }
  }

  // Check user limits
  if (targetPlan.maxUsers !== -1 && company.members.length > targetPlan.maxUsers) {
    willLockData.push(`${company.members.length - targetPlan.maxUsers} user(s) will exceed new limit`);
  }

  return {
    willLoseFeatures,
    willLockData,
    activeApiKeys: 0, // API keys feature not yet implemented
    currentUsers: company.members.length,
    newUserLimit: targetPlan.maxUsers,
  };
}

/**
 * Restore features after upgrade (reverse of downgrade).
 * Re-enables API keys that were disabled due to downgrade.
 * Note: API key management will be added in a future version.
 */
export async function handleUpgradeRestore(
  companyId: string,
  newTier: string
): Promise<{ restoredApiKeys: number }> {
  // API key management not yet implemented
  // When implemented, this function should restore API keys
  // that were disabled during downgrade
  const _newPlan = getPlan(newTier.toLowerCase());
  void _newPlan; // Placeholder for future use
  void companyId; // Placeholder for future use
  
  return { restoredApiKeys: 0 };
}

// ─── Helper Functions ─────────────────────────────────────────────

function getDowngradeMessage(oldTier: string, newTier: string, actions: string[]): string {
  if (actions.length === 1) {
    return `Your plan has been changed from ${oldTier} to ${newTier}. All your data has been preserved.`;
  }

  return `Your plan has been changed from ${oldTier} to ${newTier}. ${actions.length} changes were made. All your data has been preserved - upgrade anytime to restore full access.`;
}
