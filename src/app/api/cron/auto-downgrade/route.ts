/**
 * GET /api/cron/auto-downgrade
 * 
 * Cron job - runs daily at 10:00 AM (after grace-period-reminders).
 * Finds companies at Day 7+ of payment failure and auto-downgrades them.
 * 
 * IMPORTANT: This preserves all data. Only features are locked.
 * 
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyCronSecret } from '@/lib/cron-auth';
import { autoDowngrade } from '@/lib/billing/payment-failure';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    // Calculate 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find companies with payment failure >= 7 days that are still on paid plans
    const companiesNeedingDowngrade = await prisma.company.findMany({
      where: {
        paymentFailedAt: {
          lte: sevenDaysAgo, // Failed at least 7 days ago
        },
        subscriptionStatus: 'PAST_DUE',
        subscriptionPlan: {
          not: 'FREE',
        },
      },
      select: {
        id: true,
        businessName: true,
        subscriptionPlan: true,
        paymentFailedAt: true,
      },
    });

    let successCount = 0;
    let errorCount = 0;
    const results: Array<{
      companyId: string;
      businessName: string;
      oldTier: string | null;
      success: boolean;
      message: string;
    }> = [];

    for (const company of companiesNeedingDowngrade) {
      const result = await autoDowngrade(company.id);
      
      results.push({
        companyId: company.id,
        businessName: company.businessName,
        oldTier: company.subscriptionPlan,
        success: result.success,
        message: result.message,
      });

      if (result.success && result.action === 'downgraded') {
        successCount++;
      } else if (!result.success) {
        errorCount++;
      }
    }

    console.log(`[Cron:AutoDowngrade] Processed ${companiesNeedingDowngrade.length} companies: ${successCount} downgraded, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Auto-downgrade processing complete',
      data: {
        totalCompanies: companiesNeedingDowngrade.length,
        successCount,
        errorCount,
        dataPreserved: true, // Explicit confirmation
        results,
      },
    });
  } catch (error) {
    console.error('[Cron:AutoDowngrade] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
