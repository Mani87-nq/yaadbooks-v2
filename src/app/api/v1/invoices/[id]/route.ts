/**
 * GET    /api/v1/invoices/[id]
 * PUT    /api/v1/invoices/[id]
 * DELETE /api/v1/invoices/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import Decimal from 'decimal.js';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { notFound, badRequest, internalError } from '@/lib/api-error';
import { auditInvoice } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'invoices:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: companyId!, deletedAt: null },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });
    if (!invoice) return notFound('Invoice not found');
    return NextResponse.json(invoice);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to get invoice');
  }
}

const updateItemSchema = z.object({
  productId: z.string().nullable().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  gctRate: z.enum(['STANDARD', 'TELECOM', 'TOURISM', 'ZERO_RATED', 'EXEMPT']).default('STANDARD'),
  gctAmount: z.number().min(0),
  total: z.number().min(0),
});

const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  customerId: z.string().min(1).optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().max(2000).nullable().optional(),
  terms: z.string().max(2000).nullable().optional(),
  discount: z.number().min(0).optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  customerPONumber: z.string().max(100).nullable().optional(),
  items: z.array(updateItemSchema).min(1).optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'invoices:update');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId: companyId!, deletedAt: null },
      include: { items: true },
    });
    if (!existing) return notFound('Invoice not found');

    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const { items, ...invoiceFields } = parsed.data;

    // If items are provided, recalculate totals
    if (items) {
      Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
      const d2 = (v: Decimal) => v.toDecimalPlaces(2).toNumber();

      const subtotal = items.reduce((sum, item) => sum.plus(new Decimal(item.quantity).times(item.unitPrice)), new Decimal(0));
      const gctAmount = items.reduce((sum, item) => sum.plus(item.gctAmount), new Decimal(0));
      const discount = new Decimal(invoiceFields.discount ?? Number(existing.discount));
      const discountType = invoiceFields.discountType ?? existing.discountType;
      const discountAmount = discountType === 'PERCENTAGE'
        ? subtotal.plus(gctAmount).times(discount).dividedBy(100)
        : discount;
      const total = subtotal.plus(gctAmount).minus(discountAmount);
      const amountPaid = new Decimal(existing.amountPaid.toString());
      const balance = Decimal.max(total.minus(amountPaid), new Decimal(0));

      const invoice = await prisma.$transaction(async (tx: any) => {
        // Delete old items and recreate
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

        return tx.invoice.update({
          where: { id },
          data: {
            ...invoiceFields,
            subtotal: d2(subtotal),
            gctAmount: d2(gctAmount),
            total: d2(total),
            balance: d2(balance),
            // Recalculate status based on payments
            ...(balance.lessThanOrEqualTo(0) && amountPaid.greaterThan(0)
              ? { status: 'PAID' }
              : invoiceFields.status
                ? { status: invoiceFields.status }
                : {}),
            items: {
              create: items.map((item) => ({
                ...item,
                productId: item.productId || null,
              })),
            },
          },
          include: { items: true, customer: { select: { id: true, name: true } } },
        });
      });

      // Audit log the invoice edit (fire-and-forget)
      auditInvoice(
        'INVOICE_EDITED',
        id,
        invoice.invoiceNumber,
        companyId!,
        user!.sub,
        {
          customerId: invoice.customerId,
          previousAmount: Number(existing.total),
          newAmount: Number(invoice.total),
          itemsChanged: true,
        },
        request
      ).catch(() => {});

      return NextResponse.json(invoice);
    }

    // Simple update (no items change) — status, notes, terms, dueDate only
    const invoice = await prisma.invoice.update({
      where: { id },
      data: invoiceFields,
      include: { items: true, customer: { select: { id: true, name: true } } },
    });
    return NextResponse.json(invoice);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to update invoice');
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'invoices:delete');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const existing = await prisma.invoice.findFirst({ where: { id, companyId: companyId!, deletedAt: null } });
    if (!existing) return notFound('Invoice not found');

    // Only drafts can be deleted, others must be cancelled
    if (existing.status !== 'DRAFT') {
      return badRequest('Only draft invoices can be deleted. Cancel the invoice instead.');
    }

    await prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });

    // Audit log the invoice deletion (fire-and-forget)
    auditInvoice(
      'INVOICE_DELETED',
      id,
      existing.invoiceNumber,
      companyId!,
      user!.sub,
      {
        customerId: existing.customerId,
        amount: Number(existing.total),
        status: existing.status,
      },
      request
    ).catch(() => {});

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to delete invoice');
  }
}
