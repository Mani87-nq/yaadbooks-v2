// Accountant Dashboard Types

export interface AccountantClient {
  id: string;
  companyId: string;
  businessName: string;
  businessType: string;
  logo?: string;
  monthlyRevenue: number;
  monthlyExpenses: number;
  profit: number;
  currency: 'JMD' | 'USD';
  alerts: ClientAlert[];
  lastActivity: Date | string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date | string;
}

export interface ClientAlert {
  id: string;
  type: 'payroll_due' | 'gct_due' | 'invoices_overdue' | 'bank_reconciliation' | 'period_close' | 'low_stock';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  dueDate?: Date | string;
  count?: number; // e.g., "3 invoices overdue"
  clientId: string;
  clientName: string;
}

export interface AccountantDashboardStats {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  totalAlerts: number;
  criticalAlerts: number;
  clientsWithIssues: number;
}

export interface ClientInvite {
  email: string;
  businessName?: string;
  message?: string;
}
