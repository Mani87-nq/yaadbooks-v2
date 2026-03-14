/**
 * Payment Recording API
 * 
 * POST /api/v1/invoices/[id]/payments — Record a payment against an invoice
 * GET  /api/v1/invoices/[id]/payments — List all payments for an invoice
 * 
 * This endpoint:
 * - Records payments to the database (NOT just local store!)
 * - Automatically updates invoice status (PARTIAL, PAID)
 * - Updates amountPaid and balance fields
 * - Creates audit trail entries
 * - Uses transactions for atomicity
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { notFound, badRequest, internalError } from '@/lib/api-error';
import { auditLog } from '@/lib/audit-logger';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;

type RouteContext = { params: Promise<{ id: string }> };

// ============================================
// GET /api/v1/invoices/[id]/payments
// List all payments for an invoice
// ============================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: invoiceId } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'invoices:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    // Verify invoice exists and belongs to company
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: companyId!, deletedAt: null },
      select: { id: true, invoiceNumber: true },
    });

    if (!invoice) return notFound('Invoice not found');

    // Get all payments for this invoice
    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      payments,
      totalPayments: payments.length,
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list payments');
  }
}

// ============================================
// POST /api/v1/invoices/[id]/payments
// Record a payment against an invoice
// ============================================

const recordPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  date: z.coerce.date().optional(), // Defaults to now
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_MONEY']).default('CASH'),
  reference: z.string().max(100).optional(), // Check number, transaction ID, etc.
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: invoiceId } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'invoices:update');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    // Parse and validate request body
    const body = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const { amount, date, paymentMethod, reference, notes } = parsed.data;

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get invoice with current state
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, companyId: companyId!, deletedAt: null },
        include: { customer: { select: { id: true, name: true } } },
      });

      if (!invoice) {
        throw new Error('INVOICE_NOT_FOUND');
      }

      // Validate payment against invoice
      if (invoice.status === 'CANCELLED') {
        throw new Error('INVOICE_CANCELLED');
      }

      if (invoice.status === 'PAID') {
        throw new Error('INVOICE_ALREADY_PAID');
      }

      // Calculate new amounts
      const currentAmountPaid = new Decimal(invoice.amountPaid.toString());
      const invoiceTotal = new Decimal(invoice.total.toString());
      const paymentAmount = new Decimal(amount);
      
      const newAmountPaid = currentAmountPaid.add(paymentAmount);
      const newBalance = invoiceTotal.sub(newAmountPaid);

      // Determine new status
      let newStatus: 'PARTIAL' | 'PAID' | 'SENT' | 'OVERDUE' = invoice.status as any;
      if (newAmountPaid.gte(invoiceTotal)) {
        newStatus = 'PAID';
      } else if (newAmountPaid.gt(0)) {
        newStatus = 'PARTIAL';
      }

      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: paymentAmount.toNumber(),
          paymentMethod,
          reference: reference ?? null,
          notes: notes ?? null,
          date: date ?? new Date(),
          createdBy: user!.sub,
        },
      });

      // Update the invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid.toNumber(),
          balance: newBalance.toNumber(),
          status: newStatus,
          paidDate: newStatus === 'PAID' ? new Date() : invoice.paidDate,
        },
        include: {
          customer: { select: { id: true, name: true } },
          payments: true,
        },
      });

      return { payment, invoice: updatedInvoice, previousStatus: invoice.status };
    });

    // Audit log the payment (outside transaction, non-blocking)
    await auditLog({
      companyId: companyId!,
      userId: user!.sub,
      action: 'CREATE',
      entityType: 'Payment',
      entityId: result.payment.id,
      entityLabel: `Payment for ${result.invoice.invoiceNumber}`,
      after: {
        paymentId: result.payment.id,
        invoiceId: invoiceId,
        invoiceNumber: result.invoice.invoiceNumber,
        amount: amount,
        paymentMethod,
        reference,
        previousStatus: result.previousStatus,
        newStatus: result.invoice.status,
        newAmountPaid: result.invoice.amountPaid,
        newBalance: result.invoice.balance,
      },
      request,
    });

    return NextResponse.json({
      payment: result.payment,
      invoice: {
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        status: result.invoice.status,
        total: result.invoice.total,
        amountPaid: result.invoice.amountPaid,
        balance: result.invoice.balance,
        paidDate: result.invoice.paidDate,
      },
      message: result.invoice.status === 'PAID' 
        ? 'Payment recorded. Invoice is now fully paid.' 
        : `Payment recorded. Remaining balance: ${result.invoice.balance}`,
    }, { status: 201 });

  } catch (error) {
    // Handle known errors
    if (error instanceof Error) {
      switch (error.message) {
        case 'INVOICE_NOT_FOUND':
          return notFound('Invoice not found');
        case 'INVOICE_CANCELLED':
          return badRequest('Cannot record payment on a cancelled invoice');
        case 'INVOICE_ALREADY_PAID':
          return badRequest('Invoice is already fully paid');
      }
    }
    return internalError(error instanceof Error ? error.message : 'Failed to record payment');
  }
}
