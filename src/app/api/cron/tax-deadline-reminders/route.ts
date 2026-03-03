/**
 * GET /api/cron/tax-deadline-reminders
 * Vercel cron job - runs daily at 8:00 AM (0 8 * * *).
 *
 * Checks for upcoming Jamaica tax filing deadlines and creates
 * notifications for all companies that may need to file.
 *
 * Protected by CRON_SECRET (no user auth - called by Vercel scheduler).
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyCronSecret } from '@/lib/cron-auth';

/** Jamaica tax deadlines with their recurring schedules. */
const TAX_DEADLINES = [
  { name: 'GCT Return', dayOfMonth: 25, frequency: 'MONTHLY' as const, description: 'General Consumption Tax monthly return due' },
  { name: 'PAYE/NIS/NHT/Ed Tax', dayOfMonth: 14, frequency: 'MONTHLY' as const, description: 'Statutory payroll deductions due to TAJ' },
  { name: 'Income Tax Estimate', dayOfMonth: 15, frequency: 'QUARTERLY' as const, months: [3, 6, 9, 12], description: 'Quarterly estimated income tax payment' },
  { name: 'Annual Income Tax', dayOfMonth: 15, frequency: 'YEARLY' as const, months: [3], description: 'Annual income tax return filing deadline' },
] as const;

export async function GET(request: NextRequest) {
  // Verify cron secret (timing-safe comparison)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDays = [7, 3, 1]; // Notify 7, 3, and 1 day(s) before

    // Get all active companies
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, businessName: true },
    });

    let notificationsCreated = 0;
    const upcomingDeadlines: Array<{ name: string; dueDate: Date; daysUntil: number }> = [];

    for (const deadline of TAX_DEADLINES) {
      // Calculate the next occurrence of this deadline
      const dueDate = getNextDeadlineDate(today, deadline);
      if (!dueDate) continue;

      const daysUntil = Math.floor(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only notify on specific reminder days
      if (!reminderDays.includes(daysUntil)) continue;

      upcomingDeadlines.push({ name: deadline.name, dueDate, daysUntil });

      // Create notification for each company
      for (const company of companies) {
        const priority = daysUntil <= 1 ? 'HIGH' : daysUntil <= 3 ? 'MEDIUM' : 'LOW';

        await prisma.notification.create({
          data: {
            companyId: company.id,
            type: 'TAX_DEADLINE',
            priority,
            title: `${deadline.name} due in ${daysUntil} day(s)`,
            message: `${deadline.description}. Due date: ${dueDate.toISOString().split('T')[0]}`,
            link: '/tax-calendar',
            relatedType: 'tax',
          },
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tax deadline reminders processed',
      data: {
        companiesNotified: companies.length,
        upcomingDeadlines,
        notificationsCreated,
      },
    });
  } catch (error) {
    console.error('Cron tax-deadline-reminders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate the next occurrence of a tax deadline relative to today.
 * Returns null if no upcoming deadline within the current or next month.
 */
function getNextDeadlineDate(
  today: Date,
  deadline: { dayOfMonth: number; frequency: string; months?: readonly number[] }
): Date | null {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  // For monthly deadlines, check current month
  if (deadline.frequency === 'MONTHLY') {
    const dueDate = new Date(year, month, deadline.dayOfMonth);
    if (dueDate >= today) return dueDate;
    // Check next month
    return new Date(year, month + 1, deadline.dayOfMonth);
  }

  // For quarterly/yearly deadlines, check only specific months
  if (deadline.months) {
    for (const m of deadline.months) {
      const dueDate = new Date(year, m - 1, deadline.dayOfMonth); // months array is 1-indexed
      if (dueDate >= today) return dueDate;
    }
    // Try next year's first applicable month
    const firstMonth = deadline.months[0];
    return new Date(year + 1, firstMonth - 1, deadline.dayOfMonth);
  }

  return null;
}
