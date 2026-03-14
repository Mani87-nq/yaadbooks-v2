/**
 * Tier Protection Tests
 *
 * Tests the API tier-based access control system to ensure:
 * 1. Free users cannot access paid features
 * 2. Starter users CAN access starter-level features
 * 3. JWT manipulation doesn't bypass tier checks
 * 4. Proper 403 response format for blocked requests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  hasFeatureAccess,
  normalizeTier,
  getRequiredTier,
  getFeaturesForTier,
  FEATURE_MATRIX,
  type PlanTier,
  type Feature,
} from '@/lib/tier/feature-matrix';
import { withFeatureCheck, tierBlockedResponse } from '@/lib/tier/middleware';

// ─── Mock Setup ───────────────────────────────────────────────────

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {
    company: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  getAuthUser: vi.fn(),
}));

import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';

// ─── Helper Functions ─────────────────────────────────────────────

function createMockRequest(path: string, method = 'GET'): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method,
    headers: {
      'Authorization': 'Bearer mock-token',
      'Content-Type': 'application/json',
    },
  });
}

function mockAuthUser(tier: PlanTier) {
  const companyId = 'test-company-id';
  
  (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    userId: 'test-user-id',
    sub: 'test-user-id',
    email: 'test@example.com',
    role: 'OWNER',
    activeCompanyId: companyId,
    companies: [companyId],
  });

  (prisma.company.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: companyId,
    subscriptionPlan: tier.toUpperCase(),
    subscriptionStatus: 'ACTIVE',
  });
}

function mockUnauthenticated() {
  (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

// ─── Feature Matrix Tests ─────────────────────────────────────────

describe('Feature Matrix', () => {
  describe('hasFeatureAccess', () => {
    it('should deny free tier access to inventory', () => {
      expect(hasFeatureAccess('free', 'inventory')).toBe(false);
    });

    it('should allow starter tier access to inventory', () => {
      expect(hasFeatureAccess('starter', 'inventory')).toBe(true);
    });

    it('should allow professional tier access to inventory', () => {
      expect(hasFeatureAccess('professional', 'inventory')).toBe(true);
    });

    it('should deny free tier access to POS', () => {
      expect(hasFeatureAccess('free', 'pos')).toBe(false);
    });

    it('should deny starter tier access to POS', () => {
      expect(hasFeatureAccess('starter', 'pos')).toBe(false);
    });

    it('should allow professional tier access to POS', () => {
      expect(hasFeatureAccess('professional', 'pos')).toBe(true);
    });

    it('should deny all tiers below enterprise for API access', () => {
      expect(hasFeatureAccess('free', 'api_access')).toBe(false);
      expect(hasFeatureAccess('starter', 'api_access')).toBe(false);
      expect(hasFeatureAccess('professional', 'api_access')).toBe(false);
      expect(hasFeatureAccess('business', 'api_access')).toBe(false);
    });

    it('should allow enterprise tier API access', () => {
      expect(hasFeatureAccess('enterprise', 'api_access')).toBe(true);
    });

    it('should deny business tier custom_integrations', () => {
      expect(hasFeatureAccess('business', 'custom_integrations')).toBe(false);
    });

    it('should allow enterprise tier custom_integrations', () => {
      expect(hasFeatureAccess('enterprise', 'custom_integrations')).toBe(true);
    });
  });

  describe('normalizeTier', () => {
    it('should normalize legacy "solo" to "starter"', () => {
      expect(normalizeTier('solo')).toBe('starter');
    });

    it('should normalize legacy "team" to "professional"', () => {
      expect(normalizeTier('team')).toBe('professional');
    });

    it('should normalize legacy "pro" to "professional"', () => {
      expect(normalizeTier('pro')).toBe('professional');
    });

    it('should handle null/undefined as free', () => {
      expect(normalizeTier(null)).toBe('free');
      expect(normalizeTier(undefined)).toBe('free');
    });

    it('should be case-insensitive', () => {
      expect(normalizeTier('STARTER')).toBe('starter');
      expect(normalizeTier('Professional')).toBe('professional');
    });

    it('should return free for unknown values', () => {
      expect(normalizeTier('unknown')).toBe('free');
      expect(normalizeTier('premium')).toBe('free');
    });
  });

  describe('getRequiredTier', () => {
    it('should return starter for inventory', () => {
      expect(getRequiredTier('inventory')).toBe('starter');
    });

    it('should return professional for POS', () => {
      expect(getRequiredTier('pos')).toBe('professional');
    });

    it('should return enterprise for API access', () => {
      expect(getRequiredTier('api_access')).toBe('enterprise');
    });
  });

  describe('getFeaturesForTier', () => {
    it('should return empty array for free tier', () => {
      const features = getFeaturesForTier('free');
      expect(features).toEqual([]);
    });

    it('should include inventory for starter tier', () => {
      const features = getFeaturesForTier('starter');
      expect(features).toContain('inventory');
      expect(features).toContain('payroll');
      expect(features).toContain('bank_reconciliation');
    });

    it('should include POS for professional tier', () => {
      const features = getFeaturesForTier('professional');
      expect(features).toContain('pos');
      expect(features).toContain('ai_assistant');
      expect(features).toContain('employee_portal');
      // Also inherits starter features
      expect(features).toContain('inventory');
    });

    it('should include all features for enterprise tier', () => {
      const features = getFeaturesForTier('enterprise');
      expect(features).toContain('api_access');
      expect(features).toContain('custom_integrations');
      expect(features.length).toBe(Object.keys(FEATURE_MATRIX).length);
    });
  });
});

// ─── Middleware Tests ─────────────────────────────────────────────

describe('withFeatureCheck Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should block unauthenticated requests with 401', async () => {
    mockUnauthenticated();

    const handler = vi.fn();
    const protectedHandler = withFeatureCheck('inventory', handler);
    const request = createMockRequest('/api/v1/products');

    const response = await protectedHandler(request);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should block free user from accessing inventory with 403', async () => {
    mockAuthUser('free');

    const handler = vi.fn();
    const protectedHandler = withFeatureCheck('inventory', handler);
    const request = createMockRequest('/api/v1/products');

    const response = await protectedHandler(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Feature not available on your plan');
    expect(body.upgrade_required).toBe(true);
    expect(body.current_plan).toBe('free');
    expect(body.required_plan).toBe('starter');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow starter user to access inventory', async () => {
    mockAuthUser('starter');

    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const protectedHandler = withFeatureCheck('inventory', handler);
    const request = createMockRequest('/api/v1/products');

    const response = await protectedHandler(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(request, undefined);
  });

  it('should block starter user from accessing POS with 403', async () => {
    mockAuthUser('starter');

    const handler = vi.fn();
    const protectedHandler = withFeatureCheck('pos', handler);
    const request = createMockRequest('/api/v1/pos/orders');

    const response = await protectedHandler(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Feature not available on your plan');
    expect(body.current_plan).toBe('starter');
    expect(body.required_plan).toBe('professional');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow professional user to access POS', async () => {
    mockAuthUser('professional');

    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ orders: [] }), { status: 200 })
    );
    const protectedHandler = withFeatureCheck('pos', handler);
    const request = createMockRequest('/api/v1/pos/orders');

    const response = await protectedHandler(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('should block business user from API access', async () => {
    mockAuthUser('business');

    const handler = vi.fn();
    const protectedHandler = withFeatureCheck('api_access', handler);
    const request = createMockRequest('/api/v1/data');

    const response = await protectedHandler(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.required_plan).toBe('enterprise');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow enterprise user to access all features', async () => {
    mockAuthUser('enterprise');

    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    // Test multiple features
    for (const feature of ['inventory', 'pos', 'ai_assistant', 'api_access', 'custom_integrations'] as Feature[]) {
      const protectedHandler = withFeatureCheck(feature, handler);
      const request = createMockRequest(`/api/v1/${feature}`);
      const response = await protectedHandler(request);
      expect(response.status).toBe(200);
    }
  });
});

// ─── JWT Manipulation Tests ───────────────────────────────────────

describe('JWT Manipulation Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not trust tier from JWT payload, fetch from database', async () => {
    // Even if JWT claims enterprise, we verify against database
    const companyId = 'test-company-id';

    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'test-user-id',
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'OWNER',
      activeCompanyId: companyId,
      companies: [companyId],
      // Malicious attempt: claiming enterprise tier in JWT
      tier: 'enterprise',
    });

    // But database says they're on free tier
    (prisma.company.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: companyId,
      subscriptionPlan: 'FREE',
      subscriptionStatus: 'ACTIVE',
    });

    const handler = vi.fn();
    const protectedHandler = withFeatureCheck('api_access', handler);
    const request = createMockRequest('/api/v1/data');

    const response = await protectedHandler(request);
    const body = await response.json();

    // Should be blocked because we check database, not JWT
    expect(response.status).toBe(403);
    expect(body.current_plan).toBe('free');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle inactive subscription as free tier', async () => {
    const companyId = 'test-company-id';

    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'test-user-id',
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'OWNER',
      activeCompanyId: companyId,
      companies: [companyId],
    });

    // Subscription is enterprise but CANCELLED
    (prisma.company.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: companyId,
      subscriptionPlan: 'ENTERPRISE',
      subscriptionStatus: 'CANCELLED',
    });

    const handler = vi.fn();
    const protectedHandler = withFeatureCheck('inventory', handler);
    const request = createMockRequest('/api/v1/products');

    const response = await protectedHandler(request);
    const body = await response.json();

    // Inactive subscription = free tier access only
    expect(response.status).toBe(403);
    expect(body.current_plan).toBe('free');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow TRIALING status to access features', async () => {
    mockAuthUser('professional');

    // Override to TRIALING status
    (prisma.company.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'test-company-id',
      subscriptionPlan: 'PROFESSIONAL',
      subscriptionStatus: 'TRIALING',
    });

    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const protectedHandler = withFeatureCheck('pos', handler);
    const request = createMockRequest('/api/v1/pos/orders');

    const response = await protectedHandler(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});

// ─── Response Format Tests ────────────────────────────────────────

describe('Tier Blocked Response Format', () => {
  it('should return correct 403 response structure', () => {
    const response = tierBlockedResponse('pos', 'starter', 'professional');

    expect(response.status).toBe(403);
  });

  it('should include upgrade URL in blocked response', async () => {
    mockAuthUser('free');

    const handler = vi.fn();
    const protectedHandler = withFeatureCheck('inventory', handler);
    const request = createMockRequest('/api/v1/products');

    const response = await protectedHandler(request);
    const body = await response.json();

    expect(body.upgrade_url).toBe('/settings/billing');
    expect(body.feature).toBe('inventory');
  });
});

// ─── Integration Tests (Route-level) ──────────────────────────────

describe('Protected Routes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const protectedRoutes: { path: string; feature: Feature; minTier: PlanTier }[] = [
    { path: '/api/v1/products', feature: 'inventory', minTier: 'starter' },
    { path: '/api/v1/warehouses', feature: 'inventory', minTier: 'starter' },
    { path: '/api/v1/stock-counts', feature: 'inventory', minTier: 'starter' },
    { path: '/api/v1/stock-transfers', feature: 'inventory', minTier: 'starter' },
    { path: '/api/v1/payroll', feature: 'payroll', minTier: 'starter' },
    { path: '/api/v1/bank-reconciliation', feature: 'bank_reconciliation', minTier: 'starter' },
    { path: '/api/v1/pos/orders', feature: 'pos', minTier: 'professional' },
    { path: '/api/v1/employees', feature: 'employee_portal', minTier: 'professional' },
    { path: '/api/v1/ai/chat', feature: 'ai_assistant', minTier: 'professional' },
    { path: '/api/v1/company/integrations', feature: 'custom_integrations', minTier: 'enterprise' },
  ];

  it.each(protectedRoutes)(
    'should verify $path requires $feature feature ($minTier+)',
    ({ feature, minTier }) => {
      expect(getRequiredTier(feature)).toBe(minTier);
    }
  );

  it('should verify FEATURE_MATRIX has all expected features', () => {
    const expectedFeatures: Feature[] = [
      'inventory',
      'payroll',
      'pos',
      'bank_reconciliation',
      'employee_portal',
      'ai_assistant',
      'advanced_analytics',
      'custom_reports',
      'api_access',
      'multi_location',
      'custom_integrations',
    ];

    for (const feature of expectedFeatures) {
      expect(FEATURE_MATRIX[feature]).toBeDefined();
    }
  });
});
