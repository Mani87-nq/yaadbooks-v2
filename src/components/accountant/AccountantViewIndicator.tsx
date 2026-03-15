'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, ArrowLeftIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

interface AccountantViewIndicatorProps {
  isAccountantView: boolean;
  clientCompanyName: string | null;
  onBackToDashboard?: () => void;
}

/**
 * Visual indicator shown when an accountant is viewing a client's books.
 * Includes a quick "back to dashboard" action.
 */
export function AccountantViewIndicator({
  isAccountantView,
  clientCompanyName,
  onBackToDashboard,
}: AccountantViewIndicatorProps) {
  const router = useRouter();

  if (!isAccountantView || !clientCompanyName) {
    return null;
  }

  const handleBackToDashboard = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      router.push('/accountant');
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
            <EyeIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Accountant View</span>
          </div>
          <div className="flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-semibold">{clientCompanyName}</span>
          </div>
        </div>
        
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Compact version for the header/navbar area.
 */
export function AccountantViewBadge({
  clientCompanyName,
  onClick,
}: {
  clientCompanyName: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
    >
      <EyeIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Viewing:</span>
      <span className="font-semibold truncate max-w-[120px]">{clientCompanyName}</span>
    </button>
  );
}

export default AccountantViewIndicator;
