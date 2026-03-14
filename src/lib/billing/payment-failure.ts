/**
 * Payment Failure Handling
 * 
 * Manages the payment failure lifecycle:
 * - Day 0: Payment fails → set paymentFailedAt, show yellow warning
 * - Day 3: Send reminder email, set gracePeriodNotified, show red warning
 * - Day 7: Auto-downgrade to free tier (preserve all data)
 * 
 * Grace period: 7 days from payment failure before auto-downgrade.
 */

import prisma from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';
import { handleDowngrade } from './downgrade';

export interface PaymentFailureResult {
  success: boolean;
  companyId: string;
  action: 'marked_failed' | 'reminder_sent' | 'downgraded' | 'error';
  message: string;
  daysSinceFailure?: number;
}

/**
 * Handle initial payment failure from Stripe webhook.
 * Sets paymentFailedAt timestamp and creates notification.
 */
export async function handlePaymentFailed(
  companyId: string,
  stripeInvoiceId?: string
): Promise<PaymentFailureResult> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        businessName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        paymentFailedAt: true,
        ownerId: true,
      },
    });

    if (!company) {
      return {
        success: false,
        companyId,
        action: 'error',
        message: 'Company not found',
      };
    }

    // Already in failure state - don't reset the clock
    if (company.paymentFailedAt) {
      return {
        success: true,
        companyId,
        action: 'marked_failed',
        message: 'Payment failure already recorded',
        daysSinceFailure: getDaysSinceFailure(company.paymentFailedAt),
      };
    }

    const now = new Date();

    // Update company with payment failure timestamp
    await prisma.company.update({
      where: { id: companyId },
      data: {
        paymentFailedAt: now,
        subscriptionStatus: 'PAST_DUE',
        gracePeriodNotified: false, // Reset in case of previous recovery
      },
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        companyId,
        type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Payment Failed',
        message: `Your subscription payment could not be processed. Please update your payment method within 7 days to avoid service interruption.`,
        link: '/settings/billing',
        relatedType: 'billing',
      },
    });

    // Log audit event
    await auditLog({
      companyId,
      userId: company.ownerId,
      action: 'UPDATE',
      entityType: 'Subscription',
      entityId: companyId,
      entityLabel: company.businessName,
      before: { subscriptionStatus: company.subscriptionStatus },
      after: { 
        subscriptionStatus: 'PAST_DUE',
        paymentFailedAt: now.toISOString(),
        stripeInvoiceId,
      },
    });

    console.log(`[PaymentFailure] Marked failed - Company: ${companyId}`);

    return {
      success: true,
      companyId,
      action: 'marked_failed',
      message: 'Payment failure recorded, 7-day grace period started',
      daysSinceFailure: 0,
    };
  } catch (error) {
    console.error(`[PaymentFailure] Error handling payment failure:`, error);
    return {
      success: false,
      companyId,
      action: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send grace period reminder (called on Day 3 via cron).
 * Sends email reminder and escalates warning banner to red.
 */
export async function sendGracePeriodReminder(
  companyId: string
): Promise<PaymentFailureResult> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!company || !company.paymentFailedAt) {
      return {
        success: false,
        companyId,
        action: 'error',
        message: 'Company not found or no payment failure recorded',
      };
    }

    // Already notified
    if (company.gracePeriodNotified) {
      return {
        success: true,
        companyId,
        action: 'reminder_sent',
        message: 'Grace period reminder already sent',
        daysSinceFailure: getDaysSinceFailure(company.paymentFailedAt),
      };
    }

    const daysSinceFailure = getDaysSinceFailure(company.paymentFailedAt);

    // Update notification status
    await prisma.company.update({
      where: { id: companyId },
      data: { gracePeriodNotified: true },
    });

    // Create urgent notification
    await prisma.notification.create({
      data: {
        companyId,
        type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Urgent: Payment Required',
        message: `Your account will be downgraded to Free tier in ${7 - daysSinceFailure} days if payment is not received. Update your payment method now to avoid losing access to premium features.`,
        link: '/settings/billing',
        relatedType: 'billing',
      },
    });

    // Send email reminder (if owner email exists)
    if (company.owner?.email) {
      await sendGracePeriodEmail({
        email: company.owner.email,
        name: company.owner.firstName || 'Valued Customer',
        businessName: company.businessName,
        daysRemaining: 7 - daysSinceFailure,
        updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/settings/billing`,
      });
    }

    console.log(`[PaymentFailure] Grace period reminder sent - Company: ${companyId}, Day: ${daysSinceFailure}`);

    return {
      success: true,
      companyId,
      action: 'reminder_sent',
      message: `Grace period reminder sent (Day ${daysSinceFailure})`,
      daysSinceFailure,
    };
  } catch (error) {
    console.error(`[PaymentFailure] Error sending reminder:`, error);
    return {
      success: false,
      companyId,
      action: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Auto-downgrade to free tier (called on Day 7 via cron).
 * PRESERVES ALL DATA - only locks features.
 */
export async function autoDowngrade(
  companyId: string
): Promise<PaymentFailureResult> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!company || !company.paymentFailedAt) {
      return {
        success: false,
        companyId,
        action: 'error',
        message: 'Company not found or no payment failure recorded',
      };
    }

    const daysSinceFailure = getDaysSinceFailure(company.paymentFailedAt);

    // Don't downgrade before Day 7
    if (daysSinceFailure < 7) {
      return {
        success: false,
        companyId,
        action: 'error',
        message: `Cannot auto-downgrade before Day 7 (currently Day ${daysSinceFailure})`,
        daysSinceFailure,
      };
    }

    const oldTier = company.subscriptionPlan || 'FREE';

    // Already on free tier
    if (oldTier === 'FREE') {
      // Clear the failure state
      await prisma.company.update({
        where: { id: companyId },
        data: {
          paymentFailedAt: null,
          gracePeriodNotified: false,
        },
      });
      return {
        success: true,
        companyId,
        action: 'downgraded',
        message: 'Already on free tier, cleared failure state',
        daysSinceFailure,
      };
    }

    // Perform the downgrade (preserves data, locks features)
    await handleDowngrade(companyId, oldTier, 'FREE');

    // Clear payment failure state after successful downgrade
    await prisma.company.update({
      where: { id: companyId },
      data: {
        paymentFailedAt: null,
        gracePeriodNotified: false,
        subscriptionStatus: 'INACTIVE',
      },
    });

    // Send downgrade notification
    await prisma.notification.create({
      data: {
        companyId,
        type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Account Downgraded',
        message: `Your account has been downgraded to the Free tier due to payment failure. All your data has been preserved. Upgrade anytime to restore full access.`,
        link: '/settings/billing',
        relatedType: 'billing',
      },
    });

    // Send downgrade email
    if (company.owner?.email) {
      await sendDowngradeEmail({
        email: company.owner.email,
        name: company.owner.firstName || 'Valued Customer',
        businessName: company.businessName,
        oldTier: oldTier,
        upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/settings/billing`,
      });
    }

    // Audit log
    await auditLog({
      companyId,
      userId: company.ownerId,
      action: 'UPDATE',
      entityType: 'Subscription',
      entityId: companyId,
      entityLabel: company.businessName,
      before: { 
        subscriptionPlan: oldTier,
        subscriptionStatus: 'PAST_DUE',
      },
      after: { 
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'INACTIVE',
        reason: 'auto_downgrade_payment_failure',
        daysSinceFailure,
      },
    });

    console.log(`[PaymentFailure] Auto-downgrade completed - Company: ${companyId}, ${oldTier} → FREE`);

    return {
      success: true,
      companyId,
      action: 'downgraded',
      message: `Auto-downgraded from ${oldTier} to FREE (Day ${daysSinceFailure})`,
      daysSinceFailure,
    };
  } catch (error) {
    console.error(`[PaymentFailure] Error during auto-downgrade:`, error);
    return {
      success: false,
      companyId,
      action: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear payment failure state when payment succeeds.
 * Called from webhook when invoice.paid is received.
 */
export async function clearPaymentFailure(companyId: string): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: {
      paymentFailedAt: null,
      gracePeriodNotified: false,
      subscriptionStatus: 'ACTIVE',
    },
  });

  console.log(`[PaymentFailure] Cleared failure state - Company: ${companyId}`);
}

/**
 * Get payment failure status for a company.
 */
export async function getPaymentFailureStatus(companyId: string): Promise<{
  isInGracePeriod: boolean;
  daysSinceFailure: number | null;
  gracePeriodNotified: boolean;
  willDowngradeAt: Date | null;
} | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      paymentFailedAt: true,
      gracePeriodNotified: true,
    },
  });

  if (!company || !company.paymentFailedAt) {
    return null;
  }

  const daysSinceFailure = getDaysSinceFailure(company.paymentFailedAt);
  const willDowngradeAt = new Date(company.paymentFailedAt);
  willDowngradeAt.setDate(willDowngradeAt.getDate() + 7);

  return {
    isInGracePeriod: daysSinceFailure < 7,
    daysSinceFailure,
    gracePeriodNotified: company.gracePeriodNotified,
    willDowngradeAt,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────

function getDaysSinceFailure(paymentFailedAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - paymentFailedAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ─── Email Helpers ────────────────────────────────────────────────

interface GracePeriodEmailParams {
  email: string;
  name: string;
  businessName: string;
  daysRemaining: number;
  updatePaymentUrl: string;
}

async function sendGracePeriodEmail(params: GracePeriodEmailParams): Promise<void> {
  // Use Resend or your email provider
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[PaymentFailure] Email not sent - RESEND_API_KEY not configured');
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'YaadBooks <billing@yaadbooks.com>',
        to: params.email,
        subject: `Urgent: Update Your Payment Method - ${params.daysRemaining} Days Remaining`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Payment Required</h2>
            <p>Hi ${params.name},</p>
            <p>We were unable to process your subscription payment for <strong>${params.businessName}</strong>.</p>
            <p style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
              <strong>Your account will be downgraded to the Free tier in ${params.daysRemaining} days</strong> if we cannot process your payment.
            </p>
            <p>To avoid losing access to your premium features:</p>
            <a href="${params.updatePaymentUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
              Update Payment Method
            </a>
            <p style="color: #6b7280; font-size: 14px;">
              If you have any questions, reply to this email or contact support@yaadbooks.com
            </p>
            <p>— The YaadBooks Team</p>
          </div>
        `,
      }),
    });
    console.log(`[PaymentFailure] Grace period email sent to ${params.email}`);
  } catch (error) {
    console.error('[PaymentFailure] Failed to send grace period email:', error);
  }
}

interface DowngradeEmailParams {
  email: string;
  name: string;
  businessName: string;
  oldTier: string;
  upgradeUrl: string;
}

async function sendDowngradeEmail(params: DowngradeEmailParams): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[PaymentFailure] Email not sent - RESEND_API_KEY not configured');
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'YaadBooks <billing@yaadbooks.com>',
        to: params.email,
        subject: `Your YaadBooks Account Has Been Downgraded`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #374151;">Account Downgraded</h2>
            <p>Hi ${params.name},</p>
            <p>Due to a payment issue, your account for <strong>${params.businessName}</strong> has been downgraded from <strong>${params.oldTier}</strong> to the <strong>Free</strong> tier.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; margin: 20px 0;">
              <strong>✓ All your data has been preserved</strong><br>
              Your invoices, customers, and records are safe. You can restore full access anytime by upgrading.
            </div>
            <p>What you can still do on the Free tier:</p>
            <ul>
              <li>Basic invoicing (up to 50/month)</li>
              <li>Expense tracking</li>
              <li>GCT compliance</li>
              <li>Basic reports</li>
            </ul>
            <a href="${params.upgradeUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
              Upgrade to Restore Access
            </a>
            <p style="color: #6b7280; font-size: 14px;">
              Need help? Contact support@yaadbooks.com
            </p>
            <p>— The YaadBooks Team</p>
          </div>
        `,
      }),
    });
    console.log(`[PaymentFailure] Downgrade email sent to ${params.email}`);
  } catch (error) {
    console.error('[PaymentFailure] Failed to send downgrade email:', error);
  }
}
