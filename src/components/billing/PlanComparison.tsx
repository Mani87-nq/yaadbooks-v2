'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { PLANS, type SubscriptionPlan } from '@/lib/billing/plans';
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

// ─── Feature Row Definitions ────────────────────────────────────

interface ComparisonRow {
  label: string;
  getValue: (plan: SubscriptionPlan) => string | number | boolean;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Max Users',
    getValue: (plan) => plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers,
  },
  {
    label: 'Max Companies',
    getValue: (plan) => plan.maxCompanies === -1 ? 'Unlimited' : plan.maxCompanies,
  },
  {
    label: 'Invoices / month',
    getValue: (plan) => plan.maxInvoicesPerMonth === -1 ? 'Unlimited' : plan.maxInvoicesPerMonth,
  },
  {
    label: 'POS System',
    getValue: (plan) => plan.includesPOS,
  },
  {
    label: 'Employee Portal',
    getValue: (plan) => plan.includesEmployeePortal,
  },
  {
    label: 'Industry Modules',
    getValue: (plan) => {
      if (plan.includesModules === -1) return 'All Included';
      if (plan.includesModules === 0) return 'None';
      return `${plan.includesModules} included`;
    },
  },
  {
    label: 'Offline Mode',
    getValue: (plan) => {
      if (plan.id === 'business' || plan.id === 'enterprise') return true;
      return false;
    },
  },
  {
    label: 'AI Assistant',
    getValue: (plan) => {
      return plan.id === 'professional' || plan.id === 'business' || plan.id === 'enterprise';
    },
  },
  // HIDDEN: WhatsApp not yet implemented
  // {
  //   label: 'WhatsApp Notifications',
  //   getValue: (plan) => {
  //     return plan.id === 'professional' || plan.id === 'business' || plan.id === 'enterprise';
  //   },
  // },
  {
    label: 'API Access',
    getValue: (plan) => plan.id === 'enterprise',
  },
  {
    label: 'Support Level',
    getValue: (plan) => {
      switch (plan.id) {
        case 'free': return 'Email';
        case 'starter': return 'Email';
        case 'professional': return 'Priority';
        case 'business': return 'Dedicated Rep';
        case 'enterprise': return 'Phone';  // WhatsApp not yet implemented
        default: return 'Email';
      }
    },
  },
];

// ─── Props ──────────────────────────────────────────────────────

interface PlanComparisonProps {
  currentPlanId?: string;
}

// ─── Component ──────────────────────────────────────────────────

export default function PlanComparison({ currentPlanId = 'free' }: PlanComparisonProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Feature Comparison
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          See exactly what is included in each plan.
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 min-w-[160px]">
                Feature
              </th>
              {PLANS.map((plan) => (
                <th
                  key={plan.id}
                  className={cn(
                    'text-center py-3 px-3 font-semibold min-w-[120px]',
                    plan.popular
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/5'
                      : 'text-gray-900 dark:text-white'
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{plan.name}</span>
                    {currentPlanId === plan.id && (
                      <Badge variant="success" size="sm">Current</Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {COMPARISON_ROWS.map((row, idx) => (
              <tr
                key={row.label}
                className={cn(
                  'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  idx % 2 === 0
                    ? 'bg-white dark:bg-gray-900'
                    : 'bg-gray-50/50 dark:bg-gray-800/30'
                )}
              >
                <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  {row.label}
                </td>
                {PLANS.map((plan) => {
                  const value = row.getValue(plan);
                  return (
                    <td
                      key={plan.id}
                      className={cn(
                        'text-center py-3 px-3',
                        plan.popular && 'bg-emerald-50/30 dark:bg-emerald-500/5'
                      )}
                    >
                      <CellValue value={value} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="md:hidden space-y-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'rounded-xl border p-4',
              plan.popular
                ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50/30 dark:bg-emerald-500/5'
                : currentPlanId === plan.id
                  ? 'border-emerald-300 dark:border-emerald-600 bg-white dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
              <div className="flex gap-1.5">
                {plan.popular && (
                  <Badge variant="success" size="sm">Popular</Badge>
                )}
                {currentPlanId === plan.id && (
                  <Badge variant="success" size="sm">Current</Badge>
                )}
              </div>
            </div>
            <dl className="space-y-2">
              {COMPARISON_ROWS.map((row) => {
                const value = row.getValue(plan);
                return (
                  <div key={row.label} className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">{row.label}</dt>
                    <dd className="text-sm font-medium">
                      <CellValue value={value} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cell Value Renderer ────────────────────────────────────────

function CellValue({ value }: { value: string | number | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <CheckCircleIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400 mx-auto" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
    );
  }

  if (typeof value === 'number') {
    return (
      <span className="font-semibold text-gray-900 dark:text-white">
        {value.toLocaleString('en-JM')}
      </span>
    );
  }

  // String values
  const isHighlight =
    value === 'Unlimited' ||
    value === 'All Included' ||
    value === 'Dedicated Rep' ||
    value === 'Phone & WhatsApp';

  return (
    <span
      className={cn(
        'text-sm',
        isHighlight
          ? 'font-semibold text-emerald-700 dark:text-emerald-400'
          : 'text-gray-700 dark:text-gray-300'
      )}
    >
      {value}
    </span>
  );
}
