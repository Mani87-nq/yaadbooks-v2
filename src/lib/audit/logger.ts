/**
 * YaadBooks Comprehensive Audit Logger
 * 
 * Central audit logging system for all tier-related and critical business actions.
 * Designed to be non-blocking and fail-safe - audit failures never break the app.
 * 
 * @module audit/logger
 */

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Comprehensive audit action types for tier lockdown and business operations.
 * These map to the AuditAction enum in Prisma for generic actions,
 * with extended metadata for specific business actions.
 */
export type TierAuditAction =
  // Invoice actions
  | 'INVOICE_CREATED'
  | 'INVOICE_EDITED'
  | 'INVOICE_DELETED'
  | 'INVOICE_VOIDED'
  | 'INVOICE_LIMIT_REACHED'
  // Payroll actions
  | 'PAYROLL_RUN_CREATED'
  | 'PAYROLL_RUN_APPROVED'
  | 'PAYROLL_RUN_PAID'
  | 'PAYROLL_LIMIT_REACHED'
  // User/Team actions
  | 'USER_INVITED'
  | 'USER_JOINED'
  | 'USER_REMOVED'
  | 'USER_ROLE_CHANGED'
  | 'USER_LIMIT_REACHED'
  // Tier/Subscription actions
  | 'TIER_UPGRADED'
  | 'TIER_DOWNGRADED'
  | 'TIER_CHANGED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_RECOVERED'
  | 'GRACE_PERIOD_STARTED'
  | 'GRACE_PERIOD_ENDED'
  // Access control actions
  | 'ACCESS_BLOCKED'
  | 'FEATURE_LOCKED'
  | 'MODULE_BLOCKED'
  | 'RATE_LIMITED'
  // Data actions
  | 'DATA_EXPORTED'
  | 'DATA_IMPORTED'
  | 'BULK_DELETE'
  // Module actions
  | 'MODULE_SELECTED'
  | 'MODULE_CHANGED'
  | 'MODULE_ACTIVATED'
  | 'MODULE_DEACTIVATED'
  // Admin actions
  | 'ADMIN_IMPERSONATE_START'
  | 'ADMIN_IMPERSONATE_END'
  | 'ADMIN_OVERRIDE'
  | 'ADMIN_MANUAL_ADJUSTMENT'
  // Security actions
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'SUSPICIOUS_ACTIVITY'
  // Storage actions
  | 'STORAGE_LIMIT_REACHED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  // AI actions
  | 'AI_QUESTION_ASKED'
  | 'AI_LIMIT_REACHED';

export interface AuditLogInput {
  action: TierAuditAction;
  companyId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  req?: Request | null; // For IP and user agent extraction
}

export interface ExtractedContext {
  ipAddress: string | null;
  userAgent: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Sensitive fields that should be redacted from audit logs.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'bankAccountNumber',
  'creditCard',
  'ssn',
  'trnNumber', // Jamaica Tax Registration Number
  'nisNumber', // National Insurance Number
]);

/**
 * Map tier audit actions to the AuditAction enum.
 * This allows us to use specific action types while storing
 * in the generic enum format.
 */
const ACTION_TO_ENUM_MAP: Record<TierAuditAction, string> = {
  // Create actions
  INVOICE_CREATED: 'CREATE',
  PAYROLL_RUN_CREATED: 'CREATE',
  USER_INVITED: 'CREATE',
  USER_JOINED: 'CREATE',
  MODULE_ACTIVATED: 'CREATE',
  FILE_UPLOADED: 'CREATE',
  AI_QUESTION_ASKED: 'CREATE',
  
  // Update actions
  INVOICE_EDITED: 'UPDATE',
  TIER_UPGRADED: 'UPDATE',
  TIER_DOWNGRADED: 'UPDATE',
  TIER_CHANGED: 'UPDATE',
  USER_ROLE_CHANGED: 'UPDATE',
  MODULE_SELECTED: 'UPDATE',
  MODULE_CHANGED: 'UPDATE',
  PASSWORD_CHANGED: 'UPDATE',
  TWO_FACTOR_ENABLED: 'UPDATE',
  TWO_FACTOR_DISABLED: 'UPDATE',
  ADMIN_MANUAL_ADJUSTMENT: 'UPDATE',
  PAYMENT_RECOVERED: 'UPDATE',
  
  // Delete actions
  INVOICE_DELETED: 'DELETE',
  USER_REMOVED: 'DELETE',
  MODULE_DEACTIVATED: 'DELETE',
  FILE_DELETED: 'DELETE',
  BULK_DELETE: 'DELETE',
  INVOICE_VOIDED: 'DELETE',
  
  // Approve actions
  PAYROLL_RUN_APPROVED: 'APPROVE',
  PAYROLL_RUN_PAID: 'APPROVE',
  
  // Security alert actions
  ACCESS_BLOCKED: 'SECURITY_ALERT',
  FEATURE_LOCKED: 'SECURITY_ALERT',
  MODULE_BLOCKED: 'SECURITY_ALERT',
  RATE_LIMITED: 'SECURITY_ALERT',
  SUSPICIOUS_ACTIVITY: 'SECURITY_ALERT',
  LOGIN_FAILED: 'SECURITY_ALERT',
  PAYMENT_FAILED: 'SECURITY_ALERT',
  GRACE_PERIOD_STARTED: 'SECURITY_ALERT',
  GRACE_PERIOD_ENDED: 'SECURITY_ALERT',
  INVOICE_LIMIT_REACHED: 'SECURITY_ALERT',
  PAYROLL_LIMIT_REACHED: 'SECURITY_ALERT',
  USER_LIMIT_REACHED: 'SECURITY_ALERT',
  STORAGE_LIMIT_REACHED: 'SECURITY_ALERT',
  AI_LIMIT_REACHED: 'SECURITY_ALERT',
  ADMIN_OVERRIDE: 'SECURITY_ALERT',
  
  // Login/Logout
  LOGIN_SUCCESS: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // Export/Import
  DATA_EXPORTED: 'EXPORT',
  DATA_IMPORTED: 'IMPORT',
  
  // Admin impersonation
  ADMIN_IMPERSONATE_START: 'LOGIN',
  ADMIN_IMPERSONATE_END: 'LOGOUT',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract IP address and user agent from a request.
 */
export function extractRequestContext(req: Request | null | undefined): ExtractedContext {
  if (!req) {
    return { ipAddress: null, userAgent: null };
  }

  // Try various headers for IP (Cloudflare, proxies, etc.)
  const ipAddress =
    req.headers.get('cf-connecting-ip') || // Cloudflare
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;

  const userAgent = req.headers.get('user-agent') || null;

  return { ipAddress, userAgent };
}

/**
 * Sanitize data by removing sensitive fields.
 */
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitize(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Get the AuditAction enum value for a tier audit action.
 */
function getAuditActionEnum(action: TierAuditAction): string {
  return ACTION_TO_ENUM_MAP[action] || 'CREATE';
}

// =============================================================================
// MAIN AUDIT FUNCTION
// =============================================================================

/**
 * Log an audit event. This function is designed to be fail-safe - 
 * it will never throw an error that could break the calling code.
 * 
 * @param input - The audit log input
 * @returns Promise<void> - Always resolves, never rejects
 * 
 * @example
 * await auditLog({
 *   action: 'INVOICE_CREATED',
 *   companyId: 'company-123',
 *   userId: 'user-456',
 *   metadata: {
 *     invoiceId: 'inv-789',
 *     invoiceNumber: 'INV-001',
 *     amount: 15000,
 *     currency: 'JMD',
 *   },
 *   req: request,
 * });
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    const { action, companyId, userId, metadata, req } = input;

    // Extract request context
    const { ipAddress, userAgent } = extractRequestContext(req);

    // Sanitize metadata
    const sanitizedMetadata = metadata ? sanitize(metadata) : {};

    // Get the enum action
    const enumAction = getAuditActionEnum(action);

    // Create the audit log entry
    await prisma.auditLog.create({
      data: {
        companyId: companyId ?? undefined,
        userId: userId ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action: enumAction as any,
        entityType: action, // Store the specific action type as entityType
        entityId: (sanitizedMetadata.entityId as string) || 'N/A',
        oldValues: Prisma.JsonNull,
        newValues: sanitizedMetadata as Prisma.InputJsonValue,
        changedFields: [],
        ipAddress,
        userAgent,
        reason: (sanitizedMetadata.reason as string) || null,
        notes: JSON.stringify({
          tierAction: action,
          timestamp: new Date().toISOString(),
          ...sanitizedMetadata,
        }),
      },
    });
  } catch (error) {
    // Audit logging should NEVER throw - log to console in dev only
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuditLog] Failed to write audit log:', error);
    }
    // In production, silently fail - we don't want audit issues to break the app
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Log an invoice-related action.
 */
export async function auditInvoice(
  action: 'INVOICE_CREATED' | 'INVOICE_EDITED' | 'INVOICE_DELETED' | 'INVOICE_VOIDED',
  invoiceId: string,
  invoiceNumber: string,
  companyId: string,
  userId: string,
  metadata?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await auditLog({
    action,
    companyId,
    userId,
    metadata: {
      entityId: invoiceId,
      invoiceId,
      invoiceNumber,
      ...metadata,
    },
    req,
  });
}

/**
 * Log a payroll-related action.
 */
export async function auditPayroll(
  action: 'PAYROLL_RUN_CREATED' | 'PAYROLL_RUN_APPROVED' | 'PAYROLL_RUN_PAID',
  payrollRunId: string,
  companyId: string,
  userId: string,
  metadata?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await auditLog({
    action,
    companyId,
    userId,
    metadata: {
      entityId: payrollRunId,
      payrollRunId,
      ...metadata,
    },
    req,
  });
}

/**
 * Log a user/team action.
 */
export async function auditUserAction(
  action: 'USER_INVITED' | 'USER_JOINED' | 'USER_REMOVED' | 'USER_ROLE_CHANGED',
  targetUserId: string,
  targetEmail: string,
  companyId: string,
  actorUserId: string,
  metadata?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await auditLog({
    action,
    companyId,
    userId: actorUserId,
    metadata: {
      entityId: targetUserId,
      targetUserId,
      targetEmail,
      ...metadata,
    },
    req,
  });
}

/**
 * Log a tier/subscription change.
 */
export async function auditTierChange(
  action: 'TIER_UPGRADED' | 'TIER_DOWNGRADED' | 'TIER_CHANGED',
  companyId: string,
  userId: string,
  previousTier: string,
  newTier: string,
  metadata?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await auditLog({
    action,
    companyId,
    userId,
    metadata: {
      entityId: companyId,
      previousTier,
      newTier,
      ...metadata,
    },
    req,
  });
}

/**
 * Log a blocked access attempt.
 */
export async function auditAccessBlocked(
  reason: 'feature_locked' | 'limit_reached' | 'tier_required' | 'module_blocked' | 'payment_failed',
  companyId: string,
  userId: string,
  details: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await auditLog({
    action: 'ACCESS_BLOCKED',
    companyId,
    userId,
    metadata: {
      entityId: companyId,
      blockReason: reason,
      ...details,
    },
    req,
  });
}

/**
 * Log a data export action.
 */
export async function auditDataExport(
  exportType: string,
  companyId: string,
  userId: string,
  recordCount: number,
  metadata?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await auditLog({
    action: 'DATA_EXPORTED',
    companyId,
    userId,
    metadata: {
      entityId: companyId,
      exportType,
      recordCount,
      ...metadata,
    },
    req,
  });
}

/**
 * Log a module selection/change.
 */
export async function auditModuleChange(
  action: 'MODULE_SELECTED' | 'MODULE_CHANGED' | 'MODULE_ACTIVATED' | 'MODULE_DEACTIVATED',
  moduleId: string,
  companyId: string,
  userId: string,
  previousModule?: string | null,
  metadata?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  await auditLog({
    action,
    companyId,
    userId,
    metadata: {
      entityId: moduleId,
      moduleId,
      previousModule,
      ...metadata,
    },
    req,
  });
}

/**
 * Log a payment failure.
 */
export async function auditPaymentFailed(
  companyId: string,
  userId: string | null,
  failureReason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    action: 'PAYMENT_FAILED',
    companyId,
    userId,
    metadata: {
      entityId: companyId,
      failureReason,
      ...metadata,
    },
  });
}

/**
 * Log a limit being reached.
 */
export async function auditLimitReached(
  limitType: 'invoice' | 'payroll' | 'user' | 'storage' | 'ai',
  companyId: string,
  userId: string,
  currentUsage: number,
  limit: number,
  req?: Request
): Promise<void> {
  const actionMap = {
    invoice: 'INVOICE_LIMIT_REACHED',
    payroll: 'PAYROLL_LIMIT_REACHED',
    user: 'USER_LIMIT_REACHED',
    storage: 'STORAGE_LIMIT_REACHED',
    ai: 'AI_LIMIT_REACHED',
  } as const;

  await auditLog({
    action: actionMap[limitType],
    companyId,
    userId,
    metadata: {
      entityId: companyId,
      limitType,
      currentUsage,
      limit,
    },
    req,
  });
}
