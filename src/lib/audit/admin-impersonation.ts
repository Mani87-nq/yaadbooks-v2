/**
 * YaadBooks Admin Impersonation System
 * 
 * Allows admin users to impersonate other users for debugging and support.
 * All impersonation actions are fully audited and time-limited.
 * 
 * @module audit/admin-impersonation
 */

import prisma from '@/lib/db';
import { auditLog } from './logger';
import { randomBytes, createHash } from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface ImpersonationSession {
  id: string;
  adminId: string;
  targetUserId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  reason: string;
}

export interface StartImpersonationResult {
  success: boolean;
  session?: ImpersonationSession;
  error?: string;
}

export interface EndImpersonationResult {
  success: boolean;
  error?: string;
}

export interface ValidateImpersonationResult {
  valid: boolean;
  session?: ImpersonationSession;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum impersonation duration in minutes */
const MAX_IMPERSONATION_DURATION_MINUTES = 30;

/** Minimum admin role required for impersonation */
const REQUIRED_ADMIN_ROLES = ['OWNER', 'ADMIN'];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a secure impersonation token.
 */
function generateToken(): string {
  const randomPart = randomBytes(32).toString('hex');
  const timestampPart = Date.now().toString(36);
  return `imp_${timestampPart}_${randomPart}`;
}

/**
 * Hash a token for storage.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Check if a user has admin privileges.
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user ? REQUIRED_ADMIN_ROLES.includes(user.role) : false;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Start an impersonation session.
 * 
 * @param adminId - The ID of the admin user initiating impersonation
 * @param targetUserId - The ID of the user to impersonate
 * @param reason - The reason for impersonation (required for audit)
 * @param req - The request object for audit logging
 * @returns The impersonation session details
 * 
 * @example
 * const result = await startImpersonation(
 *   'admin-123',
 *   'user-456',
 *   'Customer support ticket #789 - investigating invoice issue',
 *   request
 * );
 * 
 * if (result.success) {
 *   // Store result.session.token in a secure cookie
 *   // Use it to authenticate as the target user
 * }
 */
export async function startImpersonation(
  adminId: string,
  targetUserId: string,
  reason: string,
  req?: Request
): Promise<StartImpersonationResult> {
  try {
    // Verify admin role
    const isAdmin = await isUserAdmin(adminId);
    if (!isAdmin) {
      await auditLog({
        action: 'SUSPICIOUS_ACTIVITY',
        userId: adminId,
        metadata: {
          entityId: targetUserId,
          attemptedAction: 'ADMIN_IMPERSONATE_START',
          reason: 'Non-admin user attempted impersonation',
        },
        req,
      });

      return {
        success: false,
        error: 'Unauthorized: Admin role required for impersonation',
      };
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!targetUser) {
      return {
        success: false,
        error: 'Target user not found',
      };
    }

    // Check if admin is trying to impersonate themselves
    if (adminId === targetUserId) {
      return {
        success: false,
        error: 'Cannot impersonate yourself',
      };
    }

    // Check for existing active impersonation sessions
    const existingSession = await prisma.session.findFirst({
      where: {
        userId: adminId,
        token: { startsWith: 'imp_' },
        expiresAt: { gt: new Date() },
      },
    });

    if (existingSession) {
      return {
        success: false,
        error: 'Active impersonation session exists. End it first.',
      };
    }

    // Generate token and expiration
    const token = generateToken();
    const hashedToken = hashToken(token);
    const expiresAt = new Date(Date.now() + MAX_IMPERSONATION_DURATION_MINUTES * 60 * 1000);

    // Create impersonation session
    const session = await prisma.session.create({
      data: {
        userId: targetUserId,
        token: hashedToken,
        expiresAt,
        userAgent: `IMPERSONATION:${adminId}:${reason.substring(0, 100)}`,
        ipAddress: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      },
    });

    // Audit the impersonation start
    await auditLog({
      action: 'ADMIN_IMPERSONATE_START',
      userId: adminId,
      metadata: {
        entityId: targetUserId,
        targetUserId,
        targetEmail: targetUser.email,
        targetName: `${targetUser.firstName} ${targetUser.lastName}`,
        reason,
        sessionId: session.id,
        expiresAt: expiresAt.toISOString(),
        durationMinutes: MAX_IMPERSONATION_DURATION_MINUTES,
      },
      req,
    });

    return {
      success: true,
      session: {
        id: session.id,
        adminId,
        targetUserId,
        token, // Return unhashed token for the admin to use
        expiresAt,
        createdAt: session.createdAt,
        reason,
      },
    };
  } catch (error) {
    console.error('[Impersonation] Error starting impersonation:', error);
    return {
      success: false,
      error: 'Failed to start impersonation session',
    };
  }
}

/**
 * End an impersonation session.
 * 
 * @param adminId - The ID of the admin user ending impersonation
 * @param sessionId - The ID of the impersonation session to end (optional)
 * @param req - The request object for audit logging
 * @returns Result of the operation
 * 
 * @example
 * const result = await endImpersonation('admin-123', 'session-456', request);
 * 
 * if (result.success) {
 *   // Clear the impersonation cookie
 *   // Redirect back to admin session
 * }
 */
export async function endImpersonation(
  adminId: string,
  sessionId?: string,
  req?: Request
): Promise<EndImpersonationResult> {
  try {
    // Find and delete impersonation sessions
    let deletedSessions;

    if (sessionId) {
      // Delete specific session
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (session && session.userAgent?.startsWith(`IMPERSONATION:${adminId}:`)) {
        deletedSessions = await prisma.session.delete({
          where: { id: sessionId },
        });
      } else {
        return {
          success: false,
          error: 'Session not found or not owned by admin',
        };
      }
    } else {
      // Delete all impersonation sessions for this admin
      deletedSessions = await prisma.session.deleteMany({
        where: {
          userAgent: { startsWith: `IMPERSONATION:${adminId}:` },
        },
      });
    }

    // Audit the impersonation end
    await auditLog({
      action: 'ADMIN_IMPERSONATE_END',
      userId: adminId,
      metadata: {
        entityId: adminId,
        sessionId: sessionId || 'all',
        deletedCount: sessionId ? 1 : (deletedSessions as { count: number }).count,
      },
      req,
    });

    return { success: true };
  } catch (error) {
    console.error('[Impersonation] Error ending impersonation:', error);
    return {
      success: false,
      error: 'Failed to end impersonation session',
    };
  }
}

/**
 * Validate an impersonation token.
 * 
 * @param token - The impersonation token to validate
 * @returns Validation result with session details if valid
 * 
 * @example
 * const result = await validateImpersonationToken(token);
 * 
 * if (result.valid && result.session) {
 *   // Token is valid, proceed with impersonation
 *   const targetUserId = result.session.targetUserId;
 * }
 */
export async function validateImpersonationToken(
  token: string
): Promise<ValidateImpersonationResult> {
  try {
    if (!token || !token.startsWith('imp_')) {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    const hashedToken = hashToken(token);

    const session = await prisma.session.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
        userAgent: { startsWith: 'IMPERSONATION:' },
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!session) {
      return {
        valid: false,
        error: 'Session not found or expired',
      };
    }

    // Extract admin ID from userAgent
    const adminId = session.userAgent?.split(':')[1] || '';
    const reason = session.userAgent?.split(':').slice(2).join(':') || '';

    return {
      valid: true,
      session: {
        id: session.id,
        adminId,
        targetUserId: session.userId,
        token,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        reason,
      },
    };
  } catch (error) {
    console.error('[Impersonation] Error validating token:', error);
    return {
      valid: false,
      error: 'Failed to validate token',
    };
  }
}

/**
 * Get all active impersonation sessions for an admin.
 * 
 * @param adminId - The ID of the admin user
 * @returns Array of active impersonation sessions
 */
export async function getActiveImpersonationSessions(
  adminId: string
): Promise<ImpersonationSession[]> {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userAgent: { startsWith: `IMPERSONATION:${adminId}:` },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      adminId,
      targetUserId: session.userId,
      token: '', // Don't expose token in list
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      reason: session.userAgent?.split(':').slice(2).join(':') || '',
    }));
  } catch (error) {
    console.error('[Impersonation] Error getting active sessions:', error);
    return [];
  }
}

/**
 * Clean up expired impersonation sessions.
 * Should be run periodically via cron job.
 */
export async function cleanupExpiredImpersonationSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        userAgent: { startsWith: 'IMPERSONATION:' },
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  } catch (error) {
    console.error('[Impersonation] Error cleaning up sessions:', error);
    return 0;
  }
}

/**
 * Check if a session is an impersonation session.
 */
export function isImpersonationSession(userAgent: string | null): boolean {
  return userAgent?.startsWith('IMPERSONATION:') ?? false;
}

/**
 * Extract admin ID from impersonation session user agent.
 */
export function getImpersonatingAdminId(userAgent: string | null): string | null {
  if (!isImpersonationSession(userAgent)) {
    return null;
  }
  return userAgent?.split(':')[1] || null;
}
