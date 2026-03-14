/**
 * YaadBooks Audit Module
 * 
 * Centralized exports for all audit-related functionality.
 * 
 * @module audit
 */

// Main audit logger
export {
  auditLog,
  auditInvoice,
  auditPayroll,
  auditUserAction,
  auditTierChange,
  auditAccessBlocked,
  auditDataExport,
  auditModuleChange,
  auditPaymentFailed,
  auditLimitReached,
  extractRequestContext,
  type TierAuditAction,
  type AuditLogInput,
  type ExtractedContext,
} from './logger';

// Admin impersonation
export {
  startImpersonation,
  endImpersonation,
  validateImpersonationToken,
  getActiveImpersonationSessions,
  cleanupExpiredImpersonationSessions,
  isImpersonationSession,
  getImpersonatingAdminId,
  type ImpersonationSession,
  type StartImpersonationResult,
  type EndImpersonationResult,
  type ValidateImpersonationResult,
} from './admin-impersonation';
