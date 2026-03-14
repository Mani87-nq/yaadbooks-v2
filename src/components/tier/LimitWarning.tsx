'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTier, type LimitType } from '@/hooks/useTier';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/solid';

interface LimitWarningProps {
  /** Type of limit to check */
  type: LimitType;
  /** Custom className */
  className?: string;
  /** Show as compact inline badge instead of full banner */
  compact?: boolean;
  /** Override current usage (otherwise uses hook) */
  current?: number;
  /** Override limit (otherwise uses hook) */
  limit?: number;
}

// Human-readable limit type names
const LIMIT_NAMES: Record<LimitType, string> = {
  invoices: 'invoices',
  users: 'users',
  companies: 'companies',
  storage: 'storage',
  ai_questions: 'AI questions',
};

const LIMIT_ACTIONS: Record<LimitType, string> = {
  invoices: 'create more invoices',
  users: 'add more users',
  companies: 'add more companies',
  storage: 'upload more files',
  ai_questions: 'ask more AI questions',
};

/**
 * LimitWarning - Shows warning banner when approaching or at usage limits
 * 
 * Usage:
 * ```tsx
 * <LimitWarning type="invoices" />
 * ```
 */
export function LimitWarning({
  type,
  className,
  compact = false,
  current: overrideCurrent,
  limit: overrideLimit,
}: LimitWarningProps) {
  const { usage, tier, tierName } = useTier();
  
  const usageData = usage[type];
  const current = overrideCurrent ?? usageData.current;
  const limit = overrideLimit ?? usageData.limit;
  const unlimited = usageData.unlimited && overrideLimit === undefined;
  
  // Calculate percentage with overrides
  const percentage = unlimited ? 0 : Math.min(100, (current / limit) * 100);
  const isApproaching = !unlimited && percentage >= 80 && percentage < 100;
  const isAtLimit = !unlimited && percentage >= 100;
  
  // Don't show anything if not approaching limit
  if (!isApproaching && !isAtLimit) {
    return null;
  }
  
  const limitName = LIMIT_NAMES[type];
  const limitAction = LIMIT_ACTIONS[type];
  
  // Compact badge version
  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          isAtLimit
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
          className
        )}
      >
        {isAtLimit ? (
          <XCircleIcon className="h-3.5 w-3.5" />
        ) : (
          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
        )}
        {current}/{unlimited ? '∞' : limit}
      </span>
    );
  }
  
  // Full banner version
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isAtLimit
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
            isAtLimit
              ? 'bg-red-100 dark:bg-red-900/50'
              : 'bg-amber-100 dark:bg-amber-900/50'
          )}
        >
          {isAtLimit ? (
            <XCircleIcon
              className="h-5 w-5 text-red-600 dark:text-red-400"
            />
          ) : (
            <ExclamationTriangleIcon
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
            />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'text-sm font-semibold',
              isAtLimit
                ? 'text-red-800 dark:text-red-300'
                : 'text-amber-800 dark:text-amber-300'
            )}
          >
            {isAtLimit
              ? `${limitName.charAt(0).toUpperCase() + limitName.slice(1)} Limit Reached`
              : `Approaching ${limitName.charAt(0).toUpperCase() + limitName.slice(1)} Limit`}
          </h4>
          <p
            className={cn(
              'text-sm mt-1',
              isAtLimit
                ? 'text-red-700 dark:text-red-400'
                : 'text-amber-700 dark:text-amber-400'
            )}
          >
            {isAtLimit ? (
              <>
                You&apos;ve used <strong>{current}</strong> of <strong>{limit}</strong> {limitName} on your {tierName} plan.
                Upgrade to {limitAction}.
              </>
            ) : (
              <>
                You&apos;ve used <strong>{current}</strong> of <strong>{limit}</strong> {limitName} ({Math.round(percentage)}%).
                Consider upgrading before you reach your limit.
              </>
            )}
          </p>
          
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isAtLimit
                  ? 'bg-red-500 dark:bg-red-400'
                  : 'bg-amber-500 dark:bg-amber-400'
              )}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
        
        {/* Upgrade button */}
        <Link
          href="/billing"
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isAtLimit
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          )}
        >
          <ArrowUpIcon className="h-4 w-4" />
          Upgrade
        </Link>
      </div>
    </div>
  );
}

/**
 * LimitProgress - Shows usage progress without warning styling
 * Good for dashboards and settings pages
 */
interface LimitProgressProps {
  type: LimitType;
  className?: string;
  showLabel?: boolean;
}

export function LimitProgress({
  type,
  className,
  showLabel = true,
}: LimitProgressProps) {
  const { usage } = useTier();
  const { current, limit, unlimited, percentage, isApproaching, isAtLimit } = usage[type];
  
  const limitName = LIMIT_NAMES[type];
  
  return (
    <div className={cn('space-y-1.5', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 capitalize">{limitName}</span>
          <span
            className={cn(
              'font-medium',
              isAtLimit
                ? 'text-red-600 dark:text-red-400'
                : isApproaching
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-900 dark:text-white'
            )}
          >
            {current} / {unlimited ? '∞' : limit.toLocaleString()}
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isAtLimit
              ? 'bg-red-500 dark:bg-red-400'
              : isApproaching
                ? 'bg-amber-500 dark:bg-amber-400'
                : 'bg-emerald-500 dark:bg-emerald-400'
          )}
          style={{ width: unlimited ? '5%' : `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

export default LimitWarning;
