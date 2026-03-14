/**
 * YaadBooks Usage Counter Functions
 * 
 * These functions increment usage counters AFTER successful operations.
 * Call these after an action completes successfully, not before.
 * 
 * The enforcement.ts functions check limits BEFORE actions.
 * This file tracks usage AFTER actions.
 */

import prisma from '@/lib/db';

// ─── Invoice Counter ───────────────────────────────────────────────

/**
 * Increment the monthly invoice count for a company.
 * Call this after successfully creating an invoice (including drafts).
 * 
 * IMPORTANT: Drafts count. Deleted invoices also count against the limit.
 * 
 * @param companyId - The company that created the invoice
 * @returns The new invoice count
 */
export async function incrementInvoiceCount(companyId: string): Promise<number> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      invoiceCountThisMonth: { increment: 1 },
    },
    select: {
      invoiceCountThisMonth: true,
    },
  });

  return company.invoiceCountThisMonth;
}

/**
 * Decrement the monthly invoice count for a company.
 * Call this if an invoice creation is rolled back (not for deletions - deletions still count).
 * 
 * @param companyId - The company 
 * @returns The new invoice count
 */
export async function decrementInvoiceCount(companyId: string): Promise<number> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      invoiceCountThisMonth: { decrement: 1 },
    },
    select: {
      invoiceCountThisMonth: true,
    },
  });

  // Ensure we don't go below 0
  if (company.invoiceCountThisMonth < 0) {
    await prisma.company.update({
      where: { id: companyId },
      data: { invoiceCountThisMonth: 0 },
    });
    return 0;
  }

  return company.invoiceCountThisMonth;
}

// ─── AI Question Counter ───────────────────────────────────────────

/**
 * Increment the monthly AI question count for a company.
 * Call this after successfully processing an AI assistant question.
 * 
 * Note: AI limits are tracked at the company level, not per-user.
 * 
 * @param companyId - The company using the AI assistant
 * @returns The new AI question count
 */
export async function incrementAICount(companyId: string): Promise<number> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      aiQuestionsThisMonth: { increment: 1 },
    },
    select: {
      aiQuestionsThisMonth: true,
    },
  });

  return company.aiQuestionsThisMonth;
}

// ─── Storage Counter ───────────────────────────────────────────────

/**
 * Increment storage usage for a company.
 * Call this after successfully uploading a file.
 * 
 * @param companyId - The company uploading the file
 * @param bytes - Number of bytes uploaded
 * @returns The new storage usage in MB
 */
export async function incrementStorageUsed(
  companyId: string,
  bytes: number
): Promise<number> {
  // Convert bytes to MB (round up to ensure we account for all storage)
  const mbToAdd = Math.ceil(bytes / (1024 * 1024));

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      storageUsedMb: { increment: mbToAdd },
    },
    select: {
      storageUsedMb: true,
    },
  });

  return company.storageUsedMb;
}

/**
 * Decrement storage usage for a company.
 * Call this after successfully deleting a file.
 * 
 * @param companyId - The company that deleted the file
 * @param bytes - Number of bytes deleted
 * @returns The new storage usage in MB
 */
export async function decrementStorageUsed(
  companyId: string,
  bytes: number
): Promise<number> {
  // Convert bytes to MB (round down when decrementing to be conservative)
  const mbToRemove = Math.floor(bytes / (1024 * 1024));

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      storageUsedMb: { decrement: mbToRemove },
    },
    select: {
      storageUsedMb: true,
    },
  });

  // Ensure we don't go below 0
  if (company.storageUsedMb < 0) {
    await prisma.company.update({
      where: { id: companyId },
      data: { storageUsedMb: 0 },
    });
    return 0;
  }

  return company.storageUsedMb;
}

/**
 * Set exact storage usage for a company.
 * Useful for recalculating storage after auditing files.
 * 
 * @param companyId - The company
 * @param totalMb - Total storage used in MB
 */
export async function setStorageUsed(
  companyId: string,
  totalMb: number
): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: {
      storageUsedMb: Math.max(0, totalMb),
    },
  });
}

// ─── Monthly Reset (Cron Job) ──────────────────────────────────────

/**
 * Reset monthly counters for all companies.
 * Should be called by a cron job at the start of each billing cycle.
 * 
 * This resets:
 * - invoiceCountThisMonth
 * - aiQuestionsThisMonth
 * 
 * NOTE: Each company's billingCycleStart may differ. For simplicity,
 * this resets all companies on the 1st of each month. For per-company
 * billing cycles, use resetCompanyMonthlyCounters instead.
 * 
 * @returns Number of companies reset
 */
export async function resetMonthlyCounters(): Promise<number> {
  const result = await prisma.company.updateMany({
    data: {
      invoiceCountThisMonth: 0,
      aiQuestionsThisMonth: 0,
      billingCycleStart: new Date(),
    },
  });

  return result.count;
}

/**
 * Reset monthly counters for companies whose billing cycle has ended.
 * More precise than resetMonthlyCounters - respects individual billing dates.
 * 
 * @returns Number of companies reset
 */
export async function resetExpiredBillingCycles(): Promise<number> {
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Find companies where billing cycle started more than a month ago
  const expiredCompanies = await prisma.company.findMany({
    where: {
      OR: [
        { billingCycleStart: null },
        { billingCycleStart: { lt: oneMonthAgo } },
      ],
    },
    select: { id: true },
  });

  if (expiredCompanies.length === 0) return 0;

  const ids = expiredCompanies.map(c => c.id);

  const result = await prisma.company.updateMany({
    where: { id: { in: ids } },
    data: {
      invoiceCountThisMonth: 0,
      aiQuestionsThisMonth: 0,
      billingCycleStart: now,
    },
  });

  return result.count;
}

/**
 * Reset monthly counters for a specific company.
 * Call this when a company upgrades/downgrades their plan.
 * 
 * @param companyId - The company to reset
 */
export async function resetCompanyMonthlyCounters(companyId: string): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: {
      invoiceCountThisMonth: 0,
      aiQuestionsThisMonth: 0,
      billingCycleStart: new Date(),
    },
  });
}

// ─── Usage Statistics ──────────────────────────────────────────────

export interface CompanyUsageStats {
  invoiceCountThisMonth: number;
  aiQuestionsThisMonth: number;
  storageUsedMb: number;
  billingCycleStart: Date | null;
  daysUntilReset: number;
}

/**
 * Get current usage statistics for a company.
 * Useful for displaying usage dashboards.
 * 
 * @param companyId - The company to check
 * @returns Usage statistics
 */
export async function getUsageStats(companyId: string): Promise<CompanyUsageStats | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      invoiceCountThisMonth: true,
      aiQuestionsThisMonth: true,
      storageUsedMb: true,
      billingCycleStart: true,
    },
  });

  if (!company) return null;

  // Calculate days until next reset
  let daysUntilReset = 0;
  if (company.billingCycleStart) {
    const cycleStart = new Date(company.billingCycleStart);
    const nextReset = new Date(cycleStart);
    nextReset.setMonth(nextReset.getMonth() + 1);
    
    const now = new Date();
    const diffMs = nextReset.getTime() - now.getTime();
    daysUntilReset = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    invoiceCountThisMonth: company.invoiceCountThisMonth,
    aiQuestionsThisMonth: company.aiQuestionsThisMonth,
    storageUsedMb: company.storageUsedMb,
    billingCycleStart: company.billingCycleStart,
    daysUntilReset,
  };
}
