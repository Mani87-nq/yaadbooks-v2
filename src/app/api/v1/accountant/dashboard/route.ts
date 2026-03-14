/**
 * GET /api/v1/accountant/dashboard
 * Returns aggregated dashboard data for ALL client companies.
 * 
 * Response includes:
 * - Client list with company names
 * - Per-client: overdue invoices, pending payroll, GCT due dates
 * - Alerts: actionable items requiring attention
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { forbidden, internalError } from '@/lib/api-error';

// Types for dashboard response
interface ClientSummary {
  clientId: string;
  companyId: string;
  companyName: string;
  status: string;
  
  // Financial health
  overdueInvoicesCount: number;
  overdueInvoicesAmount: number;
  receivablesTotal: number;
  
  // Payroll
  pendingPayroll: {
    count: number;
    nextPayDate: string | null;
  };
  
  // Tax compliance
  gctStatus: {
    lastFilingDate: string | null;
    nextDueDate: string | null;
    estimatedAmount: number;
  };
  
  // Quick stats
  monthlyRevenue: number;
  monthlyExpenses: number;
}

interface Alert {
  id: string;
  clientId: string;
  companyName: string;
  type: 'PAYROLL_DUE' | 'GCT_DUE' | 'INVOICES_OVERDUE' | 'RECONCILIATION_PENDING' | 'PERIOD_CLOSE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  dueDate: string | null;
  actionUrl: string;
}

interface DashboardResponse {
  summary: {
    totalClients: number;
    activeClients: number;
    totalOverdueInvoices: number;
    totalOverdueAmount: number;
    payrollsDueThisWeek: number;
    gctFilingsDueThisMonth: number;
  };
  clients: ClientSummary[];
  alerts: Alert[];
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const allowedRoles = ['ACCOUNTANT', 'ADMIN', 'OWNER'];
    if (!allowedRoles.includes(user!.role)) {
      return forbidden('Only accountants can access the dashboard');
    }

    const accountantId = user!.sub;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get all active client relationships
    const clientRelationships = await prisma.accountantClient.findMany({
      where: {
        accountantId,
        status: 'ACTIVE',
      },
      include: {
        company: {
          select: {
            id: true,
            businessName: true,
            fiscalYearEnd: true,
            gctNumber: true,
          },
        },
      },
    });

    const companyIds = clientRelationships.map(c => c.companyId);

    // If no clients, return empty dashboard
    if (companyIds.length === 0) {
      const emptyResponse: DashboardResponse = {
        summary: {
          totalClients: 0,
          activeClients: 0,
          totalOverdueInvoices: 0,
          totalOverdueAmount: 0,
          payrollsDueThisWeek: 0,
          gctFilingsDueThisMonth: 0,
        },
        clients: [],
        alerts: [],
        lastUpdated: now.toISOString(),
      };
      return NextResponse.json({ data: emptyResponse });
    }

    // Aggregate data for all companies in parallel
    const [
      overdueInvoices,
      pendingPayrolls,
      monthlyRevenue,
      monthlyExpenses,
      openPeriods,
    ] = await Promise.all([
      // Overdue invoices per company
      prisma.invoice.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: companyIds },
          status: 'OVERDUE',
          deletedAt: null,
        },
        _count: { id: true },
        _sum: { balance: true },
      }),

      // Pending payrolls (DRAFT or PENDING status)
      prisma.payrollRun.findMany({
        where: {
          companyId: { in: companyIds },
          status: { in: ['DRAFT', 'APPROVED'] },
        },
        select: {
          companyId: true,
          payDate: true,
          status: true,
        },
        orderBy: { payDate: 'asc' },
      }),

      // Monthly revenue (invoices issued this month)
      prisma.invoice.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: companyIds },
          issueDate: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'CANCELLED' },
          deletedAt: null,
        },
        _sum: { total: true },
      }),

      // Monthly expenses
      prisma.expense.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: companyIds },
          date: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),

      // Open fiscal periods (need closing)
      prisma.accountingPeriod.findMany({
        where: {
          companyId: { in: companyIds },
          status: 'OPEN',
          endDate: { lt: now },
        },
        select: { companyId: true, endDate: true },
      }),
    ]);

    // Build lookup maps for efficient access
    const overdueMap = new Map(overdueInvoices.map(o => [o.companyId, o]));
    const payrollMap = new Map<string, typeof pendingPayrolls>();
    pendingPayrolls.forEach(p => {
      const existing = payrollMap.get(p.companyId) || [];
      existing.push(p);
      payrollMap.set(p.companyId, existing);
    });
    const revenueMap = new Map(monthlyRevenue.map(r => [r.companyId, r._sum.total?.toNumber() || 0]));
    const expenseMap = new Map(monthlyExpenses.map(e => [e.companyId, e._sum.amount?.toNumber() || 0]));

    // Calculate GCT due dates (25th of following month for Jamaica)
    const gctDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 25);

    // Build client summaries
    const clients: ClientSummary[] = clientRelationships.map(rel => {
      const companyId = rel.companyId;
      const overdue = overdueMap.get(companyId);
      const payrolls = payrollMap.get(companyId) || [];
      const nextPayroll = payrolls[0];

      return {
        clientId: rel.id,
        companyId,
        companyName: rel.company.businessName,
        status: rel.status,
        
        overdueInvoicesCount: overdue?._count.id || 0,
        overdueInvoicesAmount: overdue?._sum.balance?.toNumber() || 0,
        receivablesTotal: 0, // Would need separate query

        pendingPayroll: {
          count: payrolls.length,
          nextPayDate: nextPayroll?.payDate.toISOString() || null,
        },

        gctStatus: {
          lastFilingDate: null, // Would track in separate table
          nextDueDate: rel.company.gctNumber ? gctDueDate.toISOString() : null,
          estimatedAmount: 0, // Calculate from journal entries
        },

        monthlyRevenue: revenueMap.get(companyId) || 0,
        monthlyExpenses: expenseMap.get(companyId) || 0,
      };
    });

    // Build alerts
    const alerts: Alert[] = [];

    // Alert: Overdue invoices
    clients.forEach(client => {
      if (client.overdueInvoicesCount > 0) {
        alerts.push({
          id: `overdue-${client.companyId}`,
          clientId: client.clientId,
          companyName: client.companyName,
          type: 'INVOICES_OVERDUE',
          severity: client.overdueInvoicesCount > 5 ? 'HIGH' : 'MEDIUM',
          message: `${client.overdueInvoicesCount} overdue invoice(s) totaling $${client.overdueInvoicesAmount.toLocaleString()}`,
          dueDate: null,
          actionUrl: `/clients/${client.companyId}/invoices?status=OVERDUE`,
        });
      }
    });

    // Alert: Payroll due this week
    pendingPayrolls.forEach(payroll => {
      if (payroll.payDate <= oneWeekFromNow) {
        const client = clientRelationships.find(c => c.companyId === payroll.companyId);
        if (client) {
          alerts.push({
            id: `payroll-${payroll.companyId}-${payroll.payDate.toISOString()}`,
            clientId: client.id,
            companyName: client.company.businessName,
            type: 'PAYROLL_DUE',
            severity: payroll.payDate <= now ? 'HIGH' : 'MEDIUM',
            message: `Payroll ${payroll.status === 'DRAFT' ? 'needs processing' : 'pending approval'}`,
            dueDate: payroll.payDate.toISOString(),
            actionUrl: `/clients/${payroll.companyId}/payroll`,
          });
        }
      }
    });

    // Alert: Period close needed
    openPeriods.forEach(period => {
      const client = clientRelationships.find(c => c.companyId === period.companyId);
      if (client) {
        alerts.push({
          id: `period-${period.companyId}-${period.endDate.toISOString()}`,
          clientId: client.id,
          companyName: client.company.businessName,
          type: 'PERIOD_CLOSE',
          severity: 'MEDIUM',
          message: `Period ending ${period.endDate.toLocaleDateString()} needs closing`,
          dueDate: null,
          actionUrl: `/clients/${period.companyId}/fiscal-periods`,
        });
      }
    });

    // Alert: GCT filing (if due within 10 days)
    const gctDueSoon = gctDueDate.getTime() - now.getTime() < 10 * 24 * 60 * 60 * 1000;
    if (gctDueSoon) {
      clients.filter(c => c.gctStatus.nextDueDate).forEach(client => {
        alerts.push({
          id: `gct-${client.companyId}`,
          clientId: client.clientId,
          companyName: client.companyName,
          type: 'GCT_DUE',
          severity: 'HIGH',
          message: `GCT filing due ${gctDueDate.toLocaleDateString()}`,
          dueDate: gctDueDate.toISOString(),
          actionUrl: `/clients/${client.companyId}/exports/gct`,
        });
      });
    }

    // Sort alerts by severity
    const severityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Build summary
    const summary = {
      totalClients: clientRelationships.length,
      activeClients: clients.filter(c => c.status === 'ACTIVE').length,
      totalOverdueInvoices: clients.reduce((sum, c) => sum + c.overdueInvoicesCount, 0),
      totalOverdueAmount: clients.reduce((sum, c) => sum + c.overdueInvoicesAmount, 0),
      payrollsDueThisWeek: alerts.filter(a => a.type === 'PAYROLL_DUE').length,
      gctFilingsDueThisMonth: alerts.filter(a => a.type === 'GCT_DUE').length,
    };

    const response: DashboardResponse = {
      summary,
      clients,
      alerts,
      lastUpdated: now.toISOString(),
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Dashboard error:', error);
    return internalError(error instanceof Error ? error.message : 'Failed to load dashboard');
  }
}
