/**
 * Usage Counter Tests
 *
 * Tests all counter increment/decrement and reset functions.
 * Uses mocked Prisma to simulate database operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing modules that use it
vi.mock('@/lib/db', () => ({
  default: {
    company: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  incrementInvoiceCount,
  decrementInvoiceCount,
  incrementAICount,
  incrementStorageUsed,
  decrementStorageUsed,
  setStorageUsed,
  resetMonthlyCounters,
  resetExpiredBillingCycles,
  resetCompanyMonthlyCounters,
  getUsageStats,
} from '@/lib/limits/counter';

const mockPrisma = prisma as unknown as {
  company: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('Usage Counters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Invoice Counter ─────────────────────────────────────────────

  describe('incrementInvoiceCount', () => {
    it('should increment invoice count and return new value', async () => {
      mockPrisma.company.update.mockResolvedValue({
        invoiceCountThisMonth: 51,
      });

      const result = await incrementInvoiceCount('company-1');
      
      expect(result).toBe(51);
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          invoiceCountThisMonth: { increment: 1 },
        },
        select: {
          invoiceCountThisMonth: true,
        },
      });
    });
  });

  describe('decrementInvoiceCount', () => {
    it('should decrement invoice count and return new value', async () => {
      mockPrisma.company.update.mockResolvedValue({
        invoiceCountThisMonth: 49,
      });

      const result = await decrementInvoiceCount('company-1');
      
      expect(result).toBe(49);
    });

    it('should not go below 0', async () => {
      mockPrisma.company.update
        .mockResolvedValueOnce({ invoiceCountThisMonth: -1 })
        .mockResolvedValueOnce({ invoiceCountThisMonth: 0 });

      const result = await decrementInvoiceCount('company-1');
      
      expect(result).toBe(0);
      expect(mockPrisma.company.update).toHaveBeenCalledTimes(2);
    });
  });

  // ─── AI Counter ──────────────────────────────────────────────────

  describe('incrementAICount', () => {
    it('should increment AI question count', async () => {
      mockPrisma.company.update.mockResolvedValue({
        aiQuestionsThisMonth: 26,
      });

      const result = await incrementAICount('company-1');
      
      expect(result).toBe(26);
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          aiQuestionsThisMonth: { increment: 1 },
        },
        select: {
          aiQuestionsThisMonth: true,
        },
      });
    });
  });

  // ─── Storage Counter ─────────────────────────────────────────────

  describe('incrementStorageUsed', () => {
    it('should convert bytes to MB and increment (rounds up)', async () => {
      mockPrisma.company.update.mockResolvedValue({
        storageUsedMb: 502,
      });

      // 1.5 MB = 1572864 bytes, should round up to 2 MB
      const result = await incrementStorageUsed('company-1', 1572864);
      
      expect(result).toBe(502);
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          storageUsedMb: { increment: 2 },  // Rounded up
        },
        select: {
          storageUsedMb: true,
        },
      });
    });

    it('should handle small files (round up to 1 MB minimum)', async () => {
      mockPrisma.company.update.mockResolvedValue({
        storageUsedMb: 501,
      });

      // 500 KB = 512000 bytes, should round up to 1 MB
      await incrementStorageUsed('company-1', 512000);
      
      expect(mockPrisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { storageUsedMb: { increment: 1 } },
        })
      );
    });
  });

  describe('decrementStorageUsed', () => {
    it('should convert bytes to MB and decrement (rounds down)', async () => {
      mockPrisma.company.update.mockResolvedValue({
        storageUsedMb: 498,
      });

      // 1.5 MB = 1572864 bytes, should round down to 1 MB
      const result = await decrementStorageUsed('company-1', 1572864);
      
      expect(result).toBe(498);
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          storageUsedMb: { decrement: 1 },  // Rounded down
        },
        select: {
          storageUsedMb: true,
        },
      });
    });

    it('should not go below 0', async () => {
      mockPrisma.company.update
        .mockResolvedValueOnce({ storageUsedMb: -5 })
        .mockResolvedValueOnce({ storageUsedMb: 0 });

      const result = await decrementStorageUsed('company-1', 10485760); // 10 MB
      
      expect(result).toBe(0);
    });
  });

  describe('setStorageUsed', () => {
    it('should set exact storage value', async () => {
      mockPrisma.company.update.mockResolvedValue({});

      await setStorageUsed('company-1', 1000);
      
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          storageUsedMb: 1000,
        },
      });
    });

    it('should not set negative values', async () => {
      mockPrisma.company.update.mockResolvedValue({});

      await setStorageUsed('company-1', -500);
      
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          storageUsedMb: 0,  // Clamped to 0
        },
      });
    });
  });

  // ─── Monthly Reset ───────────────────────────────────────────────

  describe('resetMonthlyCounters', () => {
    it('should reset all companies and return count', async () => {
      mockPrisma.company.updateMany.mockResolvedValue({ count: 150 });

      const result = await resetMonthlyCounters();
      
      expect(result).toBe(150);
      expect(mockPrisma.company.updateMany).toHaveBeenCalledWith({
        data: {
          invoiceCountThisMonth: 0,
          aiQuestionsThisMonth: 0,
          billingCycleStart: expect.any(Date),
        },
      });
    });
  });

  describe('resetExpiredBillingCycles', () => {
    it('should reset only companies with expired billing cycles', async () => {
      const expiredCompanies = [
        { id: 'company-1' },
        { id: 'company-2' },
      ];
      
      mockPrisma.company.findMany.mockResolvedValue(expiredCompanies);
      mockPrisma.company.updateMany.mockResolvedValue({ count: 2 });

      const result = await resetExpiredBillingCycles();
      
      expect(result).toBe(2);
      expect(mockPrisma.company.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['company-1', 'company-2'] } },
        data: {
          invoiceCountThisMonth: 0,
          aiQuestionsThisMonth: 0,
          billingCycleStart: expect.any(Date),
        },
      });
    });

    it('should return 0 if no expired cycles', async () => {
      mockPrisma.company.findMany.mockResolvedValue([]);

      const result = await resetExpiredBillingCycles();
      
      expect(result).toBe(0);
      expect(mockPrisma.company.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('resetCompanyMonthlyCounters', () => {
    it('should reset counters for a specific company', async () => {
      mockPrisma.company.update.mockResolvedValue({});

      await resetCompanyMonthlyCounters('company-1');
      
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          invoiceCountThisMonth: 0,
          aiQuestionsThisMonth: 0,
          billingCycleStart: expect.any(Date),
        },
      });
    });
  });

  // ─── Usage Stats ─────────────────────────────────────────────────

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const cycleStart = new Date();
      cycleStart.setDate(cycleStart.getDate() - 15); // 15 days ago

      mockPrisma.company.findUnique.mockResolvedValue({
        invoiceCountThisMonth: 42,
        aiQuestionsThisMonth: 10,
        storageUsedMb: 750,
        billingCycleStart: cycleStart,
      });

      const result = await getUsageStats('company-1');
      
      expect(result).not.toBeNull();
      expect(result!.invoiceCountThisMonth).toBe(42);
      expect(result!.aiQuestionsThisMonth).toBe(10);
      expect(result!.storageUsedMb).toBe(750);
      expect(result!.daysUntilReset).toBeGreaterThan(0);
      expect(result!.daysUntilReset).toBeLessThanOrEqual(31);
    });

    it('should return null for nonexistent company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      const result = await getUsageStats('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should handle null billingCycleStart', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        invoiceCountThisMonth: 0,
        aiQuestionsThisMonth: 0,
        storageUsedMb: 0,
        billingCycleStart: null,
      });

      const result = await getUsageStats('company-1');
      
      expect(result!.daysUntilReset).toBe(0);
    });
  });
});
