'use client';

/**
 * Module Selector Component
 *
 * Shows on first Professional tier login if no module is selected.
 * Presents cards for each industry module with features included.
 * Selection is permanent (requires support to change).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  SparklesIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export type IndustryModule = 'retail' | 'restaurant' | 'salon';

interface ModuleOption {
  id: IndustryModule;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    border: string;
    text: string;
    ring: string;
    gradient: string;
  };
  features: string[];
}

const MODULE_OPTIONS: ModuleOption[] = [
  {
    id: 'retail',
    name: 'Retail & Loyalty',
    description: 'For shops, stores, and retail businesses',
    icon: ShoppingBagIcon,
    color: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      ring: 'ring-blue-500/20',
      gradient: 'from-blue-500 to-blue-600',
    },
    features: [
      'Customer loyalty points & rewards',
      'Promotion & discount campaigns',
      'Barcode scanning & label printing',
      'Stock alerts & reorder points',
      'Gift cards & store credit',
      'Multi-location inventory sync',
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Bar',
    description: 'For restaurants, bars, and food service',
    icon: BuildingStorefrontIcon,
    color: {
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      border: 'border-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      ring: 'ring-orange-500/20',
      gradient: 'from-orange-500 to-orange-600',
    },
    features: [
      'Kitchen Display System (KDS)',
      'Table management & floor plans',
      'Bar tab & split billing',
      'Recipe costing & menu engineering',
      'Ingredient tracking & wastage',
      'Reservation management',
    ],
  },
  {
    id: 'salon',
    name: 'Salon & Spa',
    description: 'For salons, spas, and service businesses',
    icon: SparklesIcon,
    color: {
      bg: 'bg-pink-50 dark:bg-pink-500/10',
      border: 'border-pink-500',
      text: 'text-pink-600 dark:text-pink-400',
      ring: 'ring-pink-500/20',
      gradient: 'from-pink-500 to-pink-600',
    },
    features: [
      'Online appointment booking',
      'Stylist/therapist scheduling',
      'Client preferences & history',
      'Service duration tracking',
      'Commission calculations',
      'Product usage per service',
    ],
  },
];

interface ModuleSelectorProps {
  /**
   * Callback when a module is selected.
   * Should call the API to save the selection.
   */
  onSelect?: (module: IndustryModule) => Promise<{ success: boolean; error?: string }>;
  /**
   * If true, shows a compact version for embedding in other pages.
   */
  compact?: boolean;
  /**
   * Pre-selected module (for display purposes only).
   */
  initialSelected?: IndustryModule;
}

export function ModuleSelector({
  onSelect,
  compact = false,
  initialSelected,
}: ModuleSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<IndustryModule | null>(initialSelected || null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (module: IndustryModule) => {
    if (loading) return;
    setSelected(module);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!selected || loading) return;

    setLoading(true);
    setError(null);

    try {
      if (onSelect) {
        const result = await onSelect(selected);
        if (!result.success) {
          setError(result.error || 'Failed to save selection');
          setLoading(false);
          return;
        }
      } else {
        // Default API call
        const response = await fetch('/api/v1/company/module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module: selected }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.detail || 'Failed to save selection');
          setLoading(false);
          return;
        }
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Module Cards */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {MODULE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              disabled={loading}
              className={`
                relative p-6 rounded-2xl border-2 text-left transition-all duration-200
                ${
                  isSelected
                    ? `${option.color.border} ${option.color.bg} shadow-lg ring-2 ${option.color.ring}`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md bg-white dark:bg-gray-800'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-3 -right-3">
                  <div className={`bg-gradient-to-r ${option.color.gradient} rounded-full p-1.5 shadow-lg`}>
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${option.color.bg}`}>
                  <Icon className={`h-6 w-6 ${option.color.text}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {option.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${option.color.text}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Warning Banner */}
      {selected && !confirming && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                This selection is permanent
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Your industry module cannot be changed later without contacting support.
                Choose the module that best fits your business type.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Action Button */}
      {selected && (
        <div className="flex justify-end">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`
                inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white
                bg-gradient-to-r ${MODULE_OPTIONS.find((o) => o.id === selected)?.color.gradient}
                hover:shadow-lg transition-all duration-200
              `}
            >
              Continue with {MODULE_OPTIONS.find((o) => o.id === selected)?.name}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`
                  inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white
                  bg-gradient-to-r ${MODULE_OPTIONS.find((o) => o.id === selected)?.color.gradient}
                  hover:shadow-lg transition-all duration-200
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Confirm Selection
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModuleSelector;
