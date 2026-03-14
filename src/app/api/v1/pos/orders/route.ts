/**
 * GET  /api/v1/pos/orders — List orders (paginated, filterable by status/sessionId)
 * POST /api/v1/pos/orders — Create order with items (auto-generate orderNumber)
 *
 * TIER PROTECTED: Requires 'pos' feature (Professional+)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { withFeatureCheck } from '@/lib/tier';

const VALID_ORDER_STATUSES = [
  'DRAFT', 'HELD', 'PENDING_PAYMENT', 'PARTIALLY_PAID',
  'COMPLETED', 'VOIDED', 'REFUNDED',
] as const;

async function _GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'pos:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const statusParam = searchParams.get('status');
    const status = statusParam && VALID_ORDER_STATUSES.includes(statusParam as any)
      ? statusParam
      : undefined;
    if (statusParam && !status) {
      return badRequest('Invalid order status');
    }
    const sessionId = searchParams.get('sessionId') ?? undefined;
    const terminalId = searchParams.get('terminalId') ?? undefined;
    const customerId = searchParams.get('customerId') ?? undefined;

    const where = {
      companyId: companyId!,
      ...(status ? { status: status as any } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(terminalId ? { terminalId } : {}),
      ...(customerId ? { customerId } : {}),
    };

    const orders = await prisma.posOrder.findMany({
      where,
      include: {
        items: true,
        payments: {
          select: { id: true, method: true, amount: true, status: true, createdAt: true },
        },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = orders.length > limit;
    const data = hasMore ? orders.slice(0, limit) : orders;

    return NextResponse.json({
      data,
      pagination: { nextCursor: hasMore ? data[data.length - 1].id : null, hasMore, limit },
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list orders');
  }
}

const orderItemSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1).max(300),
  description: z.string().max(500).optional(),
  quantity: z.number().positive(),
  uomCode: z.string().min(1).max(20).default('EA'),
  uomId: z.string().optional(),
  uomName: z.string().max(50).optional(),
  unitPrice: z.number().min(0),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  discountValue: z.number().min(0).optional(),
  isGctExempt: z.boolean().default(false),
  gctRate: z.number().min(0).max(1).optional(),
  warehouseId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const createOrderSchema = z.object({
  sessionId: z.string().optional(),
  terminalId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().max(200).default('Walk-in Customer'),
  customerPhone: z.string().max(50).optional(),
  customerEmail: z.string().email().optional(),
  items: z.array(orderItemSchema).min(1),
  orderDiscountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  orderDiscountValue: z.number().min(0).optional(),
  orderDiscountReason: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['DRAFT', 'PENDING_PAYMENT']).default('PENDING_PAYMENT'),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'pos:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const { items, ...orderData } = parsed.data;

    // Validate session if provided
    let sessionRecord = null;
    let terminalName: string | null = null;
    if (orderData.sessionId) {
      sessionRecord = await prisma.posSession.findFirst({
        where: { id: orderData.sessionId, companyId: companyId!, status: 'OPEN' },
        include: { terminal: { select: { name: true } } },
      });
      if (!sessionRecord) {
        return badRequest('Session not found or not open');
      }
      terminalName = sessionRecord.terminal.name;
    }

    // Get POS settings for gctRate and order number generation
    const settings = await prisma.posSettings.findUnique({
      where: { companyId: companyId! },
    });
    if (!settings) {
      return badRequest('POS settings not configured. Please configure POS settings first.');
    }

    // Check if open session is required
    if (settings.requireOpenSession && !orderData.sessionId) {
      return badRequest('An open session is required to create orders. Please open a session first.');
    }

    const defaultGctRate = Number(settings.gctRate);

    // Calculate item-level totals
    const calculatedItems = items.map((item, index) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const lineSubtotal = Math.round(qty * price * 100) / 100;

      // Calculate discount
      let discountAmount = 0;
      if (item.discountType && item.discountValue) {
        if (item.discountType === 'PERCENTAGE') {
          discountAmount = Math.round(lineSubtotal * (Number(item.discountValue) / 100) * 100) / 100;
        } else {
          discountAmount = Number(item.discountValue);
        }
      }

      const lineTotalBeforeTax = Math.round((lineSubtotal - discountAmount) * 100) / 100;
      const itemGctRate = item.isGctExempt ? 0 : (item.gctRate ?? defaultGctRate);
      const gctAmount = Math.round(lineTotalBeforeTax * Number(itemGctRate) * 100) / 100;
      const lineTotal = Math.round((lineTotalBeforeTax + gctAmount) * 100) / 100;

      return {
        lineNumber: index + 1,
        productId: item.productId ?? null,
        sku: item.sku ?? null,
        barcode: item.barcode ?? null,
        name: item.name,
        description: item.description ?? null,
        quantity: item.quantity,
        uomCode: item.uomCode,
        uomId: item.uomId ?? null,
        uomName: item.uomName ?? null,
        unitPrice: item.unitPrice,
        lineSubtotal,
        discountType: item.discountType ?? null,
        discountValue: item.discountValue ?? null,
        discountAmount,
        lineTotalBeforeTax,
        isGctExempt: item.isGctExempt,
        gctRate: itemGctRate,
        gctAmount,
        lineTotal,
        warehouseId: item.warehouseId ?? null,
        notes: item.notes ?? null,
      };
    });

    // Calculate order-level totals
    const subtotal = calculatedItems.reduce(
      (sum, item) => sum + item.lineTotalBeforeTax,
      0
    );

    // Order-level discount
    let orderDiscountAmount = 0;
    if (orderData.orderDiscountType && orderData.orderDiscountValue) {
      if (orderData.orderDiscountType === 'PERCENTAGE') {
        orderDiscountAmount = Math.round(subtotal * (Number(orderData.orderDiscountValue) / 100) * 100) / 100;
      } else {
        orderDiscountAmount = Number(orderData.orderDiscountValue);
      }
    }

    const taxableAmount = Math.round((subtotal - orderDiscountAmount) * 100) / 100;
    const exemptAmount = calculatedItems
      .filter((i) => i.isGctExempt)
      .reduce((sum, i) => sum + i.lineTotalBeforeTax, 0);
    const gctAmount = calculatedItems.reduce(
      (sum, item) => sum + item.gctAmount,
      0
    );
    const total = Math.round((subtotal - orderDiscountAmount + gctAmount) * 100) / 100;

    // Create order with items in a transaction, atomically incrementing orderNumber
    const order = await prisma.$transaction(async (tx) => {
      // Atomically increment nextOrderNumber
      const updatedSettings = await tx.posSettings.update({
        where: { companyId: companyId! },
        data: { nextOrderNumber: { increment: 1 } },
        select: { orderPrefix: true, nextOrderNumber: true },
      });

      // The orderNumber uses the PREVIOUS value (before increment)
      const orderNum = updatedSettings.nextOrderNumber - 1;
      const orderNumber = `${updatedSettings.orderPrefix}-${String(orderNum).padStart(6, '0')}`;

      const newOrder = await tx.posOrder.create({
        data: {
          companyId: companyId!,
          orderNumber,
          sessionId: orderData.sessionId ?? null,
          terminalId: orderData.terminalId ?? sessionRecord?.terminalId ?? null,
          terminalName: terminalName ?? null,
          customerId: orderData.customerId ?? null,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone ?? null,
          customerEmail: orderData.customerEmail ?? null,
          itemCount: calculatedItems.length,
          subtotal,
          orderDiscountType: orderData.orderDiscountType ?? null,
          orderDiscountValue: orderData.orderDiscountValue ?? null,
          orderDiscountAmount,
          orderDiscountReason: orderData.orderDiscountReason ?? null,
          taxableAmount,
          exemptAmount,
          gctRate: defaultGctRate,
          gctAmount,
          total,
          amountPaid: 0,
          amountDue: total,
          changeGiven: 0,
          status: orderData.status,
          notes: orderData.notes ?? null,
          createdBy: user!.sub,
          items: {
            create: calculatedItems,
          },
        },
        include: { items: true },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create order');
  }
}

// Tier-protected exports: Requires 'pos' feature (Professional+)
export const GET = withFeatureCheck('pos', _GET);
export const POST = withFeatureCheck('pos', _POST);
