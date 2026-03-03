/**
 * GET /api/cron/recurring-invoices
 * Vercel cron job - runs daily at 6:00 AM (0 6 * * *).
 *
 * Finds active recurring invoice templates where nextDate <= today,
 * generates the corresponding invoices, and advances the nextDate.
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

    // Find all active recurring templates whose nextDate is today or earlier
    const templates = await prisma.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextDate: { lte: today },
      },
      include: {
        company: { select: { id: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const template of templates) {
      try {
        // Skip if endDate has passed
        if (template.endDate && template.endDate < today) {
          await prisma.recurringInvoice.update({
            where: { id: template.id },
            data: { isActive: false },
          });
          skipped++;
          continue;
        }

        // Count existing invoices to generate invoice number
        const invoiceCount = await prisma.invoice.count({
          where: { companyId: template.companyId },
        });
        const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

        // Create the invoice from the template
        const items = template.items as Array<{
          description: string;
          quantity: number;
          unitPrice: number;
          gctRate: string;
          productId?: string;
        }>;

        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 30); // Net 30 default

        await prisma.$transaction(async (tx) => {
          // Create invoice
          const invoice = await tx.invoice.create({
            data: {
              companyId: template.companyId,
              customerId: template.customerId,
              invoiceNumber,
              subtotal: template.subtotal,
              gctAmount: template.gctAmount,
              discount: 0,
              total: template.total,
              balance: template.total,
              status: 'DRAFT',
              issueDate: today,
              dueDate,
              notes: template.notes,
              terms: template.terms,
              createdBy: template.createdBy,
            },
          });

          // Create line items
          for (const item of items) {
            const lineTotal = item.quantity * item.unitPrice;
            await tx.invoiceItem.create({
              data: {
                invoice: { connect: { id: invoice.id } },
                ...(item.productId ? { product: { connect: { id: item.productId } } } : {}),
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                gctAmount: 0,
                total: lineTotal,
              },
            });
          }

          // Advance the nextDate on the template
          const nextDate = calculateNextDate(today, template.frequency);
          await tx.recurringInvoice.update({
            where: { id: template.id },
            data: {
              nextDate,
              lastGeneratedAt: now,
              generatedCount: { increment: 1 },
            },
          });
        });

        generated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Template ${template.id}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recurring invoices processed',
      data: {
        processed: templates.length,
        generated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Cron recurring-invoices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate the next occurrence date based on the recurring frequency.
 */
function calculateNextDate(
  current: Date,
  frequency: string
): Date {
  const next = new Date(current);

  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}
