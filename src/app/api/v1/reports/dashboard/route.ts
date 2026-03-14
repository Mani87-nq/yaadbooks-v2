/**
 * GET /api/v1/reports/dashboard
 * Returns dashboard summary metrics for the company.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { internalError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'reports:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Parallel queries for dashboard metrics
    const [
      customerCount,
      productCount,
      invoiceStats,
      recentInvoices,
      topCustomers,
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: { companyId: companyId!, deletedAt: null },
      }),

      // Total products
      prisma.product.count({
        where: { companyId: companyId!, deletedAt: null },
      }),

      // Invoice stats this month
      prisma.invoice.aggregate({
        where: {
          companyId: companyId!,
          deletedAt: null,
          issueDate: { gte: startOfMonth },
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Recent invoices
      prisma.invoice.findMany({
        where: { companyId: companyId!, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          issueDate: true,
          customer: { select: { name: true } },
        },
      }),

      // Top customers by revenue (YTD)
      prisma.invoice.groupBy({
        by: ['customerId'],
        where: {
          companyId: companyId!,
          deletedAt: null,
          status: 'PAID',
          issueDate: { gte: startOfYear },
        },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    // Get customer names for top customers
    const customerIds = topCustomers.map((c) => c.customerId).filter(Boolean) as string[];
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    return NextResponse.json({
      summary: {
        totalCustomers: customerCount,
        totalProducts: productCount,
        invoicesThisMonth: invoiceStats._count.id,
        revenueThisMonth: invoiceStats._sum.total ?? 0,
      },
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name ?? 'N/A',
        total: inv.total,
        status: inv.status,
        issueDate: inv.issueDate,
      })),
      topCustomers: topCustomers.map((tc) => ({
        customerId: tc.customerId,
        customerName: tc.customerId ? customerMap.get(tc.customerId) ?? 'Unknown' : 'Walk-in',
        totalRevenue: tc._sum.total ?? 0,
      })),
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to generate dashboard');
  }
}
