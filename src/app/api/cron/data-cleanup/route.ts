/**
 * GET /api/cron/data-cleanup
 * Vercel cron job - runs weekly on Sundays at 2:00 AM (0 2 * * 0).
 *
 * Performs data retention cleanup:
 * - Deletes expired sessions
 * - Archives old read notifications
 * - Cleans up stale audit log entries beyond retention period
 * - Disposes expired trial accounts (7 days after trial end)
 *
 * Protected by CRON_SECRET (no user auth - called by Vercel scheduler).
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { disposeExpiredTrialAccounts, TRIAL_DISPOSAL_DAYS } from '@/lib/data-retention';
import { verifyCronSecret } from '@/lib/cron-auth';

/** Data retention periods */
const RETENTION = {
  /** Sessions are cleaned up once expired */
  EXPIRED_SESSIONS: 0,
  /** Read & archived notifications older than 90 days */
  OLD_NOTIFICATIONS_DAYS: 90,
  /** Audit logs are retained for 7 years (Jamaican compliance) */
  AUDIT_LOG_YEARS: 7,
} as const;

export async function GET(request: NextRequest) {
  // Verify cron secret (timing-safe comparison)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const stats = {
      expiredSessions: 0,
      oldNotifications: 0,
      oldAuditLogs: 0,
      trialAccountsAnonymized: 0,
      trialCompaniesDisposed: 0,
    };

    // 1. Delete expired sessions
    const expiredSessionsResult = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    stats.expiredSessions = expiredSessionsResult.count;

    // 2. Delete old read/archived notifications (90 days)
    const notificationCutoff = new Date(now);
    notificationCutoff.setDate(notificationCutoff.getDate() - RETENTION.OLD_NOTIFICATIONS_DAYS);

    const oldNotificationsResult = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: notificationCutoff },
      },
    });
    stats.oldNotifications = oldNotificationsResult.count;

    // 3. Delete audit logs beyond retention period (7 years)
    const auditLogCutoff = new Date(now);
    auditLogCutoff.setFullYear(auditLogCutoff.getFullYear() - RETENTION.AUDIT_LOG_YEARS);

    const oldAuditLogsResult = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: auditLogCutoff },
      },
    });
    stats.oldAuditLogs = oldAuditLogsResult.count;

    // 4. Dispose expired trial accounts (7 days after trial end)
    const trialDisposal = await disposeExpiredTrialAccounts();
    stats.trialAccountsAnonymized = trialDisposal.accountsAnonymized;
    stats.trialCompaniesDisposed = trialDisposal.companiesDisposed;

    return NextResponse.json({
      success: true,
      message: 'Data cleanup completed',
      data: {
        expiredSessionsDeleted: stats.expiredSessions,
        oldNotificationsDeleted: stats.oldNotifications,
        oldAuditLogsDeleted: stats.oldAuditLogs,
        trialAccountsAnonymized: stats.trialAccountsAnonymized,
        trialCompaniesDisposed: stats.trialCompaniesDisposed,
        retentionPolicy: {
          notifications: `${RETENTION.OLD_NOTIFICATIONS_DAYS} days (read only)`,
          auditLogs: `${RETENTION.AUDIT_LOG_YEARS} years`,
          sessions: 'Deleted on expiry',
          expiredTrials: `${TRIAL_DISPOSAL_DAYS} days after trial ends`,
        },
      },
    });
  } catch (error) {
    console.error('Cron data-cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
