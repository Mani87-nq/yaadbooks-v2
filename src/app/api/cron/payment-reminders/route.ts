/**
 * GET /api/cron/payment-reminders
 * Vercel cron job - runs weekdays at 9:00 AM (0 9 * * 1-5).
 *
 * Finds overdue invoices and those approaching their due date,
 * then creates notifications for the relevant company users.
 *
 * Protected by CRON_SECRET (no user auth - called by Vercel scheduler).
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function GET(request: NextRequest) {
  // Verify cron secret (timing-safe comparison)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find invoices that are overdue (due date passed, not fully paid)
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED', 'PARTIAL'] },
        dueDate: { lt: today },
        deletedAt: null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    // Mark overdue invoices
    if (overdueInvoices.length > 0) {
      await prisma.invoice.updateMany({
        where: {
          id: { in: overdueInvoices.map((inv) => inv.id) },
          status: { not: 'OVERDUE' },
        },
        data: { status: 'OVERDUE' },
      });
    }

    // Find invoices due within the next 3 days (upcoming reminders)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED', 'PARTIAL'] },
        dueDate: { gte: today, lte: threeDaysFromNow },
        deletedAt: null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    let notificationsCreated = 0;

    // Create overdue notifications
    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      await prisma.notification.create({
        data: {
          companyId: invoice.companyId,
          type: 'INVOICE_OVERDUE',
          priority: daysOverdue > 30 ? 'HIGH' : 'MEDIUM',
          title: `Invoice ${invoice.invoiceNumber} is overdue`,
          message: `Invoice for ${invoice.customer.name} is ${daysOverdue} day(s) overdue. Balance: $${invoice.balance}`,
          link: `/invoices/${invoice.id}`,
          relatedId: invoice.id,
          relatedType: 'invoice',
        },
      });
      notificationsCreated++;
    }

    // Create upcoming due date notifications
    for (const invoice of upcomingInvoices) {
      const daysUntilDue = Math.floor(
        (new Date(invoice.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      await prisma.notification.create({
        data: {
          companyId: invoice.companyId,
          type: 'INVOICE_DUE',
          priority: 'LOW',
          title: `Invoice ${invoice.invoiceNumber} due soon`,
          message: `Invoice for ${invoice.customer.name} is due in ${daysUntilDue} day(s). Balance: $${invoice.balance}`,
          link: `/invoices/${invoice.id}`,
          relatedId: invoice.id,
          relatedType: 'invoice',
        },
      });
      notificationsCreated++;
    }

    return NextResponse.json({
      success: true,
      message: 'Payment reminders processed',
      data: {
        overdueCount: overdueInvoices.length,
        upcomingCount: upcomingInvoices.length,
        notificationsCreated,
      },
    });
  } catch (error) {
    console.error('Cron payment-reminders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
