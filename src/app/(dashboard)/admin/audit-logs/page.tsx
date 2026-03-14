'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import api from '@/lib/api-client';
import {
  ShieldCheckIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// TYPES
// =============================================================================

interface AuditLogEntry {
  id: string;
  action: string;
  enumAction: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  companyId: string | null;
  companyName: string | null;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  pagination: Pagination;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACTION_CATEGORIES = {
  'Invoice Actions': [
    'INVOICE_CREATED',
    'INVOICE_EDITED',
    'INVOICE_DELETED',
    'INVOICE_VOIDED',
    'INVOICE_LIMIT_REACHED',
  ],
  'Payroll Actions': [
    'PAYROLL_RUN_CREATED',
    'PAYROLL_RUN_APPROVED',
    'PAYROLL_RUN_PAID',
    'PAYROLL_LIMIT_REACHED',
  ],
  'User/Team Actions': [
    'USER_INVITED',
    'USER_JOINED',
    'USER_REMOVED',
    'USER_ROLE_CHANGED',
    'USER_LIMIT_REACHED',
  ],
  'Tier/Subscription': [
    'TIER_UPGRADED',
    'TIER_DOWNGRADED',
    'TIER_CHANGED',
    'PAYMENT_FAILED',
    'PAYMENT_RECOVERED',
    'GRACE_PERIOD_STARTED',
    'GRACE_PERIOD_ENDED',
  ],
  'Access Control': [
    'ACCESS_BLOCKED',
    'FEATURE_LOCKED',
    'MODULE_BLOCKED',
    'RATE_LIMITED',
  ],
  'Data Actions': [
    'DATA_EXPORTED',
    'DATA_IMPORTED',
    'BULK_DELETE',
  ],
  'Module Actions': [
    'MODULE_SELECTED',
    'MODULE_CHANGED',
    'MODULE_ACTIVATED',
    'MODULE_DEACTIVATED',
  ],
  'Admin Actions': [
    'ADMIN_IMPERSONATE_START',
    'ADMIN_IMPERSONATE_END',
    'ADMIN_OVERRIDE',
    'ADMIN_MANUAL_ADJUSTMENT',
  ],
  'Security': [
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'PASSWORD_CHANGED',
    'TWO_FACTOR_ENABLED',
    'TWO_FACTOR_DISABLED',
    'SUSPICIOUS_ACTIVITY',
  ],
};

const ACTION_BADGE_COLORS: Record<string, string> = {
  // Create - Green
  INVOICE_CREATED: 'bg-green-100 text-green-800',
  PAYROLL_RUN_CREATED: 'bg-green-100 text-green-800',
  USER_INVITED: 'bg-green-100 text-green-800',
  USER_JOINED: 'bg-green-100 text-green-800',
  MODULE_ACTIVATED: 'bg-green-100 text-green-800',
  
  // Update - Blue
  INVOICE_EDITED: 'bg-blue-100 text-blue-800',
  TIER_UPGRADED: 'bg-blue-100 text-blue-800',
  TIER_CHANGED: 'bg-blue-100 text-blue-800',
  USER_ROLE_CHANGED: 'bg-blue-100 text-blue-800',
  MODULE_SELECTED: 'bg-blue-100 text-blue-800',
  PAYMENT_RECOVERED: 'bg-blue-100 text-blue-800',
  
  // Delete - Red
  INVOICE_DELETED: 'bg-red-100 text-red-800',
  INVOICE_VOIDED: 'bg-red-100 text-red-800',
  USER_REMOVED: 'bg-red-100 text-red-800',
  BULK_DELETE: 'bg-red-100 text-red-800',
  
  // Warning - Orange/Amber
  ACCESS_BLOCKED: 'bg-amber-100 text-amber-800',
  FEATURE_LOCKED: 'bg-amber-100 text-amber-800',
  MODULE_BLOCKED: 'bg-amber-100 text-amber-800',
  RATE_LIMITED: 'bg-amber-100 text-amber-800',
  INVOICE_LIMIT_REACHED: 'bg-amber-100 text-amber-800',
  PAYROLL_LIMIT_REACHED: 'bg-amber-100 text-amber-800',
  USER_LIMIT_REACHED: 'bg-amber-100 text-amber-800',
  STORAGE_LIMIT_REACHED: 'bg-amber-100 text-amber-800',
  AI_LIMIT_REACHED: 'bg-amber-100 text-amber-800',
  PAYMENT_FAILED: 'bg-amber-100 text-amber-800',
  GRACE_PERIOD_STARTED: 'bg-amber-100 text-amber-800',
  
  // Purple - Admin
  ADMIN_IMPERSONATE_START: 'bg-purple-100 text-purple-800',
  ADMIN_IMPERSONATE_END: 'bg-purple-100 text-purple-800',
  ADMIN_OVERRIDE: 'bg-purple-100 text-purple-800',
  ADMIN_MANUAL_ADJUSTMENT: 'bg-purple-100 text-purple-800',
  
  // Security - Red outline
  LOGIN_FAILED: 'bg-red-50 text-red-700 border border-red-300',
  SUSPICIOUS_ACTIVITY: 'bg-red-50 text-red-700 border border-red-300',
  
  // Success - Green
  LOGIN_SUCCESS: 'bg-emerald-100 text-emerald-800',
  GRACE_PERIOD_ENDED: 'bg-emerald-100 text-emerald-800',
  
  // Default
  default: 'bg-gray-100 text-gray-800',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncateUserAgent(ua: string | null): string {
  if (!ua) return 'N/A';
  if (ua.length <= 50) return ua;
  return ua.substring(0, 47) + '...';
}

function getActionBadgeColor(action: string): string {
  return ACTION_BADGE_COLORS[action] || ACTION_BADGE_COLORS.default;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AuditLogsPage() {
  const { user, activeCompany, userRole } = useAppStore();
  
  // State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Selected log detail
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  
  // Fetch audit logs
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      
      if (filterAction) params.append('action', filterAction);
      if (filterDateStart) params.append('startDate', filterDateStart);
      if (filterDateEnd) params.append('endDate', filterDateEnd);
      if (activeCompany?.id) params.append('companyId', activeCompany.id);
      
      const response = await api.get<AuditLogsResponse>(`/api/admin/audit-logs?${params.toString()}`);
      
      setLogs(response.logs || []);
      setPagination(response.pagination || pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterDateStart, filterDateEnd, activeCompany?.id]);
  
  // Initial fetch
  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);
  
  // Export logs
  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (filterAction) params.append('action', filterAction);
      if (filterDateStart) params.append('startDate', filterDateStart);
      if (filterDateEnd) params.append('endDate', filterDateEnd);
      if (activeCompany?.id) params.append('companyId', activeCompany.id);
      
      const response = await fetch(`/api/admin/audit-logs/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get filename from header or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };
  
  // Render access denied for non-admins
  if (!user || !userRole || !['OWNER', 'ADMIN'].includes(userRole)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-500">
              You need admin privileges to view audit logs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheckIcon className="w-7 h-7 text-indigo-600" />
            Audit Logs
          </h1>
          <p className="text-gray-500 mt-1">
            Track all system activities and security events
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Type
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Actions</option>
                  {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => (
                    <optgroup key={category} label={category}>
                      {actions.map((action) => (
                        <option key={action} value={action}>
                          {formatAction(action)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              {/* Date Range Start */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <Input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                />
              </div>
              
              {/* Date Range End */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <Input
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                />
              </div>
              
              {/* Apply Filters */}
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => fetchLogs(1)}
                  className="flex-1"
                >
                  <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterAction('');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                    fetchLogs(1);
                  }}
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {pagination.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.enumAction === 'CREATE').length}
            </div>
            <div className="text-sm text-gray-500">Create Actions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {logs.filter(l => l.enumAction === 'SECURITY_ALERT').length}
            </div>
            <div className="text-sm text-gray-500">Security Alerts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {logs.filter(l => l.enumAction === 'DELETE').length}
            </div>
            <div className="text-sm text-gray-500">Delete Actions</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-700">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchLogs(pagination.page)}
                className="ml-auto"
              >
                <ArrowPathIcon className="w-4 h-4 mr-1" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity Log</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-8 h-8 mx-auto animate-spin text-gray-400" />
              <p className="text-gray-500 mt-2">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300" />
              <p className="text-gray-500 mt-2">No audit logs found</p>
              <p className="text-gray-400 text-sm">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[200px]">Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="w-[140px]">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="font-mono text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            {formatDate(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                            {formatAction(log.action)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-sm">{log.userName}</div>
                              <div className="text-xs text-gray-500">{log.userEmail || 'N/A'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="text-sm text-gray-600 truncate">
                            {log.reason || log.entityId}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-500">
                          {log.ipAddress || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total.toLocaleString()} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrev}
                    onClick={() => fetchLogs(pagination.page - 1)}
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNext}
                    onClick={() => fetchLogs(pagination.page + 1)}
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                  Audit Log Details
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Action Badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getActionBadgeColor(selectedLog.action)}`}>
                  {formatAction(selectedLog.action)}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDate(selectedLog.createdAt)}
                </span>
              </div>
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">User</div>
                  <div className="text-gray-600">
                    {selectedLog.userName}
                    {selectedLog.userEmail && (
                      <span className="text-gray-400 ml-1">
                        ({selectedLog.userEmail})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Company</div>
                  <div className="text-gray-600">
                    {selectedLog.companyName || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Entity ID</div>
                  <div className="text-gray-600 font-mono text-xs">
                    {selectedLog.entityId}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">IP Address</div>
                  <div className="text-gray-600 font-mono">
                    {selectedLog.ipAddress || 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* User Agent */}
              {selectedLog.userAgent && (
                <div>
                  <div className="font-medium text-gray-700 text-sm mb-1">
                    User Agent
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded font-mono break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>
              )}
              
              {/* Reason */}
              {selectedLog.reason && (
                <div>
                  <div className="font-medium text-gray-700 text-sm mb-1">
                    Reason
                  </div>
                  <div className="text-sm text-gray-600 bg-amber-50 p-2 rounded">
                    {selectedLog.reason}
                  </div>
                </div>
              )}
              
              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="font-medium text-gray-700 text-sm mb-1">
                    Metadata
                  </div>
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
