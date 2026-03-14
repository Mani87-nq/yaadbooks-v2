'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ClockIcon,
  CalendarIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import type { ClientAlert } from '@/types/accountant';

interface AlertsPanelProps {
  alerts: ClientAlert[];
  maxVisible?: number;
  showClientName?: boolean;
  onAlertClick?: (alert: ClientAlert) => void;
}

export function AlertsPanel({
  alerts,
  maxVisible = 5,
  showClientName = true,
  onAlertClick,
}: AlertsPanelProps) {
  // Sort by severity: critical > warning > info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const visibleAlerts = sortedAlerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;

  const getAlertIcon = (type: ClientAlert['type']) => {
    switch (type) {
      case 'payroll_due':
        return BanknotesIcon;
      case 'gct_due':
        return CalendarIcon;
      case 'invoices_overdue':
        return DocumentTextIcon;
      case 'bank_reconciliation':
        return ClockIcon;
      case 'period_close':
        return CalendarIcon;
      case 'low_stock':
        return CubeIcon;
      default:
        return ExclamationTriangleIcon;
    }
  };

  const getSeverityStyles = (severity: ClientAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 hover:bg-red-100',
          border: 'border-red-200',
          icon: 'bg-red-100 text-red-600',
          text: 'text-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 hover:bg-yellow-100',
          border: 'border-yellow-200',
          icon: 'bg-yellow-100 text-yellow-600',
          text: 'text-yellow-700',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 hover:bg-blue-100',
          border: 'border-blue-200',
          icon: 'bg-blue-100 text-blue-600',
          text: 'text-blue-700',
        };
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent>
          <div className="flex items-center gap-3 text-emerald-700">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <InformationCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-emerald-600">No alerts requiring attention.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
          </div>
          <CardTitle>Alerts</CardTitle>
        </div>
        <Badge variant="danger">{alerts.length}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibleAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            const styles = getSeverityStyles(alert.severity);

            return (
              <button
                key={alert.id}
                onClick={() => onAlertClick?.(alert)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left',
                  styles.bg,
                  styles.border
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', styles.icon)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium text-sm', styles.text)}>
                    {showClientName && <span className="text-gray-700">{alert.clientName} — </span>}
                    {alert.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">{alert.description}</p>
                  {alert.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {formatDate(alert.dueDate)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {hiddenCount > 0 && (
          <p className="text-center text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
            +{hiddenCount} more {hiddenCount === 1 ? 'alert' : 'alerts'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
