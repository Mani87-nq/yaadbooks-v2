/**
 * Tests for Profit & Loss Report API
 * 
 * Run with: npx vitest src/lib/__tests__/pl-report.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock functions that we can control
const mockInvoiceFindMany = vi.fn();
const mockExpenseFindMany = vi.fn();
const mockRequirePermission = vi.fn();
const mockRequireCompany = vi.fn();

// Mock modules BEFORE importing the route
vi.mock('@/lib/db', () => ({
  default: {
    invoice: {
      findMany: (...args: unknown[]) => mockInvoiceFindMany(...args),
    },
    expense: {
      findMany: (...args: unknown[]) => mockExpenseFindMany(...args),
    },
  },
}));

vi.mock('@/lib/auth/middleware', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
  requireCompany: (...args: unknown[]) => mockRequireCompany(...args),
}));

// Import the route handler AFTER mocks are set up
import { GET } from '@/app/api/v1/reports/profit-loss/route';

describe('Profit & Loss Report API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default auth mocks
    mockRequirePermission.mockResolvedValue({
      user: { 
        id: 'user-1', 
        email: 'test@example.com',
        role: 'ADMIN',
        activeCompanyId: 'company-1',
        companies: ['company-1'],
      },
      error: null,
    });
    
    mockRequireCompany.mockReturnValue({
      companyId: 'company-1',
      error: null,
    });
    
    // Default empty responses for data
    mockInvoiceFindMany.mockResolvedValue([]);
    mockExpenseFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Helper to create mock request
   */
  function createRequest(params: Record<string, string> = {}): NextRequest {
    const searchParams = new URLSearchParams(params);
    const url = `http://localhost/api/v1/reports/profit-loss?${searchParams.toString()}`;
    return new NextRequest(url);
  }

  describe('Parameter Validation', () => {
    it('should require startDate and endDate params', async () => {
      const request = createRequest({});
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.detail).toContain('startDate and endDate');
    });

    it('should return error for missing startDate', async () => {
      const request = createRequest({ endDate: '2024-12-31' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.detail).toContain('startDate and endDate');
    });

    it('should return error for missing endDate', async () => {
      const request = createRequest({ startDate: '2024-01-01' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.detail).toContain('startDate and endDate');
    });

    it('should return error for invalid date format', async () => {
      const request = createRequest({
        startDate: 'not-a-date',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.detail).toContain('Invalid date format');
    });

    it('should return error for invalid endDate format', async () => {
      const request = createRequest({
        startDate: '2024-01-01',
        endDate: 'invalid',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.detail).toContain('Invalid date format');
    });

    it('should return error if startDate > endDate', async () => {
      const request = createRequest({
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.detail).toContain('startDate must be before endDate');
    });
  });

  describe('Revenue Calculation', () => {
    it('should calculate revenue from paid invoices correctly', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 10000, amountPaid: 10000, status: 'PAID' },
        { id: 'inv-2', total: 5000, amountPaid: 5000, status: 'PAID' },
        { id: 'inv-3', total: 3000, amountPaid: 3000, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(18000);
      expect(data.revenue.invoiceCount).toBe(3);
      expect(data.revenue.byStatus.paid).toBe(18000);
      expect(data.revenue.byStatus.partial).toBe(0);
    });

    it('should calculate revenue from partial payments correctly', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 10000, amountPaid: 10000, status: 'PAID' },
        { id: 'inv-2', total: 5000, amountPaid: 2000, status: 'PARTIAL' },
      ]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(12000); // 10000 + 2000
      expect(data.revenue.byStatus.paid).toBe(10000);
      expect(data.revenue.byStatus.partial).toBe(2000);
    });

    it('should handle decimal amounts correctly', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 1000.50, amountPaid: 1000.50, status: 'PAID' },
        { id: 'inv-2', total: 2500.75, amountPaid: 2500.75, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(3501.25);
    });
  });

  describe('Expense Calculation', () => {
    it('should calculate expenses by category correctly', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'OFFICE_SUPPLIES', amount: 500 },
        { id: 'exp-2', category: 'OFFICE_SUPPLIES', amount: 300 },
        { id: 'exp-3', category: 'UTILITIES', amount: 1000 },
        { id: 'exp-4', category: 'RENT', amount: 5000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses.total).toBe(6800);
      expect(data.expenses.expenseCount).toBe(4);
      expect(data.expenses.byCategory['Office Supplies']).toBe(800);
      expect(data.expenses.byCategory['Utilities']).toBe(1000);
      expect(data.expenses.byCategory['Rent']).toBe(5000);
    });

    it('should format category names correctly', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'PROFESSIONAL_SERVICES', amount: 2000 },
        { id: 'exp-2', category: 'BANK_FEES', amount: 50 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses.byCategory['Professional Services']).toBe(2000);
      expect(data.expenses.byCategory['Bank Fees']).toBe(50);
    });
  });

  describe('Profit & Margin Calculation', () => {
    it('should calculate profit (revenue - expenses)', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 50000, amountPaid: 50000, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'RENT', amount: 10000 },
        { id: 'exp-2', category: 'SALARIES', amount: 20000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(50000);
      expect(data.expenses.total).toBe(30000);
      expect(data.profit).toBe(20000);
    });

    it('should calculate margin percentage correctly', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 100000, amountPaid: 100000, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'OTHER', amount: 25000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      // Profit: 100000 - 25000 = 75000
      // Margin: (75000 / 100000) * 100 = 75%
      expect(response.status).toBe(200);
      expect(data.profit).toBe(75000);
      expect(data.margin).toBe(75);
    });

    it('should handle negative profit (loss)', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 10000, amountPaid: 10000, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'RENT', amount: 15000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profit).toBe(-5000);
      expect(data.margin).toBe(-50); // ((-5000) / 10000) * 100
    });

    it('should return margin of 0 when revenue is 0', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'RENT', amount: 5000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(0);
      expect(data.expenses.total).toBe(5000);
      expect(data.profit).toBe(-5000);
      expect(data.margin).toBe(0); // Can't calculate margin with 0 revenue
    });
  });

  describe('Empty Period', () => {
    it('should return 0 for empty period (no invoices/expenses)', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(0);
      expect(data.revenue.invoiceCount).toBe(0);
      expect(data.revenue.byStatus.paid).toBe(0);
      expect(data.revenue.byStatus.partial).toBe(0);
      expect(data.expenses.total).toBe(0);
      expect(data.expenses.expenseCount).toBe(0);
      expect(data.expenses.byCategory).toEqual({});
      expect(data.profit).toBe(0);
      expect(data.margin).toBe(0);
    });
  });

  describe('Monthly Breakdown', () => {
    it('should return monthly breakdown with correct periods', async () => {
      // Mock returns empty data but structure will be tested
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        view: 'monthly',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.breakdown).toBeDefined();
      expect(data.breakdown.length).toBe(3); // Jan, Feb, Mar

      expect(data.breakdown[0].label).toBe('Jan 2024');
      expect(data.breakdown[1].label).toBe('Feb 2024');
      expect(data.breakdown[2].label).toBe('Mar 2024');

      // Each period should have P&L structure
      data.breakdown.forEach((period: Record<string, unknown>) => {
        expect(period).toHaveProperty('start');
        expect(period).toHaveProperty('end');
        expect(period).toHaveProperty('revenue');
        expect(period).toHaveProperty('expenses');
        expect(period).toHaveProperty('profit');
        expect(period).toHaveProperty('margin');
      });
    });
  });

  describe('Quarterly Breakdown', () => {
    it('should return quarterly breakdown with correct periods', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        view: 'quarterly',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.breakdown).toBeDefined();
      expect(data.breakdown.length).toBe(4); // Q1, Q2, Q3, Q4

      expect(data.breakdown[0].label).toBe('Q1 2024');
      expect(data.breakdown[1].label).toBe('Q2 2024');
      expect(data.breakdown[2].label).toBe('Q3 2024');
      expect(data.breakdown[3].label).toBe('Q4 2024');
    });
  });

  describe('Yearly Breakdown', () => {
    it('should return yearly breakdown with correct periods', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2023-01-01',
        endDate: '2025-12-31',
        view: 'yearly',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.breakdown).toBeDefined();
      expect(data.breakdown.length).toBe(3); // 2023, 2024, 2025

      expect(data.breakdown[0].label).toBe('2023');
      expect(data.breakdown[1].label).toBe('2024');
      expect(data.breakdown[2].label).toBe('2025');
    });
  });

  describe('Period Comparison', () => {
    it('should return comparison period with separate calculations', async () => {
      // Mock returns same data for all calls (simplified)
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 10000, amountPaid: 10000, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'RENT', amount: 2000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        compareStartDate: '2023-01-01',
        compareEndDate: '2023-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.comparison).toBeDefined();
      expect(data.comparison.start).toBe('2023-01-01');
      expect(data.comparison.end).toBe('2023-12-31');
      expect(data.comparison).toHaveProperty('revenue');
      expect(data.comparison).toHaveProperty('expenses');
      expect(data.comparison).toHaveProperty('profit');
      expect(data.comparison).toHaveProperty('margin');
    });

    it('should handle invalid comparison dates gracefully', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        compareStartDate: 'invalid',
        compareEndDate: '2023-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      // Should return main period data without comparison
      expect(response.status).toBe(200);
      expect(data.comparison).toBeUndefined();
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 50000, amountPaid: 50000, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'RENT', amount: 10000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Check period structure
      expect(data.period).toEqual({
        start: '2024-01-01',
        end: '2024-12-31',
      });

      // Check revenue structure
      expect(data.revenue).toHaveProperty('total');
      expect(data.revenue).toHaveProperty('invoiceCount');
      expect(data.revenue).toHaveProperty('byStatus');
      expect(data.revenue.byStatus).toHaveProperty('paid');
      expect(data.revenue.byStatus).toHaveProperty('partial');

      // Check expenses structure
      expect(data.expenses).toHaveProperty('total');
      expect(data.expenses).toHaveProperty('expenseCount');
      expect(data.expenses).toHaveProperty('byCategory');

      // Check profit/margin
      expect(typeof data.profit).toBe('number');
      expect(typeof data.margin).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle same start and end date', async () => {
      mockInvoiceFindMany.mockResolvedValue([]);
      mockExpenseFindMany.mockResolvedValue([]);

      const request = createRequest({
        startDate: '2024-06-15',
        endDate: '2024-06-15',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period.start).toBe('2024-06-15');
      expect(data.period.end).toBe('2024-06-15');
    });

    it('should handle very large amounts', async () => {
      mockInvoiceFindMany.mockResolvedValue([
        { id: 'inv-1', total: 999999999.99, amountPaid: 999999999.99, status: 'PAID' },
      ]);
      mockExpenseFindMany.mockResolvedValue([
        { id: 'exp-1', category: 'OTHER', amount: 100000000 },
      ]);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(999999999.99);
      expect(data.expenses.total).toBe(100000000);
      expect(data.profit).toBe(899999999.99);
    });

    it('should handle many invoices and expenses', async () => {
      const invoices = Array.from({ length: 100 }, (_, i) => ({
        id: `inv-${i}`,
        total: 1000,
        amountPaid: 1000,
        status: 'PAID',
      }));
      const expenses = Array.from({ length: 50 }, (_, i) => ({
        id: `exp-${i}`,
        category: i % 2 === 0 ? 'RENT' : 'UTILITIES',
        amount: 100,
      }));

      mockInvoiceFindMany.mockResolvedValue(invoices);
      mockExpenseFindMany.mockResolvedValue(expenses);

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revenue.total).toBe(100000); // 100 * 1000
      expect(data.revenue.invoiceCount).toBe(100);
      expect(data.expenses.total).toBe(5000); // 50 * 100
      expect(data.expenses.expenseCount).toBe(50);
    });
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { unauthorized } = await import('@/lib/api-error');
      mockRequirePermission.mockResolvedValue({
        user: null,
        error: unauthorized(),
      });

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 when no company is selected', async () => {
      const { forbidden } = await import('@/lib/api-error');
      mockRequireCompany.mockReturnValue({
        companyId: null,
        error: forbidden('No active company selected'),
      });

      const request = createRequest({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });
});
