// Accountant Dashboard Store
// Manages multi-client view state for accountants
// Updated: Real API Integration with Mock Fallback

import { create } from 'zustand';
import type { AccountantClient, ClientAlert, AccountantDashboardStats, ClientInvite } from '@/types/accountant';

// ============================================
// CONFIGURATION
// ============================================

// Set to true to use mock data instead of real API (useful for development/demo)
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || false;

// ============================================
// MOCK DATA (Fallback for development/demo)
// ============================================

const MOCK_ALERTS: ClientAlert[] = [
  {
    id: 'alert-1',
    type: 'payroll_due',
    severity: 'critical',
    title: 'Payroll due tomorrow',
    description: 'March 2026 payroll needs to be processed by March 16.',
    dueDate: new Date('2026-03-16'),
    clientId: 'client-1',
    clientName: 'Island Bakery',
  },
  {
    id: 'alert-2',
    type: 'gct_due',
    severity: 'critical',
    title: 'GCT filing overdue',
    description: 'February 2026 GCT return is 5 days past due.',
    dueDate: new Date('2026-03-10'),
    clientId: 'client-2',
    clientName: 'Kingston Auto',
  },
  {
    id: 'alert-3',
    type: 'invoices_overdue',
    severity: 'warning',
    title: '3 invoices overdue',
    description: 'Total outstanding: J$145,000',
    count: 3,
    clientId: 'client-3',
    clientName: 'Beach Bar',
  },
  {
    id: 'alert-4',
    type: 'bank_reconciliation',
    severity: 'warning',
    title: 'Bank reconciliation pending',
    description: 'February 2026 bank statements not yet reconciled.',
    clientId: 'client-1',
    clientName: 'Island Bakery',
  },
  {
    id: 'alert-5',
    type: 'period_close',
    severity: 'info',
    title: 'Ready to close February',
    description: 'All entries complete. Ready to close the period.',
    clientId: 'client-4',
    clientName: 'Montego Spa',
  },
  {
    id: 'alert-6',
    type: 'low_stock',
    severity: 'warning',
    title: '5 items low on stock',
    description: 'Several inventory items need reordering.',
    count: 5,
    clientId: 'client-5',
    clientName: 'Jerk Pit Restaurant',
  },
];

const MOCK_CLIENTS: AccountantClient[] = [
  {
    id: 'client-1',
    companyId: 'company-1',
    businessName: 'Island Bakery',
    businessType: 'Food & Beverage',
    monthlyRevenue: 320000,
    monthlyExpenses: 215000,
    profit: 105000,
    currency: 'JMD',
    alerts: MOCK_ALERTS.filter((a) => a.clientId === 'client-1'),
    lastActivity: new Date('2026-03-15T14:30:00'),
    status: 'active',
    joinedAt: new Date('2025-06-01'),
  },
  {
    id: 'client-2',
    companyId: 'company-2',
    businessName: 'Kingston Auto',
    businessType: 'Automotive',
    monthlyRevenue: 540000,
    monthlyExpenses: 420000,
    profit: 120000,
    currency: 'JMD',
    alerts: MOCK_ALERTS.filter((a) => a.clientId === 'client-2'),
    lastActivity: new Date('2026-03-15T09:15:00'),
    status: 'active',
    joinedAt: new Date('2025-08-15'),
  },
  {
    id: 'client-3',
    companyId: 'company-3',
    businessName: 'Beach Bar',
    businessType: 'Hospitality',
    monthlyRevenue: 180000,
    monthlyExpenses: 145000,
    profit: 35000,
    currency: 'JMD',
    alerts: MOCK_ALERTS.filter((a) => a.clientId === 'client-3'),
    lastActivity: new Date('2026-03-14T18:45:00'),
    status: 'active',
    joinedAt: new Date('2025-11-20'),
  },
  {
    id: 'client-4',
    companyId: 'company-4',
    businessName: 'Montego Spa',
    businessType: 'Health & Beauty',
    monthlyRevenue: 275000,
    monthlyExpenses: 185000,
    profit: 90000,
    currency: 'JMD',
    alerts: MOCK_ALERTS.filter((a) => a.clientId === 'client-4'),
    lastActivity: new Date('2026-03-15T11:00:00'),
    status: 'active',
    joinedAt: new Date('2025-09-10'),
  },
  {
    id: 'client-5',
    companyId: 'company-5',
    businessName: 'Jerk Pit Restaurant',
    businessType: 'Food & Beverage',
    monthlyRevenue: 425000,
    monthlyExpenses: 310000,
    profit: 115000,
    currency: 'JMD',
    alerts: MOCK_ALERTS.filter((a) => a.clientId === 'client-5'),
    lastActivity: new Date('2026-03-15T16:20:00'),
    status: 'active',
    joinedAt: new Date('2025-07-05'),
  },
  {
    id: 'client-6',
    companyId: 'company-6',
    businessName: 'Blue Mountain Coffee',
    businessType: 'Agriculture',
    monthlyRevenue: 890000,
    monthlyExpenses: 620000,
    profit: 270000,
    currency: 'JMD',
    alerts: [],
    lastActivity: new Date('2026-03-15T08:30:00'),
    status: 'active',
    joinedAt: new Date('2025-04-22'),
  },
  {
    id: 'client-7',
    companyId: 'company-7',
    businessName: 'Ocho Rios Tours',
    businessType: 'Tourism',
    monthlyRevenue: 350000,
    monthlyExpenses: 280000,
    profit: 70000,
    currency: 'JMD',
    alerts: [],
    lastActivity: new Date('2026-03-14T14:00:00'),
    status: 'active',
    joinedAt: new Date('2025-10-01'),
  },
  {
    id: 'client-8',
    companyId: 'company-8',
    businessName: 'Negril Hardware',
    businessType: 'Retail',
    monthlyRevenue: 215000,
    monthlyExpenses: 175000,
    profit: 40000,
    currency: 'JMD',
    alerts: [],
    lastActivity: new Date('2026-03-13T10:45:00'),
    status: 'active',
    joinedAt: new Date('2026-01-15'),
  },
  {
    id: 'client-9',
    companyId: 'company-9',
    businessName: 'Portmore Pharmacy',
    businessType: 'Healthcare',
    monthlyRevenue: 520000,
    monthlyExpenses: 390000,
    profit: 130000,
    currency: 'JMD',
    alerts: [],
    lastActivity: new Date('2026-03-15T13:10:00'),
    status: 'active',
    joinedAt: new Date('2025-12-08'),
  },
  {
    id: 'client-10',
    companyId: 'company-10',
    businessName: 'Mandeville Motors',
    businessType: 'Automotive',
    monthlyRevenue: 680000,
    monthlyExpenses: 540000,
    profit: 140000,
    currency: 'JMD',
    alerts: [],
    lastActivity: new Date('2026-03-14T16:30:00'),
    status: 'active',
    joinedAt: new Date('2025-05-18'),
  },
  {
    id: 'client-11',
    companyId: 'company-11',
    businessName: 'Spanish Town Salon',
    businessType: 'Health & Beauty',
    monthlyRevenue: 95000,
    monthlyExpenses: 72000,
    profit: 23000,
    currency: 'JMD',
    alerts: [],
    lastActivity: new Date('2026-03-12T11:20:00'),
    status: 'active',
    joinedAt: new Date('2026-02-01'),
  },
  {
    id: 'client-12',
    companyId: 'company-12',
    businessName: 'New Client Corp',
    businessType: 'Services',
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    profit: 0,
    currency: 'JMD',
    alerts: [],
    lastActivity: new Date('2026-03-15T10:00:00'),
    status: 'pending',
    joinedAt: new Date('2026-03-15'),
  },
];

// ============================================
// API RESPONSE TYPES (from real endpoints)
// ============================================

interface ApiClientResponse {
  id: string;
  accountantId: string;
  companyId: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  createdAt: string;
  company: {
    id: string;
    businessName: string;
    email: string;
    phone: string | null;
    trnNumber: string | null;
    gctNumber: string | null;
    industry: string | null;
    createdAt: string;
  };
}

interface ApiDashboardResponse {
  summary: {
    totalClients: number;
    activeClients: number;
    totalOverdueInvoices: number;
    totalOverdueAmount: number;
    payrollsDueThisWeek: number;
    gctFilingsDueThisMonth: number;
  };
  clients: {
    clientId: string;
    companyId: string;
    companyName: string;
    status: string;
    overdueInvoicesCount: number;
    overdueInvoicesAmount: number;
    receivablesTotal: number;
    pendingPayroll: {
      count: number;
      nextPayDate: string | null;
    };
    gctStatus: {
      lastFilingDate: string | null;
      nextDueDate: string | null;
      estimatedAmount: number;
    };
    monthlyRevenue: number;
    monthlyExpenses: number;
  }[];
  alerts: {
    id: string;
    clientId: string;
    companyName: string;
    type: 'PAYROLL_DUE' | 'GCT_DUE' | 'INVOICES_OVERDUE' | 'RECONCILIATION_PENDING' | 'PERIOD_CLOSE';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    dueDate: string | null;
    actionUrl: string;
  }[];
  lastUpdated: string;
}

// ============================================
// DATA TRANSFORMATION UTILITIES
// ============================================

/**
 * Map API severity to UI severity format
 */
function mapSeverity(apiSeverity: 'HIGH' | 'MEDIUM' | 'LOW'): 'critical' | 'warning' | 'info' {
  switch (apiSeverity) {
    case 'HIGH':
      return 'critical';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'info';
  }
}

/**
 * Map API alert type to UI alert type format
 */
function mapAlertType(
  apiType: 'PAYROLL_DUE' | 'GCT_DUE' | 'INVOICES_OVERDUE' | 'RECONCILIATION_PENDING' | 'PERIOD_CLOSE'
): ClientAlert['type'] {
  switch (apiType) {
    case 'PAYROLL_DUE':
      return 'payroll_due';
    case 'GCT_DUE':
      return 'gct_due';
    case 'INVOICES_OVERDUE':
      return 'invoices_overdue';
    case 'RECONCILIATION_PENDING':
      return 'bank_reconciliation';
    case 'PERIOD_CLOSE':
      return 'period_close';
    default:
      return 'period_close';
  }
}

/**
 * Map API status to UI status format
 */
function mapStatus(apiStatus: string): 'active' | 'inactive' | 'pending' {
  switch (apiStatus.toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'PENDING':
      return 'pending';
    case 'SUSPENDED':
    case 'REVOKED':
    case 'INACTIVE':
      return 'inactive';
    default:
      return 'active';
  }
}

/**
 * Transform API dashboard response to AccountantClient[] format
 */
function transformDashboardToClients(
  dashboard: ApiDashboardResponse,
  clientsData: ApiClientResponse[]
): { clients: AccountantClient[]; alerts: ClientAlert[] } {
  // Build a lookup map from API clients data
  const clientLookup = new Map(clientsData.map((c) => [c.companyId, c]));

  // Transform alerts
  const alerts: ClientAlert[] = dashboard.alerts.map((apiAlert) => ({
    id: apiAlert.id,
    type: mapAlertType(apiAlert.type),
    severity: mapSeverity(apiAlert.severity),
    title: apiAlert.message.split(' - ')[0] || apiAlert.message,
    description: apiAlert.message,
    dueDate: apiAlert.dueDate ? new Date(apiAlert.dueDate) : undefined,
    clientId: apiAlert.clientId,
    clientName: apiAlert.companyName,
  }));

  // Build alert lookup by clientId
  const alertsByClient = new Map<string, ClientAlert[]>();
  alerts.forEach((alert) => {
    const existing = alertsByClient.get(alert.clientId) || [];
    existing.push(alert);
    alertsByClient.set(alert.clientId, existing);
  });

  // Transform clients
  const clients: AccountantClient[] = dashboard.clients.map((dashClient) => {
    const apiClient = clientLookup.get(dashClient.companyId);
    const clientAlerts = alertsByClient.get(dashClient.clientId) || [];

    return {
      id: dashClient.clientId,
      companyId: dashClient.companyId,
      businessName: dashClient.companyName,
      businessType: apiClient?.company.industry || 'Business',
      monthlyRevenue: dashClient.monthlyRevenue,
      monthlyExpenses: dashClient.monthlyExpenses,
      profit: dashClient.monthlyRevenue - dashClient.monthlyExpenses,
      currency: 'JMD', // Default to JMD for Jamaica
      alerts: clientAlerts,
      lastActivity: new Date(), // API doesn't provide this directly
      status: mapStatus(dashClient.status),
      joinedAt: apiClient ? new Date(apiClient.createdAt) : new Date(),
    };
  });

  return { clients, alerts };
}

// ============================================
// PENDING INVITATION TYPE
// ============================================

export interface PendingInvitation {
  id: string;
  invitedEmail: string;
  invitedAt: Date | string;
  invitationExpiresAt: Date | string | null;
  company: {
    id: string;
    businessName: string;
    email: string | null;
    industry: string | null;
  };
}

// ============================================
// STORE INTERFACE
// ============================================

interface AccountantStore {
  // State
  clients: AccountantClient[];
  allAlerts: ClientAlert[];
  pendingInvitations: PendingInvitation[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
  searchQuery: string;
  sortBy: 'name' | 'revenue' | 'alerts' | 'activity';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';

  // Actions
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: AccountantStore['sortBy']) => void;
  setSortOrder: (order: AccountantStore['sortOrder']) => void;
  setViewMode: (mode: AccountantStore['viewMode']) => void;
  refreshClients: () => Promise<void>;
  inviteClient: (invite: ClientInvite) => Promise<void>;
  generateInviteLink: () => Promise<string>;
  switchToClient: (companyId: string) => void;
  clearError: () => void;
  
  // Invitation management
  resendInvitation: (invitationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchClientsFromAPI(): Promise<ApiClientResponse[]> {
  const response = await fetch('/api/v1/accountant/clients', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch clients: ${response.status}`);
  }

  const result = await response.json();
  return result.data || [];
}

async function fetchDashboardFromAPI(): Promise<ApiDashboardResponse> {
  const response = await fetch('/api/v1/accountant/dashboard', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch dashboard: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

async function inviteClientAPI(email: string, notes?: string, message?: string): Promise<void> {
  const response = await fetch('/api/v1/accountant/clients', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      notes,
      message, // Personal message for invitation email
      canAccessPayroll: true,
      canAccessBanking: true,
      canExportData: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to invite client: ${response.status}`);
  }
}

async function fetchPendingInvitationsAPI(): Promise<PendingInvitation[]> {
  const response = await fetch('/api/v1/accountant/clients?status=PENDING', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return []; // Return empty array on error
  }

  const result = await response.json();
  return (result.data || []).map((item: ApiClientResponse & { invitedEmail?: string; invitationExpiresAt?: string }) => ({
    id: item.id,
    invitedEmail: item.invitedEmail || item.company.email || '',
    invitedAt: item.createdAt,
    invitationExpiresAt: item.invitationExpiresAt || null,
    company: {
      id: item.company.id,
      businessName: item.company.businessName,
      email: item.company.email,
      industry: item.company.industry,
    },
  }));
}

async function resendInvitationAPI(invitationId: string): Promise<void> {
  const response = await fetch(`/api/v1/accountant/clients/${invitationId}/resend`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to resend invitation: ${response.status}`);
  }
}

async function cancelInvitationAPI(invitationId: string): Promise<void> {
  const response = await fetch(`/api/v1/accountant/clients/${invitationId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to cancel invitation: ${response.status}`);
  }
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useAccountantStore = create<AccountantStore>((set, get) => ({
  // Initial state - start with empty until fetched
  clients: [],
  allAlerts: [],
  pendingInvitations: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  searchQuery: '',
  sortBy: 'activity',
  sortOrder: 'desc',
  viewMode: 'grid',

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),

  setSortBy: (sortBy) => set({ sortBy }),

  setSortOrder: (sortOrder) => set({ sortOrder }),

  setViewMode: (viewMode) => set({ viewMode }),

  clearError: () => set({ error: null }),

  refreshClients: async () => {
    const { isLoading } = get();
    if (isLoading) return; // Prevent concurrent requests

    set({ isLoading: true, error: null });

    try {
      if (USE_MOCK_DATA) {
        // Use mock data for development/demo
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
        set({
          clients: MOCK_CLIENTS,
          allAlerts: MOCK_ALERTS,
          pendingInvitations: [],
          isLoading: false,
          lastFetched: new Date(),
        });
        return;
      }

      // Fetch real data from all endpoints in parallel
      const [clientsData, dashboardData, pendingInvitations] = await Promise.all([
        fetchClientsFromAPI(),
        fetchDashboardFromAPI(),
        fetchPendingInvitationsAPI(),
      ]);

      // Transform API data to store format
      const { clients, alerts } = transformDashboardToClients(dashboardData, clientsData);

      // If no real data, fall back to mock data with a note
      if (clients.length === 0 && dashboardData.summary.totalClients === 0 && pendingInvitations.length === 0) {
        console.info('[AccountantStore] No clients found, using mock data for demo');
        set({
          clients: MOCK_CLIENTS,
          allAlerts: MOCK_ALERTS,
          pendingInvitations: [],
          isLoading: false,
          lastFetched: new Date(),
        });
        return;
      }

      set({
        clients,
        allAlerts: alerts,
        pendingInvitations,
        isLoading: false,
        lastFetched: new Date(),
      });
    } catch (error) {
      console.error('[AccountantStore] Failed to fetch data:', error);

      // Fall back to mock data on error (for demo/development)
      console.info('[AccountantStore] Falling back to mock data');
      set({
        clients: MOCK_CLIENTS,
        allAlerts: MOCK_ALERTS,
        pendingInvitations: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch accountant data',
        lastFetched: new Date(),
      });
    }
  },

  inviteClient: async (invite) => {
    set({ isLoading: true, error: null });

    try {
      if (USE_MOCK_DATA) {
        // Simulate API call for mock mode
        console.log('[AccountantStore] Mock invite client:', invite);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        set({ isLoading: false });
        return;
      }

      await inviteClientAPI(invite.email, undefined, invite.message);
      set({ isLoading: false });

      // Refresh the client list after successful invite
      await get().refreshClients();
    } catch (error) {
      console.error('[AccountantStore] Failed to invite client:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to invite client',
      });
      throw error; // Re-throw for UI to handle
    }
  },

  resendInvitation: async (invitationId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('[AccountantStore] Mock resend invitation:', invitationId);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return;
      }

      await resendInvitationAPI(invitationId);
      
      // Refresh to update expiry dates
      await get().refreshClients();
    } catch (error) {
      console.error('[AccountantStore] Failed to resend invitation:', error);
      throw error;
    }
  },

  cancelInvitation: async (invitationId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('[AccountantStore] Mock cancel invitation:', invitationId);
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Remove from local state
        set((state) => ({
          pendingInvitations: state.pendingInvitations.filter((inv) => inv.id !== invitationId),
        }));
        return;
      }

      await cancelInvitationAPI(invitationId);
      
      // Remove from local state immediately
      set((state) => ({
        pendingInvitations: state.pendingInvitations.filter((inv) => inv.id !== invitationId),
      }));
    } catch (error) {
      console.error('[AccountantStore] Failed to cancel invitation:', error);
      throw error;
    }
  },

  generateInviteLink: async () => {
    // Generate a unique invite link
    // In production, this would call an API to create a secure invite token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.yaadbooks.com';
    return `${baseUrl}/invite/${token}`;
  },

  switchToClient: (companyId) => {
    // Navigate to the client's dashboard
    // This integrates with the main app's company switching logic
    console.log('[AccountantStore] Switching to client:', companyId);

    if (typeof window !== 'undefined') {
      // Get the access token
      const token = localStorage.getItem('yaadbooks_access_token');
      
      // Use the switch-client API endpoint then redirect
      fetch(`/api/v1/accountant/switch-client/${companyId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
      })
        .then(async (response) => {
          if (response.ok) {
            const { data } = await response.json();
            
            // Store the new access token
            if (data.accessToken) {
              localStorage.setItem('yaadbooks_access_token', data.accessToken);
            }
            
            // Store accountant context for UI (shows "Accountant View" indicator)
            if (data.accountantContext) {
              localStorage.setItem('yaadbooks_accountant_context', JSON.stringify(data.accountantContext));
            }
            
            window.location.href = '/dashboard';
          } else {
            // Fallback: direct navigation with query param
            window.location.href = `/dashboard?company=${companyId}`;
          }
        })
        .catch(() => {
          // Fallback on error
          window.location.href = `/dashboard?company=${companyId}`;
        });
    }
  },
}));

// ============================================
// SELECTORS
// ============================================

export function useFilteredClients() {
  const { clients, searchQuery, sortBy, sortOrder } = useAccountantStore();

  // Filter by search query
  let filtered = clients;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = clients.filter(
      (c) =>
        c.businessName.toLowerCase().includes(query) ||
        c.businessType.toLowerCase().includes(query)
    );
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.businessName.localeCompare(b.businessName);
        break;
      case 'revenue':
        comparison = a.monthlyRevenue - b.monthlyRevenue;
        break;
      case 'alerts':
        comparison = a.alerts.length - b.alerts.length;
        break;
      case 'activity':
        comparison =
          new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
}

export function useAccountantStats(): AccountantDashboardStats {
  const { clients, allAlerts } = useAccountantStore();

  return {
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.status === 'active').length,
    totalRevenue: clients.reduce((sum, c) => sum + c.monthlyRevenue, 0),
    totalAlerts: allAlerts.length,
    criticalAlerts: allAlerts.filter((a) => a.severity === 'critical').length,
    clientsWithIssues: new Set(allAlerts.map((a) => a.clientId)).size,
  };
}

export function useCriticalAlerts() {
  const { allAlerts } = useAccountantStore();
  return allAlerts.filter((a) => a.severity === 'critical');
}

export function useAllAlerts() {
  const { allAlerts } = useAccountantStore();
  return allAlerts;
}

export function useAccountantError() {
  return useAccountantStore((state) => state.error);
}

export function useAccountantLoading() {
  return useAccountantStore((state) => state.isLoading);
}

export function usePendingInvitations() {
  return useAccountantStore((state) => state.pendingInvitations);
}
