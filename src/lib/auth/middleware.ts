/**
 * Auth middleware utilities for API route handlers.
 * Extracts and verifies the JWT from the Authorization header,
 * checks RBAC permissions, and scopes queries to the active company.
 */
import { NextRequest } from 'next/server';
import { verifyAccessToken, type AccessTokenPayload } from './jwt';
import { hasPermission, type Permission, type Role } from './rbac';
import { unauthorized, forbidden } from '@/lib/api-error';

/**
 * Extract and verify the access token from the request.
 * Returns the decoded payload or null if invalid/missing.
 */
export async function getAuthUser(request: NextRequest): Promise<AccessTokenPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns the user payload or throws an API error response.
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return { user: null, error: unauthorized() };
  }
  return { user, error: null };
}

/**
 * Require authentication + specific permission.
 */
export async function requirePermission(request: NextRequest, permission: Permission) {
  const { user, error } = await requireAuth(request);
  if (error) return { user: null, error };

  if (!hasPermission(user!.role as Role, permission)) {
    return { user: null, error: forbidden(`Missing permission: ${permission}`) };
  }

  return { user: user!, error: null };
}

/**
 * Get the active company ID from the authenticated user.
 * All data queries should be scoped to this company.
 */
export function getCompanyId(user: AccessTokenPayload): string | null {
  return user.activeCompanyId;
}

/**
 * Require that the user has an active company selected.
 */
export function requireCompany(user: AccessTokenPayload) {
  const companyId = getCompanyId(user);
  if (!companyId) {
    return { companyId: null, error: forbidden('No active company selected') };
  }
  // Verify user actually belongs to this company
  if (!user.companies.includes(companyId)) {
    return { companyId: null, error: forbidden('Not a member of this company') };
  }
  return { companyId, error: null };
}

/**
 * Check if the user is currently operating in accountant mode.
 * (i.e., viewing a client's books rather than their own company)
 */
export interface AccountantContext {
  isAccountantView: boolean;  // True when accountant is viewing client's books
  accountantId: string | null; // The accountant's user ID
  clientCompanyId: string | null; // The client company being viewed
}

export function getAccountantContext(user: AccessTokenPayload): AccountantContext {
  // If user has ACCOUNTANT role and is accessing a company that isn't
  // their "home" company, they're in accountant view mode.
  // The token's companies[] includes all companies they can access
  // (both their own memberships AND accountant-client relationships)
  
  // For now, we determine accountant view by checking:
  // 1. User role is ACCOUNTANT (or higher with accountant capabilities)
  // 2. The activeCompanyId is in their companies list but came from AccountantClient
  
  // Note: The full check requires DB access - this is a lightweight token-based check
  const isAccountant = ['ACCOUNTANT', 'ADMIN', 'OWNER'].includes(user.role);
  
  return {
    isAccountantView: isAccountant && user.activeCompanyId !== null,
    accountantId: isAccountant ? user.sub : null,
    clientCompanyId: user.activeCompanyId,
  };
}

/**
 * Require accountant permissions for multi-client features.
 * Only ACCOUNTANT, ADMIN, and OWNER roles can use accountant features.
 */
export async function requireAccountantRole(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return { user: null, error };

  const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
  if (!allowedRoles.includes(user!.role)) {
    return { user: null, error: forbidden('Accountant role required') };
  }

  return { user: user!, error: null };
}
