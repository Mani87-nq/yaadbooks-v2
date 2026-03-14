/**
 * GET /api/v1/reports/profit-loss
 * Profit & Loss (Income Statement) Report.
 * 
 * Calculates:
 * - Revenue: Sum of paid invoices in the period (PAID or PARTIAL status)
 * - Expenses: Sum of expenses in the period, grouped by category
 * - Profit: Revenue - Expenses
 * - Margin: (Profit / Revenue) * 100
 * 
 * Query Parameters:
 * - startDate (required): Period start date (ISO format)
 * - endDate (required): Period end date (ISO format)
 * - view (optional): 'monthly' | 'quarterly' | 'yearly' - for breakdown views
 * - compareStartDate/compareEndDate (optional): For period comparison
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { ExpenseCategory } from '@prisma/client';

// Type definitions
interface ExpenseByCategory {
  [category: string]: number;
}

interface RevenueBreakdown {
  total: number;
  invoiceCount: number;
  byStatus: {
    paid: number;
    partial: number;
  };
}

interface ExpenseBreakdown {
  total: number;
  expenseCount: number;
  byCategory: ExpenseByCategory;
}

interface ProfitLossPeriod {
  start: string;
  end: string;
  label?: string;
  revenue: RevenueBreakdown;
  expenses: ExpenseBreakdown;
  profit: number;
  margin: number;
}

interface ProfitLossResponse {
  period: {
    start: string;
    end: string;
  };
  revenue: RevenueBreakdown;
  expenses: ExpenseBreakdown;
  profit: number;
  margin: number;
  breakdown?: ProfitLossPeriod[];
  comparison?: ProfitLossPeriod;
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'reports:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') as 'monthly' | 'quarterly' | 'yearly' | null;
    const compareStartDate = searchParams.get('compareStartDate');
    const compareEndDate = searchParams.get('compareEndDate');

    // Validate required parameters
    if (!startDate || !endDate) {
      return badRequest('startDate and endDate query parameters are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return badRequest('Invalid date format. Use ISO format (YYYY-MM-DD)');
    }

    if (start > end) {
      return badRequest('startDate must be before endDate');
    }

    // Calculate main period P&L
    const mainPeriod = await calculatePeriodPL(companyId!, start, end);

    // Build response
    const response: ProfitLossResponse = {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      revenue: mainPeriod.revenue,
      expenses: mainPeriod.expenses,
      profit: mainPeriod.profit,
      margin: mainPeriod.margin,
    };

    // Add period breakdown if view is specified
    if (view) {
      response.breakdown = await calculateBreakdown(companyId!, start, end, view);
    }

    // Add comparison period if requested
    if (compareStartDate && compareEndDate) {
      const compStart = new Date(compareStartDate);
      const compEnd = new Date(compareEndDate);
      
      if (!isNaN(compStart.getTime()) && !isNaN(compEnd.getTime())) {
        const compPeriod = await calculatePeriodPL(companyId!, compStart, compEnd);
        response.comparison = {
          start: compStart.toISOString().split('T')[0],
          end: compEnd.toISOString().split('T')[0],
          ...compPeriod,
        };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('P&L Report Error:', error);
    return internalError(error instanceof Error ? error.message : 'Failed to generate profit & loss report');
  }
}

/**
 * Calculate P&L for a specific date range
 */
async function calculatePeriodPL(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  revenue: RevenueBreakdown;
  expenses: ExpenseBreakdown;
  profit: number;
  margin: number;
}> {
  // Query paid invoices in the period
  // Revenue is recognized when invoice is PAID or PARTIAL (partial payments)
  // Using paidDate for cash-basis, or issueDate for accrual basis
  // For SMBs in Jamaica, cash basis is more common, so we use paidDate when available
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ['PAID', 'PARTIAL'] },
      // Use issueDate to match invoice date to period
      // Payment amounts are tracked via amountPaid field
      issueDate: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      total: true,
      amountPaid: true,
      status: true,
    },
  });

  // Calculate revenue totals
  let totalPaidRevenue = 0;
  let totalPartialRevenue = 0;

  for (const invoice of invoices) {
    // Use amountPaid to get actual received revenue
    const paid = Number(invoice.amountPaid);
    if (invoice.status === 'PAID') {
      totalPaidRevenue += paid;
    } else if (invoice.status === 'PARTIAL') {
      totalPartialRevenue += paid;
    }
  }

  const totalRevenue = round2(totalPaidRevenue + totalPartialRevenue);

  // Query expenses in the period
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      category: true,
      amount: true,
    },
  });

  // Group expenses by category
  const expensesByCategory: ExpenseByCategory = {};
  let totalExpenses = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    const category = formatCategoryName(expense.category);
    
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = 0;
    }
    expensesByCategory[category] = round2(expensesByCategory[category] + amount);
    totalExpenses += amount;
  }

  totalExpenses = round2(totalExpenses);

  // Calculate profit and margin
  const profit = round2(totalRevenue - totalExpenses);
  const margin = totalRevenue > 0 ? round2((profit / totalRevenue) * 100) : 0;

  return {
    revenue: {
      total: totalRevenue,
      invoiceCount: invoices.length,
      byStatus: {
        paid: round2(totalPaidRevenue),
        partial: round2(totalPartialRevenue),
      },
    },
    expenses: {
      total: totalExpenses,
      expenseCount: expenses.length,
      byCategory: expensesByCategory,
    },
    profit,
    margin,
  };
}

/**
 * Calculate P&L breakdown by time periods (monthly, quarterly, yearly)
 */
async function calculateBreakdown(
  companyId: string,
  startDate: Date,
  endDate: Date,
  view: 'monthly' | 'quarterly' | 'yearly'
): Promise<ProfitLossPeriod[]> {
  const periods = generatePeriods(startDate, endDate, view);
  const breakdown: ProfitLossPeriod[] = [];

  for (const period of periods) {
    const pl = await calculatePeriodPL(companyId, period.start, period.end);
    breakdown.push({
      start: period.start.toISOString().split('T')[0],
      end: period.end.toISOString().split('T')[0],
      label: period.label,
      ...pl,
    });
  }

  return breakdown;
}

/**
 * Generate time periods for breakdown view
 */
function generatePeriods(
  startDate: Date,
  endDate: Date,
  view: 'monthly' | 'quarterly' | 'yearly'
): Array<{ start: Date; end: Date; label: string }> {
  const periods: Array<{ start: Date; end: Date; label: string }> = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

  const current = new Date(startDate);
  
  while (current <= endDate) {
    let periodStart: Date;
    let periodEnd: Date;
    let label: string;

    if (view === 'monthly') {
      periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
      periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `${monthNames[current.getMonth()]} ${current.getFullYear()}`;
      current.setMonth(current.getMonth() + 1);
    } else if (view === 'quarterly') {
      const quarter = Math.floor(current.getMonth() / 3);
      periodStart = new Date(current.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(current.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      label = `${quarterNames[quarter]} ${current.getFullYear()}`;
      current.setMonth(quarter * 3 + 3);
    } else {
      // yearly
      periodStart = new Date(current.getFullYear(), 0, 1);
      periodEnd = new Date(current.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = `${current.getFullYear()}`;
      current.setFullYear(current.getFullYear() + 1);
    }

    // Clamp to actual date range
    if (periodStart < startDate) periodStart = new Date(startDate);
    if (periodEnd > endDate) periodEnd = new Date(endDate);

    // Only add if period is valid
    if (periodStart <= periodEnd) {
      periods.push({ start: periodStart, end: periodEnd, label });
    }

    // Prevent infinite loop
    if (current > endDate) break;
  }

  return periods;
}

/**
 * Format expense category enum to readable string
 * E.g., OFFICE_SUPPLIES -> "Office Supplies"
 */
function formatCategoryName(category: ExpenseCategory): string {
  return category
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Round to 2 decimal places
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
