'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { formatJMD, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { AccountantClient } from '@/types/accountant';

interface ClientCardProps {
  client: AccountantClient;
  onEnterBooks?: (clientId: string) => void;
}

export function ClientCard({ client, onEnterBooks }: ClientCardProps) {
  const alertCount = client.alerts.length;
  const hasCriticalAlerts = client.alerts.some((a) => a.severity === 'critical');
  const hasWarningAlerts = client.alerts.some((a) => a.severity === 'warning');

  const profitPositive = client.profit >= 0;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-lg hover:border-emerald-200',
        hasCriticalAlerts && 'border-red-200 bg-red-50/30',
        !hasCriticalAlerts && hasWarningAlerts && 'border-yellow-200 bg-yellow-50/30'
      )}
    >
      {/* Alert indicator bar */}
      {alertCount > 0 && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1',
            hasCriticalAlerts ? 'bg-red-500' : hasWarningAlerts ? 'bg-yellow-500' : 'bg-blue-500'
          )}
        />
      )}

      <div className="space-y-4">
        {/* Header: Logo + Name */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            {client.logo ? (
              <img
                src={client.logo}
                alt={client.businessName}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <BuildingStorefrontIcon className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{client.businessName}</h3>
            <p className="text-sm text-gray-500">{client.businessType}</p>
          </div>
          {client.status === 'pending' && <Badge variant="warning">Pending</Badge>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
              <BanknotesIcon className="w-3.5 h-3.5" />
              Revenue
            </div>
            <p className="font-semibold text-gray-900">{formatJMD(client.monthlyRevenue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
              <ChartBarIcon className="w-3.5 h-3.5" />
              Profit
            </div>
            <p
              className={cn(
                'font-semibold',
                profitPositive ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {profitPositive ? '+' : ''}
              {formatJMD(client.profit)}
            </p>
          </div>
        </div>

        {/* Alerts summary */}
        {alertCount > 0 && (
          <div
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-lg text-sm',
              hasCriticalAlerts
                ? 'bg-red-100 text-red-700'
                : hasWarningAlerts
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700'
            )}
          >
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>
              {alertCount} {alertCount === 1 ? 'alert' : 'alerts'} need attention
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Active {formatRelativeTime(client.lastActivity)}
          </span>
          <Button
            size="sm"
            onClick={() => onEnterBooks?.(client.companyId)}
            icon={<ArrowRightIcon className="w-4 h-4" />}
          >
            Enter Books
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Compact variant for list view
export function ClientCardCompact({ client, onEnterBooks }: ClientCardProps) {
  const alertCount = client.alerts.length;
  const hasCriticalAlerts = client.alerts.some((a) => a.severity === 'critical');

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all',
        hasCriticalAlerts && 'border-red-200'
      )}
    >
      {/* Logo */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
        {client.logo ? (
          <img
            src={client.logo}
            alt={client.businessName}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <BuildingStorefrontIcon className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{client.businessName}</h4>
        <p className="text-sm text-gray-500">{formatJMD(client.monthlyRevenue)} this month</p>
      </div>

      {/* Alerts */}
      {alertCount > 0 && (
        <Badge variant={hasCriticalAlerts ? 'danger' : 'warning'}>
          {alertCount} {alertCount === 1 ? 'alert' : 'alerts'}
        </Badge>
      )}

      {/* Action */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEnterBooks?.(client.companyId)}
      >
        Enter
      </Button>
    </div>
  );
}
