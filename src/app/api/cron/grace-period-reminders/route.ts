/**
 * GET /api/cron/grace-period-reminders
 * 
 * Cron job - runs daily at 9:00 AM.
 * Finds companies at Day 3 of payment failure and sends reminders.
 * 
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyCronSecret } from '@/lib/cron-auth';
import { sendGracePeriodReminder } from '@/lib/billing/payment-failure';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    // Calculate the date range for Day 3
    // We want companies where paymentFailedAt is between 3 and 4 days ago
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const fourDaysAgo = new Date(now);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    fourDaysAgo.setHours(0, 0, 0, 0);

    // Find companies at Day 3 that haven't been notified yet
    const companiesNeedingReminder = await prisma.company.findMany({
      where: {
        paymentFailedAt: {
          gte: fourDaysAgo,  // Failed at least 3 days ago
          lt: threeDaysAgo,   // But less than 4 days ago
        },
        gracePeriodNotified: false,
        subscriptionStatus: 'PAST_DUE',
      },
      select: {
        id: true,
        businessName: true,
        paymentFailedAt: true,
      },
    });

    // Also catch any that slipped through (Day 4-6, not yet notified)
    const missedCompanies = await prisma.company.findMany({
      where: {
        paymentFailedAt: {
          lt: fourDaysAgo,
        },
        gracePeriodNotified: false,
        subscriptionStatus: 'PAST_DUE',
      },
      select: {
        id: true,
        businessName: true,
        paymentFailedAt: true,
      },
    });

    const allCompanies = [...companiesNeedingReminder, ...missedCompanies];

    let successCount = 0;
    let errorCount = 0;
    const results: Array<{ companyId: string; success: boolean; message: string }> = [];

    for (const company of allCompanies) {
      const result = await sendGracePeriodReminder(company.id);
      results.push({
        companyId: company.id,
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`[Cron:GracePeriodReminders] Processed ${allCompanies.length} companies: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Grace period reminders processed',
      data: {
        totalCompanies: allCompanies.length,
        successCount,
        errorCount,
        results,
      },
    });
  } catch (error) {
    console.error('[Cron:GracePeriodReminders] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
