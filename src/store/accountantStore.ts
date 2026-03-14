// Accountant Dashboard Store
// Manages multi-client view state for accountants

import { create } from 'zustand';
import type { AccountantClient, ClientAlert, AccountantDashboardStats, ClientInvite } from '@/types/accountant';

// ============================================
// MOCK DATA (Replace with API calls)
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
// STORE INTERFACE
// ============================================

interface AccountantStore {
  // State
  clients: AccountantClient[];
  allAlerts: ClientAlert[];
  isLoading: boolean;
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
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useAccountantStore = create<AccountantStore>((set, get) => ({
  // Initial state
  clients: MOCK_CLIENTS,
  allAlerts: MOCK_ALERTS,
  isLoading: false,
  searchQuery: '',
  sortBy: 'activity',
  sortOrder: 'desc',
  viewMode: 'grid',

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),

  setSortBy: (sortBy) => set({ sortBy }),

  setSortOrder: (sortOrder) => set({ sortOrder }),

  setViewMode: (viewMode) => set({ viewMode }),

  refreshClients: async () => {
    set({ isLoading: true });
    // TODO: Replace with actual API call
    // const response = await fetch('/api/v1/accountant/clients');
    // const clients = await response.json();
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
    set({ clients: MOCK_CLIENTS, allAlerts: MOCK_ALERTS, isLoading: false });
  },

  inviteClient: async (invite) => {
    // TODO: Replace with actual API call
    // await fetch('/api/v1/accountant/invite', {
    //   method: 'POST',
    //   body: JSON.stringify(invite),
    // });
    console.log('Inviting client:', invite);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  },

  generateInviteLink: async () => {
    // TODO: Replace with actual API call
    // const response = await fetch('/api/v1/accountant/invite-link', { method: 'POST' });
    // const { link } = await response.json();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const token = Math.random().toString(36).substring(2, 15);
    return `https://app.yaadbooks.com/invite/${token}`;
  },

  switchToClient: (companyId) => {
    // TODO: Integrate with appStore to switch active company
    console.log('Switching to client:', companyId);
    // This would typically:
    // 1. Update the active company in appStore
    // 2. Navigate to the client's dashboard
    window.location.href = `/dashboard?company=${companyId}`;
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
