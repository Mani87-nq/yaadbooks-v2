'use client';

/**
 * PaymentWarningBanner
 * 
 * Displays progressive warnings based on payment failure status:
 * - Day 0-2: Yellow warning banner
 * - Day 3-6: Red urgent warning banner
 * - Day 7+: Downgraded notice (if they haven't been downgraded yet)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PaymentWarningBannerProps {
  paymentFailedAt: string | Date | null;
  gracePeriodNotified: boolean;
  subscriptionStatus?: string;
  className?: string;
}

export function PaymentWarningBanner({
  paymentFailedAt,
  gracePeriodNotified,
  subscriptionStatus,
  className = '',
}: PaymentWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or if no payment failure
  if (!mounted || !paymentFailedAt) {
    return null;
  }

  // Already downgraded to free
  if (subscriptionStatus === 'INACTIVE') {
    return null;
  }

  // Calculate days since failure
  const failureDate = new Date(paymentFailedAt);
  const now = new Date();
  const daysSinceFailure = Math.floor(
    (now.getTime() - failureDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate downgrade date
  const downgradeDate = new Date(failureDate);
  downgradeDate.setDate(downgradeDate.getDate() + 7);
  const daysRemaining = Math.max(0, 7 - daysSinceFailure);

  // Don't allow dismissing urgent warnings (Day 3+)
  const canDismiss = daysSinceFailure < 3;
  
  if (dismissed && canDismiss) {
    return null;
  }

  // Determine banner style based on urgency
  const isUrgent = daysSinceFailure >= 3;
  const isDowngraded = daysSinceFailure >= 7;

  if (isDowngraded) {
    return (
      <div className={`bg-gray-100 border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Account on Free tier.</span>{' '}
                Your data is safe. Upgrade to restore full access to all features.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/settings/billing"
                className="inline-flex items-center px-4 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isUrgent) {
    // Red urgent banner (Day 3-6)
    return (
      <div className={`bg-red-600 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-100" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-white">
                <span className="font-bold">URGENT:</span>{' '}
                Your account will be downgraded in{' '}
                <span className="font-bold">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span>.
                Update your payment method now to avoid losing access to premium features.
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <Link
                href="/settings/billing"
                className="inline-flex items-center px-4 py-1.5 border border-transparent text-sm font-bold rounded-md bg-white text-red-600 hover:bg-red-50 transition-colors shadow-sm"
              >
                Update Payment Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Yellow warning banner (Day 0-2)
  return (
    <div className={`bg-amber-50 border-b border-amber-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-amber-800">
              <span className="font-medium">Payment failed.</span>{' '}
              Please update your payment method within{' '}
              <span className="font-semibold">{daysRemaining} days</span>{' '}
              to avoid service interruption.
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link
              href="/settings/billing"
              className="inline-flex items-center px-4 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 transition-colors"
            >
              Update Payment
            </Link>
            {canDismiss && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1.5 rounded-md text-amber-600 hover:bg-amber-100 transition-colors"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to fetch payment failure status from API.
 * Use this in layouts/pages that need to show the banner.
 */
export function usePaymentWarningStatus(companyId: string | null) {
  const [status, setStatus] = useState<{
    paymentFailedAt: string | null;
    gracePeriodNotified: boolean;
    subscriptionStatus: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/v1/companies/${companyId}/payment-status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch payment status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [companyId]);

  return { status, loading };
}

export default PaymentWarningBanner;
