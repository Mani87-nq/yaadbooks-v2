'use client';

/**
 * ModuleGate Component
 *
 * Client-side gate that checks if the user has access to a specific module.
 * Shows an upgrade prompt if access is denied.
 *
 * Usage:
 *   <ModuleGate requiredModule="salon">
 *     <SalonDashboard />
 *   </ModuleGate>
 */

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  LockClosedIcon,
  ArrowUpCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export type IndustryModule = 'retail' | 'restaurant' | 'salon';

interface ModuleAccessState {
  loading: boolean;
  hasAccess: boolean;
  needsSelection: boolean;
  tier: string | null;
  selectedModule: string | null;
  error: string | null;
}

interface ModuleGateProps {
  /**
   * The module required to view this content.
   */
  requiredModule: IndustryModule;
  /**
   * Content to render if access is granted.
   */
  children: ReactNode;
  /**
   * Optional: Custom loading component.
   */
  loadingComponent?: ReactNode;
  /**
   * Optional: Custom fallback for when access is denied.
   */
  fallback?: ReactNode;
}

const MODULE_NAMES: Record<IndustryModule, string> = {
  retail: 'Retail & Loyalty',
  restaurant: 'Restaurant & Bar',
  salon: 'Salon & Spa',
};

export function ModuleGate({
  requiredModule,
  children,
  loadingComponent,
  fallback,
}: ModuleGateProps) {
  const [state, setState] = useState<ModuleAccessState>({
    loading: true,
    hasAccess: false,
    needsSelection: false,
    tier: null,
    selectedModule: null,
    error: null,
  });

  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/v1/company/module');
        if (!response.ok) {
          throw new Error('Failed to check module access');
        }

        const data = await response.json();
        const { tier, selectedModule, needsSelection, hasModuleAccess } = data;

        // Determine if user has access to the requested module
        let hasAccess = false;

        if (!hasModuleAccess) {
          // Tier doesn't have industry modules
          hasAccess = false;
        } else if (tier === 'enterprise') {
          // Enterprise has all modules
          hasAccess = true;
        } else if (selectedModule) {
          // Professional/Business: check if selected module matches
          hasAccess = selectedModule.toLowerCase() === requiredModule;
        }

        setState({
          loading: false,
          hasAccess,
          needsSelection,
          tier,
          selectedModule,
          error: null,
        });
      } catch (err) {
        setState({
          loading: false,
          hasAccess: false,
          needsSelection: false,
          tier: null,
          selectedModule: null,
          error: 'Failed to verify module access',
        });
      }
    }

    checkAccess();
  }, [requiredModule]);

  // Loading state
  if (state.loading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-6 text-center">
        <ExclamationTriangleIcon className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300">{state.error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Access granted
  if (state.hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Needs module selection
  if (state.needsSelection) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-8 text-center max-w-lg mx-auto">
        <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center mx-auto mb-4">
          <ExclamationTriangleIcon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Select Your Industry Module
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You need to select your industry module before accessing {MODULE_NAMES[requiredModule]} features.
        </p>
        <Link
          href="/admin/module-selection"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          Choose Your Module
        </Link>
      </div>
    );
  }

  // Access denied - wrong module or tier too low
  const needsUpgrade = !state.tier || ['free', 'starter'].includes(state.tier);

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center max-w-lg mx-auto">
      <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
        <LockClosedIcon className="h-7 w-7 text-gray-500 dark:text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {MODULE_NAMES[requiredModule]} Module Required
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {needsUpgrade ? (
          <>
            Upgrade to Professional tier or higher to access {MODULE_NAMES[requiredModule]} features.
          </>
        ) : (
          <>
            Your current plan includes the{' '}
            <strong className="text-gray-900 dark:text-white">
              {state.selectedModule ? MODULE_NAMES[state.selectedModule.toLowerCase() as IndustryModule] : 'selected'}
            </strong>{' '}
            module. Upgrade to Enterprise for access to all modules.
          </>
        )}
      </p>
      <Link
        href="/billing/plans"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
      >
        <ArrowUpCircleIcon className="h-5 w-5" />
        {needsUpgrade ? 'View Pricing Plans' : 'Upgrade to Enterprise'}
      </Link>
    </div>
  );
}

export default ModuleGate;
