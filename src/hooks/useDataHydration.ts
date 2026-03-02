'use client';

/**
 * useDataHydration — Runs once when the dashboard mounts.
 * Fetches the authenticated user's profile, companies, and
 * company-scoped data from the API, then populates the Zustand store.
 *
 * Replaces the old demo-data / localStorage approach.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { useModuleStore } from '@/modules/store';
import { api } from '@/lib/api-client';
import type { Company, Customer, Product, Invoice, Expense } from '@/types';
import type { Notification } from '@/types/notifications';

// ── API response shapes ────────────────────────────────────────────

interface MeResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    activeCompanyId: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  companies: Array<{
    id: string;
    businessName: string;
    tradingName: string | null;
    role: string;
  }>;
}

interface CompaniesResponse {
  data: Array<Company & { role: string }>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: { nextCursor: string | null; hasMore: boolean; limit: number };
}

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
  pagination: { nextCursor: string | null; hasMore: boolean; limit: number };
}

// ── Hook ────────────────────────────────────────────────────────────

export function useDataHydration() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydrationStarted = useRef(false);

  const store = useAppStore;

  useEffect(() => {
    // Guard against double-invocation in React 18 strict mode
    if (hydrationStarted.current) return;
    hydrationStarted.current = true;

    async function hydrate() {
      try {
        setIsLoading(true);
        setError(null);

        // The accessToken cookie is httpOnly — the browser sends it
        // automatically with every same-origin request. No need to seed
        // the in-memory api-client; getAuthUser() reads the cookie server-side.

        // ── Step 1: Fetch user profile + company memberships ─────────
        let meData: MeResponse;
        try {
          meData = await api.get<MeResponse>('/api/auth/me');
        } catch (err: unknown) {
          // If /me fails with 401, the token is invalid — redirect to login
          if (isApiError(err) && (err.status === 401 || err.status === 403)) {
            router.replace('/login');
            return;
          }
          throw err;
        }

        // Get the user's real RBAC role for the active company
        const activeCompanyMembership = meData.user.activeCompanyId
          ? meData.companies.find((c) => c.id === meData.user.activeCompanyId)
          : meData.companies[0];
        const rbacRole = activeCompanyMembership?.role?.toUpperCase() ?? 'STAFF';

        // Map to simplified app role for backward compat
        const primaryRole = rbacRole.toLowerCase();
        const appRole: 'admin' | 'user' | 'staff' =
          primaryRole === 'owner' || primaryRole === 'admin'
            ? 'admin'
            : primaryRole === 'staff'
              ? 'staff'
              : 'user';

        // ── Step 2: Fetch full company objects ───────────────────────
        const companiesRes = await api.get<CompaniesResponse>('/api/v1/companies');
        const companies: Company[] = companiesRes.data.map(({ role, ...company }) => company);

        // Determine active company
        const activeCompanyId = meData.user.activeCompanyId;
        const activeCompany =
          companies.find((c) => c.id === activeCompanyId) ?? companies[0] ?? null;

        // ── Batch user + company data into ONE setState call ─────────
        // Previously we called 6 individual setters (setUser, setUserRole,
        // setAuthenticated, setCompanies, setActiveCompany, setOnboarded),
        // each triggering Zustand subscribers. Components subscribed to the
        // full store (Sidebar, Header) would re-render 6× with 50+ Link
        // components, overwhelming React 19's scheduler with expired lanes.
        const isOnboarded = activeCompany?.onboardingCompleted === true;

        store.setState((prev) => ({
          ...prev,
          user: {
            id: meData.user.id,
            email: meData.user.email,
            firstName: meData.user.firstName,
            lastName: meData.user.lastName,
            phone: meData.user.phone ?? undefined,
            role: appRole,
            activeCompanyId: meData.user.activeCompanyId ?? undefined,
            avatarUrl: meData.user.avatarUrl ?? undefined,
            createdAt: meData.user.createdAt,
          },
          userRole: rbacRole,
          isAuthenticated: true,
          companies,
          activeCompany,
          isOnboarded,
        }));

        if (!activeCompany) {
          // User has no companies — still mark as hydrated
          store.setState({ hydrated: true });
          setIsLoading(false);
          return;
        }

        // ── Step 3: Fetch company-scoped data in parallel ────────────
        // Also hydrate module store with active modules for this company
        const modulesFetchPromise = useModuleStore.getState().fetchActiveModules(activeCompany.id);

        const [
          customersRes,
          productsRes,
          invoicesRes,
          expensesRes,
          notificationsRes,
          quotationsRes,
          employeesRes,
          payrollRes,
          glAccountsRes,
          bankAccountsRes,
          fixedAssetsRes,
          journalEntriesRes,
          bankTransactionsRes,
          userSettingsRes,
        ] = await Promise.all([
          api.get<PaginatedResponse<Customer>>('/api/v1/customers?limit=100'),
          api.get<PaginatedResponse<Product>>('/api/v1/products?limit=100'),
          api.get<PaginatedResponse<Invoice>>('/api/v1/invoices?limit=100'),
          api.get<PaginatedResponse<Expense>>('/api/v1/expenses?limit=100'),
          api.get<NotificationsResponse>('/api/v1/notifications?limit=100'),
          api.get<PaginatedResponse<any>>('/api/v1/quotations?limit=100').catch(() => ({ data: [] })),
          api.get<{ data: any[] }>('/api/v1/employees?limit=100').catch(() => ({ data: [] })),
          api.get<PaginatedResponse<any>>('/api/v1/payroll?limit=100').catch(() => ({ data: [] })),
          api.get<{ data: any[] }>('/api/v1/gl-accounts?limit=200').catch(() => ({ data: [] })),
          api.get<{ data: any[] }>('/api/v1/bank-accounts?limit=50').catch(() => ({ data: [] })),
          api.get<PaginatedResponse<any>>('/api/v1/fixed-assets?limit=100').catch(() => ({ data: [] })),
          api.get<PaginatedResponse<any>>('/api/v1/journal-entries?limit=200').catch(() => ({ data: [] })),
          api.get<PaginatedResponse<any>>('/api/v1/banking/transactions?limit=200').catch(() => ({ data: [] })),
          api.get<{ theme?: string; language?: string; currency?: string; dateFormat?: string; compactMode?: boolean }>('/api/v1/user-settings').catch(() => null),
        ]);

        // Await modules fetch (fire-and-forget if it fails - sidebar just won't show module items)
        await modulesFetchPromise.catch(() => {});

        // ── Populate the store in ONE atomic setState call ──────────
        // Previously we called 13+ individual setters (setCustomers,
        // setProducts, etc.), each triggering Zustand subscribers and
        // queueing React re-renders. This flooded the React 19 scheduler
        // with micro-tasks. A single setState merges everything at once
        // and triggers subscribers only once.
        const settingsUpdate: Record<string, unknown> = {};
        if (userSettingsRes) {
          if (userSettingsRes.currency) settingsUpdate.currency = userSettingsRes.currency;
          if (userSettingsRes.theme) settingsUpdate.theme = userSettingsRes.theme;
          if (userSettingsRes.language) settingsUpdate.language = userSettingsRes.language;
          if (userSettingsRes.dateFormat) settingsUpdate.dateFormat = userSettingsRes.dateFormat;
          if (typeof userSettingsRes.compactMode === 'boolean') settingsUpdate.compactMode = userSettingsRes.compactMode;
        }

        store.setState((prev) => ({
          ...prev,
          customers: customersRes.data,
          products: productsRes.data,
          invoices: invoicesRes.data,
          expenses: expensesRes.data,
          notifications: notificationsRes.data,
          quotations: quotationsRes.data,
          employees: employeesRes.data,
          payrollRuns: payrollRes.data || [],
          glAccounts: glAccountsRes.data,
          bankAccounts: bankAccountsRes.data,
          fixedAssets: fixedAssetsRes.data,
          journalEntries: journalEntriesRes.data,
          bankTransactions: bankTransactionsRes.data,
          // User settings
          ...(Object.keys(settingsUpdate).length > 0
            ? { settings: { ...prev.settings, ...settingsUpdate } }
            : {}),
          // Mark hydration complete
          hydrated: true,
        }));
        setIsLoading(false);
      } catch (err: unknown) {
        console.error('[useDataHydration] Hydration failed:', err);
        const message =
          err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(message);
        setIsLoading(false);
      }
    }

    hydrate();
  }, [router, store]);

  const isHydrated = useAppStore((s) => s.hydrated);

  return { isLoading, error, isHydrated };
}

// ── Helpers ─────────────────────────────────────────────────────────

function isApiError(err: unknown): err is { status: number } {
  return typeof err === 'object' && err !== null && 'status' in err;
}
