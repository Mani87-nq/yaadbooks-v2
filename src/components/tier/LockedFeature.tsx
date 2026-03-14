'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTier, type TierFeature } from '@/hooks/useTier';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { UpgradeModal } from './UpgradeModal';

interface LockedFeatureProps {
  /** The feature being gated */
  feature: TierFeature;
  /** The tier required for this feature (optional - auto-detected from feature) */
  requiredTier?: string;
  /** Content to show (will be overlaid if locked) */
  children: React.ReactNode;
  /** Render as inline element instead of block */
  inline?: boolean;
  /** Show a subtle lock instead of full overlay (for nav items) */
  subtle?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when locked feature is clicked */
  onLockedClick?: () => void;
}

/**
 * LockedFeature - Wraps content and shows lock overlay if feature is not available
 * 
 * Usage:
 * ```tsx
 * <LockedFeature feature="inventory">
 *   <InventoryDashboard />
 * </LockedFeature>
 * ```
 */
export function LockedFeature({
  feature,
  requiredTier,
  children,
  inline = false,
  subtle = false,
  className,
  onLockedClick,
}: LockedFeatureProps) {
  const { hasFeature, getRequiredTier, getRequiredTierName } = useTier();
  const [showModal, setShowModal] = useState(false);
  
  const isLocked = !hasFeature(feature);
  const tierRequired = requiredTier || getRequiredTier(feature);
  const tierName = getRequiredTierName(feature);
  
  // Not locked - render children normally
  if (!isLocked) {
    return <>{children}</>;
  }
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLockedClick?.();
    setShowModal(true);
  };
  
  // Subtle mode - for navigation items
  if (subtle) {
    return (
      <>
        <div
          onClick={handleClick}
          className={cn(
            'relative cursor-pointer opacity-60 hover:opacity-80 transition-opacity',
            className
          )}
        >
          {children}
          <LockClosedIcon className="absolute top-1/2 right-2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        </div>
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          feature={feature}
          requiredTier={tierRequired}
        />
      </>
    );
  }
  
  // Full overlay mode
  const Wrapper = inline ? 'span' : 'div';
  
  return (
    <>
      <Wrapper
        onClick={handleClick}
        className={cn(
          'relative cursor-pointer group',
          inline ? 'inline-flex items-center' : 'block',
          className
        )}
      >
        {/* Content with blur/opacity */}
        <div className="opacity-40 blur-[1px] pointer-events-none select-none">
          {children}
        </div>
        
        {/* Lock Overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-[2px]',
            'rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600',
            'transition-all duration-200',
            'group-hover:border-emerald-400 dark:group-hover:border-emerald-500',
            'group-hover:bg-gray-100/70 dark:group-hover:bg-gray-900/70'
          )}
        >
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
              <LockClosedIcon className="h-6 w-6 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {tierName} Feature
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Click to upgrade
              </p>
            </div>
          </div>
        </div>
      </Wrapper>
      
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
        requiredTier={tierRequired}
      />
    </>
  );
}

/**
 * LockedNavItem - Specialized version for sidebar navigation items
 * Shows greyed out item with lock icon
 */
interface LockedNavItemProps {
  feature: TierFeature;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string;
  sidebarOpen: boolean;
}

export function LockedNavItem({
  feature,
  name,
  icon: Icon,
  badge,
  sidebarOpen,
}: LockedNavItemProps) {
  const { hasFeature, getRequiredTierName } = useTier();
  const [showModal, setShowModal] = useState(false);
  const tierName = getRequiredTierName(feature);
  
  if (hasFeature(feature)) {
    return null; // Should not be used for unlocked features
  }
  
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          'group/item relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium w-full',
          'text-gray-400 dark:text-gray-500 cursor-pointer',
          'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
          'transition-all duration-150',
          !sidebarOpen && 'justify-center px-0'
        )}
        title={!sidebarOpen ? `${name} (${tierName})` : undefined}
      >
        <Icon className="h-[18px] w-[18px] flex-shrink-0 text-gray-400 dark:text-gray-500" />
        
        {sidebarOpen && (
          <>
            <span className="flex-1 truncate text-left">{name}</span>
            <LockClosedIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            {badge && (
              <span className="ml-1 rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {badge}
              </span>
            )}
          </>
        )}
        
        {/* Tooltip for collapsed mode */}
        {!sidebarOpen && (
          <div className="absolute left-full ml-2 hidden group-hover/item:flex items-center z-50">
            <div className="relative flex items-center">
              <div className="absolute -left-1 w-2 h-2 bg-white dark:bg-gray-800 rotate-45 border-l border-b border-gray-200 dark:border-white/[0.12]" />
              <div className="whitespace-nowrap rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 shadow-lg dark:shadow-xl flex items-center gap-1.5">
                <LockClosedIcon className="h-3 w-3" />
                {name}
                <span className="text-[10px] text-gray-400">({tierName})</span>
              </div>
            </div>
          </div>
        )}
      </button>
      
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
        requiredTier={feature}
      />
    </>
  );
}

export default LockedFeature;
