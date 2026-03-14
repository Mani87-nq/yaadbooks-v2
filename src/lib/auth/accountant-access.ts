/**
 * Accountant Access Verification
 * 
 * Helpers for verifying an accountant has valid access to a client company.
 * Used by API routes and middleware to enforce accountant-client relationships.
 */
import prisma from '@/lib/db';

export type AccountantClientStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface AccountantClientAccess {
  id: string;
  accountantId: string;
  companyId: string;
  status: AccountantClientStatus;
  canAccessPayroll: boolean;
  canAccessBanking: boolean;
  canExportData: boolean;
  company: {
    id: string;
    businessName: string;
  };
}

/**
 * Check if an accountant has ACTIVE access to a specific company.
 * Returns the access record if valid, null otherwise.
 */
export async function verifyAccountantAccess(
  accountantId: string,
  companyId: string
): Promise<AccountantClientAccess | null> {
  const access = await prisma.accountantClient.findFirst({
    where: {
      accountantId,
      companyId,
      status: 'ACTIVE', // Only allow ACTIVE relationships
    },
    select: {
      id: true,
      accountantId: true,
      companyId: true,
      status: true,
      canAccessPayroll: true,
      canAccessBanking: true,
      canExportData: true,
      company: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  return access as AccountantClientAccess | null;
}

/**
 * Get all companies an accountant can access (ACTIVE status only).
 */
export async function getAccountantClientCompanies(
  accountantId: string
): Promise<string[]> {
  const clients = await prisma.accountantClient.findMany({
    where: {
      accountantId,
      status: 'ACTIVE',
    },
    select: {
      companyId: true,
    },
  });

  return clients.map(c => c.companyId);
}

/**
 * Get all company IDs a user can access (direct memberships + accountant clients).
 */
export async function getAllAccessibleCompanies(userId: string): Promise<string[]> {
  const [directMemberships, accountantClients] = await Promise.all([
    // Direct company memberships
    prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    }),
    // Accountant-client relationships
    prisma.accountantClient.findMany({
      where: {
        accountantId: userId,
        status: 'ACTIVE',
      },
      select: { companyId: true },
    }),
  ]);

  const allCompanyIds = new Set([
    ...directMemberships.map(m => m.companyId),
    ...accountantClients.map(c => c.companyId),
  ]);

  return Array.from(allCompanyIds);
}

/**
 * Check if an accountant can access a specific feature for a client.
 * Some features (payroll, banking, export) can be restricted per-client.
 */
export async function checkAccountantFeatureAccess(
  accountantId: string,
  companyId: string,
  feature: 'payroll' | 'banking' | 'export'
): Promise<boolean> {
  const access = await verifyAccountantAccess(accountantId, companyId);
  
  if (!access) return false;

  switch (feature) {
    case 'payroll':
      return access.canAccessPayroll;
    case 'banking':
      return access.canAccessBanking;
    case 'export':
      return access.canExportData;
    default:
      return false;
  }
}

/**
 * Get detailed accountant context for UI rendering.
 * Includes whether user is in "accountant view" mode.
 */
export interface AccountantViewContext {
  isAccountantView: boolean;
  accountantId: string | null;
  clientCompanyId: string | null;
  clientCompanyName: string | null;
  canAccessPayroll: boolean;
  canAccessBanking: boolean;
  canExportData: boolean;
}

export async function getAccountantViewContext(
  userId: string,
  userRole: string,
  activeCompanyId: string | null
): Promise<AccountantViewContext> {
  const isAccountantRole = ['ACCOUNTANT', 'ADMIN', 'OWNER'].includes(userRole);
  
  if (!isAccountantRole || !activeCompanyId) {
    return {
      isAccountantView: false,
      accountantId: null,
      clientCompanyId: null,
      clientCompanyName: null,
      canAccessPayroll: false,
      canAccessBanking: false,
      canExportData: false,
    };
  }

  // Check if this is an accountant-client relationship (not direct membership)
  const access = await verifyAccountantAccess(userId, activeCompanyId);
  
  if (!access) {
    // User is viewing their own company (direct membership)
    return {
      isAccountantView: false,
      accountantId: null,
      clientCompanyId: null,
      clientCompanyName: null,
      canAccessPayroll: true, // Full access to own company
      canAccessBanking: true,
      canExportData: true,
    };
  }

  // User is in accountant view mode
  return {
    isAccountantView: true,
    accountantId: userId,
    clientCompanyId: access.companyId,
    clientCompanyName: access.company.businessName,
    canAccessPayroll: access.canAccessPayroll,
    canAccessBanking: access.canAccessBanking,
    canExportData: access.canExportData,
  };
}
