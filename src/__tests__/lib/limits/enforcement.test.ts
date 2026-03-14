/**
 * Limit Enforcement Tests
 *
 * Tests all tier limit checking functions.
 * Uses mocked Prisma to simulate different scenarios.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma before importing modules that use it
vi.mock('@/lib/db', () => ({
  default: {
    company: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    companyUser: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  checkUserLimit,
  checkCompanyLimit,
  checkInvoiceLimit,
  checkPayrollLimit,
  checkStorageLimit,
  checkAILimit,
  checkAllLimits,
  getTierLimits,
  LIMITS,
  type SubscriptionTier,
} from '@/lib/limits/enforcement';

const mockPrisma = prisma as unknown as {
  company: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  companyUser: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('Limit Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── User Limits ─────────────────────────────────────────────────

  describe('checkUserLimit', () => {
    it('should allow adding users on Free tier when under limit (1)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        _count: { users: 0 },
      });

      const result = await checkUserLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(1);
      expect(result.remaining).toBe(1);
      expect(result.tier).toBe('free');
    });

    it('should block adding users on Free tier when at limit', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        _count: { users: 1 },
      });

      const result = await checkUserLimit('company-1');
      
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.remaining).toBe(0);
      expect(result.message).toContain('User limit reached');
    });

    it('should allow up to 3 users on Starter tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        _count: { users: 2 },
      });

      const result = await checkUserLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(1);
    });

    it('should block 4th user on Starter tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        _count: { users: 3 },
      });

      const result = await checkUserLimit('company-1');
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should allow unlimited users on Professional tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'PROFESSIONAL',
        _count: { users: 100 },
      });

      const result = await checkUserLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(-1);
    });

    it('should return error when company not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      const result = await checkUserLimit('nonexistent');
      
      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Company not found');
    });

    it('should handle legacy plan names', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'SOLO',  // Legacy, maps to STARTER
        _count: { users: 2 },
      });

      const result = await checkUserLimit('company-1');
      
      expect(result.tier).toBe('starter');
      expect(result.limit).toBe(3);
    });

    it('should respect tier override parameter', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        _count: { users: 2 },
      });

      // Override with professional tier
      const result = await checkUserLimit('company-1', 'professional');
      
      expect(result.tier).toBe('professional');
      expect(result.limit).toBe(-1);
      expect(result.allowed).toBe(true);
    });
  });

  // ─── Company Limits ──────────────────────────────────────────────

  describe('checkCompanyLimit', () => {
    it('should allow 1 company on Free tier', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([]);

      const result = await checkCompanyLimit('user-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.tier).toBe('free');
    });

    it('should block 2nd company on Free tier', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { company: { id: 'c1', subscriptionPlan: 'FREE' } },
      ]);

      const result = await checkCompanyLimit('user-1');
      
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(1);
    });

    it('should allow up to 3 companies on Professional tier', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { company: { id: 'c1', subscriptionPlan: 'PROFESSIONAL' } },
        { company: { id: 'c2', subscriptionPlan: 'FREE' } },
      ]);

      const result = await checkCompanyLimit('user-1');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('professional');  // Highest tier
      expect(result.limit).toBe(3);
    });

    it('should allow up to 10 companies on Business tier', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { company: { id: 'c1', subscriptionPlan: 'BUSINESS' } },
      ]);

      const result = await checkCompanyLimit('user-1');
      
      expect(result.limit).toBe(10);
    });

    it('should allow unlimited companies on Enterprise tier', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { company: { id: 'c1', subscriptionPlan: 'ENTERPRISE' } },
      ]);

      const result = await checkCompanyLimit('user-1');
      
      expect(result.limit).toBe(-1);
      expect(result.allowed).toBe(true);
    });

    it('should use highest tier among owned companies', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { company: { id: 'c1', subscriptionPlan: 'FREE' } },
        { company: { id: 'c2', subscriptionPlan: 'BUSINESS' } },
        { company: { id: 'c3', subscriptionPlan: 'STARTER' } },
      ]);

      const result = await checkCompanyLimit('user-1');
      
      expect(result.tier).toBe('business');  // Highest among owned
    });
  });

  // ─── Invoice Limits ──────────────────────────────────────────────

  describe('checkInvoiceLimit', () => {
    it('should allow up to 50 invoices on Free tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        invoiceCountThisMonth: 49,
      });

      const result = await checkInvoiceLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should block 51st invoice on Free tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        invoiceCountThisMonth: 50,
      });

      const result = await checkInvoiceLimit('company-1');
      
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Invoice limit reached');
    });

    it('should allow up to 200 invoices on Starter tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        invoiceCountThisMonth: 199,
      });

      const result = await checkInvoiceLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(200);
    });

    it('should allow unlimited invoices on Professional tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'PROFESSIONAL',
        invoiceCountThisMonth: 10000,
      });

      const result = await checkInvoiceLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should accept currentMonthCount override', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        invoiceCountThisMonth: 10,
      });

      // Override with higher count
      const result = await checkInvoiceLimit('company-1', undefined, 50);
      
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(50);
    });
  });

  // ─── Payroll Limits ──────────────────────────────────────────────

  describe('checkPayrollLimit', () => {
    it('should NOT allow payroll on Free tier (limit = 0)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        _count: { employees: 0 },
      });

      const result = await checkPayrollLimit('company-1');
      
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.message).toContain('not available on the Free plan');
    });

    it('should allow up to 5 employees on Starter tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        _count: { employees: 4 },
      });

      const result = await checkPayrollLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(1);
    });

    it('should block 6th employee on Starter tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        _count: { employees: 5 },
      });

      const result = await checkPayrollLimit('company-1');
      
      expect(result.allowed).toBe(false);
    });

    it('should allow unlimited employees on Professional tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'PROFESSIONAL',
        _count: { employees: 500 },
      });

      const result = await checkPayrollLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  // ─── Storage Limits ──────────────────────────────────────────────

  describe('checkStorageLimit', () => {
    it('should allow up to 500MB on Free tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        storageUsedMb: 400,
      });

      const result = await checkStorageLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(500);
      expect(result.remaining).toBe(100);
    });

    it('should block storage over 500MB on Free tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        storageUsedMb: 500,
      });

      const result = await checkStorageLimit('company-1');
      
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Storage limit reached');
    });

    it('should allow up to 2GB on Starter tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        storageUsedMb: 2000,
      });

      const result = await checkStorageLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(2048);
    });

    it('should allow up to 10GB on Professional tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'PROFESSIONAL',
        storageUsedMb: 9000,
      });

      const result = await checkStorageLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10240);
    });

    it('should allow up to 50GB on Business tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'BUSINESS',
        storageUsedMb: 40000,
      });

      const result = await checkStorageLimit('company-1');
      
      expect(result.limit).toBe(51200);
    });

    it('should allow unlimited storage on Enterprise tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'ENTERPRISE',
        storageUsedMb: 100000,
      });

      const result = await checkStorageLimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  // ─── AI Question Limits ──────────────────────────────────────────

  describe('checkAILimit', () => {
    it('should allow 1 AI question on Free tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        aiQuestionsThisMonth: 0,
      });

      const result = await checkAILimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.remaining).toBe(1);
    });

    it('should block 2nd AI question on Free tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        aiQuestionsThisMonth: 1,
      });

      const result = await checkAILimit('company-1');
      
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('free AI question');
    });

    it('should allow up to 25 AI questions on Starter tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        aiQuestionsThisMonth: 24,
      });

      const result = await checkAILimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(25);
    });

    it('should allow up to 500 AI questions on Professional tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'PROFESSIONAL',
        aiQuestionsThisMonth: 400,
      });

      const result = await checkAILimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(500);
    });

    it('should allow unlimited AI questions on Business tier', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'BUSINESS',
        aiQuestionsThisMonth: 10000,
      });

      const result = await checkAILimit('company-1');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  // ─── Bulk Check ──────────────────────────────────────────────────

  describe('checkAllLimits', () => {
    it('should check all limits in parallel', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        subscriptionPlan: 'STARTER',
        _count: { users: 2, employees: 3 },
        invoiceCountThisMonth: 50,
        storageUsedMb: 1000,
        aiQuestionsThisMonth: 10,
      });

      const results = await checkAllLimits('company-1');
      
      expect(results.users).toBeDefined();
      expect(results.invoices).toBeDefined();
      expect(results.payroll).toBeDefined();
      expect(results.storage).toBeDefined();
      expect(results.ai).toBeDefined();
      
      expect(results.users.tier).toBe('starter');
    });
  });

  // ─── getTierLimits ───────────────────────────────────────────────

  describe('getTierLimits', () => {
    it('should return correct limits for Free tier', () => {
      const limits = getTierLimits('free');
      
      expect(limits.users).toBe(1);
      expect(limits.companies).toBe(1);
      expect(limits.invoicesPerMonth).toBe(50);
      expect(limits.payrollEmployees).toBe(0);
      expect(limits.storageMb).toBe(500);
      expect(limits.aiQuestionsPerMonth).toBe(1);
    });

    it('should return correct limits for Enterprise tier', () => {
      const limits = getTierLimits('enterprise');
      
      expect(limits.users).toBe(-1);
      expect(limits.companies).toBe(-1);
      expect(limits.invoicesPerMonth).toBe(-1);
      expect(limits.payrollEmployees).toBe(-1);
      expect(limits.storageMb).toBe(-1);
      expect(limits.aiQuestionsPerMonth).toBe(-1);
    });
  });

  // ─── LIMITS constant ─────────────────────────────────────────────

  describe('LIMITS constant', () => {
    it('should have all tier limits defined', () => {
      const tiers: SubscriptionTier[] = ['free', 'starter', 'professional', 'business', 'enterprise'];
      
      for (const tier of tiers) {
        expect(LIMITS.users[tier]).toBeDefined();
        expect(LIMITS.companies[tier]).toBeDefined();
        expect(LIMITS.invoices[tier]).toBeDefined();
        expect(LIMITS.payrollEmployees[tier]).toBeDefined();
        expect(LIMITS.storageMb[tier]).toBeDefined();
        expect(LIMITS.aiQuestions[tier]).toBeDefined();
      }
    });
  });
});
