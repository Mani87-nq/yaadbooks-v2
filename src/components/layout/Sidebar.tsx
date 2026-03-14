'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/lib/auth/rbac';
import { useActiveModuleIds } from '@/modules/store';
import { moduleRegistry } from '@/modules/registry';
import { useTier, type TierFeature } from '@/hooks/useTier';
import { LockedNavItem } from '@/components/tier';
import {
  HomeIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CubeIcon,
  BanknotesIcon,
  BookOpenIcon,
  WrenchScrewdriverIcon,
  UsersIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowPathIcon,
  ReceiptRefundIcon,
  BellAlertIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  ArrowsRightLeftIcon,
  QuestionMarkCircleIcon,
  BuildingOffice2Icon,
  PrinterIcon,
  CreditCardIcon,
  PuzzlePieceIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { ICON_MAP } from '@/lib/icon-map';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Permission required to see this item. null = visible to everyone. */
  permission?: Permission | null;
  /** Tier feature required for this item. If user doesn't have tier, shows locked. */
  tierFeature?: TierFeature;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    name: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, permission: null },
      { name: 'Point of Sale', href: '/pos', icon: ShoppingCartIcon, badge: 'NEW', permission: 'pos:read', tierFeature: 'pos' },
      { name: 'Day Management', href: '/pos/day-management', icon: CalendarDaysIcon, permission: 'pos:read', tierFeature: 'pos' },
      { name: 'POS Returns', href: '/pos/returns', icon: ReceiptRefundIcon, permission: 'pos:read', tierFeature: 'pos' },
      { name: 'POS Sessions', href: '/pos/sessions', icon: ClockIcon, permission: 'pos:read', tierFeature: 'pos' },
      { name: 'POS Grid Settings', href: '/pos/grid-settings', icon: Cog6ToothIcon, permission: 'pos:read', tierFeature: 'pos' },
    ],
  },
  {
    name: 'Sales',
    items: [
      { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon, permission: 'invoices:read' },
      { name: 'Recurring Invoices', href: '/invoices/recurring', icon: ArrowPathIcon, permission: 'invoices:read' },
      { name: 'Credit Notes', href: '/invoices/credit-notes', icon: ReceiptRefundIcon, permission: 'invoices:read' },
      { name: 'Payment Reminders', href: '/invoices/reminders', icon: BellAlertIcon, permission: 'invoices:read' },
      { name: 'Customers', href: '/customers', icon: UserGroupIcon, permission: 'customers:read' },
      { name: 'Customer Statements', href: '/customers/statements', icon: ClipboardDocumentListIcon, permission: 'customers:read' },
      { name: 'Quotations', href: '/quotations', icon: DocumentTextIcon, permission: 'quotations:read' },
    ],
  },
  {
    name: 'Operations',
    items: [
      { name: 'Inventory', href: '/inventory', icon: CubeIcon, permission: 'inventory:read', tierFeature: 'inventory' },
      { name: 'Stock Transfers', href: '/stock-transfers', icon: ArrowsRightLeftIcon, permission: 'inventory:read', tierFeature: 'inventory' },
      { name: 'Expenses', href: '/expenses', icon: BanknotesIcon, permission: 'expenses:read' },
    ],
  },
  {
    name: 'Accounting',
    items: [
      { name: 'Chart of Accounts', href: '/accounting/chart', icon: BookOpenIcon, permission: 'gl:read' },
      { name: 'Journal Entries', href: '/accounting/journal', icon: BookOpenIcon, permission: 'journal:read' },
      { name: 'Fixed Assets', href: '/fixed-assets', icon: WrenchScrewdriverIcon, permission: 'fixed_assets:read' },
      { name: 'Banking', href: '/banking', icon: BuildingLibraryIcon, permission: 'banking:read' },
      { name: 'Bank Reconciliation', href: '/banking/reconciliation', icon: ScaleIcon, permission: 'banking:reconcile', tierFeature: 'bank_reconciliation' },
      { name: 'Budgets', href: '/accounting/budgets', icon: CalculatorIcon, badge: 'NEW', permission: 'gl:read' },
    ],
  },
  {
    name: 'HR & Payroll',
    items: [
      { name: 'Payroll', href: '/payroll', icon: UsersIcon, permission: 'payroll:read', tierFeature: 'payroll' },
      { name: 'Pension Plans', href: '/payroll/pension-plans', icon: BuildingLibraryIcon, badge: 'NEW', permission: 'payroll:read', tierFeature: 'payroll' },
      { name: 'Remittances', href: '/payroll/remittances', icon: BanknotesIcon, badge: 'NEW', permission: 'payroll:read', tierFeature: 'payroll' },
    ],
  },
  {
    name: 'Reports & AI',
    items: [
      { name: 'Reports', href: '/reports', icon: ChartBarIcon, permission: 'reports:read', tierFeature: 'all_reports' },
      { name: 'KPI Dashboard', href: '/reports/kpi', icon: ArrowTrendingUpIcon, badge: 'NEW', permission: 'reports:read', tierFeature: 'advanced_analytics' },
      { name: 'Budget vs Actual', href: '/reports/budget-vs-actual', icon: ScaleIcon, badge: 'NEW', permission: 'reports:read', tierFeature: 'advanced_analytics' },
      { name: 'Departmental P&L', href: '/reports/departmental-pl', icon: BuildingOffice2Icon, badge: 'NEW', permission: 'reports:read', tierFeature: 'advanced_analytics' },
      { name: 'Customer Profitability', href: '/reports/customer-profitability', icon: UserGroupIcon, badge: 'NEW', permission: 'reports:read', tierFeature: 'advanced_analytics' },
      { name: 'Stock Valuation', href: '/reports/stock-valuation', icon: CubeIcon, badge: 'NEW', permission: 'reports:read', tierFeature: 'all_reports' },
      { name: 'Trial Balance', href: '/reports/trial-balance', icon: CalculatorIcon, permission: 'reports:read', tierFeature: 'all_reports' },
      { name: 'General Ledger', href: '/reports/general-ledger', icon: BookOpenIcon, permission: 'reports:read', tierFeature: 'all_reports' },
      { name: 'Cash Flow', href: '/reports/cash-flow', icon: ArrowTrendingUpIcon, permission: 'reports:read', tierFeature: 'all_reports' },
      { name: 'AR/AP Aging', href: '/reports/aging', icon: ClipboardDocumentListIcon, permission: 'reports:read', tierFeature: 'all_reports' },
      { name: 'Audit Trail', href: '/reports/audit-trail', icon: ShieldCheckIcon, permission: 'audit:read' },
      { name: 'AI Assistant', href: '/ai', icon: SparklesIcon, badge: 'AI', permission: null, tierFeature: 'ai_assistant' },
    ],
  },
  {
    name: 'System',
    items: [
      { name: 'Modules', href: '/modules', icon: PuzzlePieceIcon, badge: 'NEW', permission: null, tierFeature: 'industry_modules' },
      { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, permission: 'settings:read' },
      { name: 'Billing', href: '/billing', icon: CreditCardIcon, permission: null },
      { name: 'Receipt Printer', href: '/settings/receipt-printer', icon: PrinterIcon, badge: 'NEW', permission: null },
      { name: 'Help Center', href: '/help', icon: QuestionMarkCircleIcon, permission: null },
    ],
  },
];

const STORAGE_KEY = 'yb-sidebar-expanded-groups';

const defaultExpanded: Record<string, boolean> = {
  Main: true,
  Sales: true,
  Operations: false,
  Accounting: false,
  'HR & Payroll': false,
  'Reports & AI': false,
  System: false,
};

function loadExpandedState(): Record<string, boolean> {
  if (typeof window === 'undefined') return defaultExpanded;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return defaultExpanded;
}

function Badge({ type }: { type: string }) {
  if (type === 'NEW') {
    return (
      <span className="ml-auto flex h-4 items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-1.5 text-[10px] font-semibold leading-none text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200/60 dark:ring-emerald-500/25">
        <span className="h-1 w-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
        NEW
      </span>
    );
  }
  if (type === 'AI') {
    return (
      <span className="ml-auto flex h-4 items-center rounded-full bg-violet-100 dark:bg-violet-500/15 px-1.5 text-[10px] font-semibold leading-none text-violet-700 dark:text-violet-400 ring-1 ring-violet-200/60 dark:ring-violet-500/25">
        AI
      </span>
    );
  }
  return (
    <span className="ml-auto rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
      {type}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  // ── Atomic Zustand selectors ────────────────────────────────────
  // CRITICAL: useAppStore() without a selector subscribes to the ENTIRE
  // store.  When useDataHydration updates 14 entity types the Sidebar
  // (50+ Link components) would re-render on every single change and
  // overwhelm the React 19 scheduler, causing expired lanes that block
  // all client-side navigation.
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const activeCompany = useAppStore((s) => s.activeCompany);
  const { can } = usePermissions();
  const activeModuleIds = useActiveModuleIds();
  const { hasFeature } = useTier();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(defaultExpanded);

  // Build module nav groups from the registry based on active modules
  const moduleNavGroups: NavGroup[] = useMemo(() => {
    const moduleGroups = moduleRegistry.getModuleNavItems(activeModuleIds);
    return moduleGroups.map((mg) => ({
      name: mg.moduleName,
      items: mg.items.map((navItem) => ({
        name: navItem.label,
        href: `/${mg.moduleId}/${navItem.href}`,
        icon: ICON_MAP[navItem.icon] || PuzzlePieceIcon,
        permission: (navItem.permission as Permission) || null,
      })),
    }));
  }, [activeModuleIds]);

  // Combined navigation: static groups + module groups (inserted before System)
  const allNavigation = useMemo(() => {
    if (moduleNavGroups.length === 0) return navigation;
    const systemIdx = navigation.findIndex((g) => g.name === 'System');
    if (systemIdx === -1) return [...navigation, ...moduleNavGroups];
    return [
      ...navigation.slice(0, systemIdx),
      ...moduleNavGroups,
      ...navigation.slice(systemIdx),
    ];
  }, [moduleNavGroups]);

  // Load persisted state on mount
  useEffect(() => {
    setExpandedGroups(loadExpandedState());
  }, []);

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupName]: !prev[groupName] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Auto-expand group if it contains the active route
  useEffect(() => {
    if (!pathname) return;
    for (const group of allNavigation) {
      const hasActive = group.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + '/')
      );
      if (hasActive && !expandedGroups[group.name]) {
        setExpandedGroups((prev) => {
          const next = { ...prev, [group.name]: true };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, allNavigation]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — light: clean white | dark: rich dark gradient */}
      <aside
        data-tour="sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 lg:relative',
          'bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-900 dark:to-gray-950',
          'text-gray-800 dark:text-white',
          'border-r border-gray-200 dark:border-white/[0.10]',
          sidebarOpen ? 'w-64' : 'w-20',
          !sidebarOpen && 'lg:w-20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header / Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-white/[0.10]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/20">
              YB
              <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">YaadBooks</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none">Business Suite</span>
              </div>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center h-7 w-7 rounded-md text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeftIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex items-center justify-center h-7 w-7 rounded-md text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
            aria-label="Close navigation menu"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Company Selector */}
        {sidebarOpen && activeCompany && (
          <div className="border-b border-gray-200 dark:border-white/[0.10] px-4 py-3">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-0.5 font-medium">
              Company
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {activeCompany.businessName}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-3">
          {allNavigation.map((group, groupIndex) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || can(item.permission)
            );
            if (visibleItems.length === 0) return null;

            const isExpanded = expandedGroups[group.name] ?? false;
            const hasActiveChild = visibleItems.some(
              (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
            );

            return (
              <div key={group.name}>
                {/* Group separator line */}
                {groupIndex > 0 && (
                  <div className="mx-4 my-1.5 border-t border-gray-100 dark:border-white/[0.12]" />
                )}

                {/* Group header - collapsible (only in expanded sidebar) */}
                {sidebarOpen ? (
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-1.5 text-[11px] uppercase tracking-wider font-medium transition-colors rounded-md mx-0',
                      hasActiveChild
                        ? 'text-gray-700 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    )}
                  >
                    <span>{group.name}</span>
                    <ChevronDownIcon
                      className={cn(
                        'h-3 w-3 text-gray-400 transition-transform duration-200',
                        !isExpanded && '-rotate-90'
                      )}
                    />
                  </button>
                ) : (
                  /* In collapsed mode, no group headers - just a thin separator is shown above */
                  null
                )}

                {/* Group items */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200 ease-in-out',
                    sidebarOpen && !isExpanded && 'max-h-0 opacity-0',
                    sidebarOpen && isExpanded && 'max-h-[500px] opacity-100',
                    !sidebarOpen && 'max-h-[500px] opacity-100'
                  )}
                >
                  <ul className={cn('space-y-0.5 px-2', sidebarOpen && 'mt-0.5')}>
                    {visibleItems.map((item) => {
                      const isActive =
                        pathname === item.href || pathname?.startsWith(item.href + '/');

                      // Check if feature is locked by tier
                      const isLocked = item.tierFeature && !hasFeature(item.tierFeature);

                      // Tour target attributes for guided product tour
                      const tourTarget =
                        item.href === '/modules' ? 'sidebar-modules' :
                        item.href === '/settings' ? 'sidebar-settings' :
                        item.href === '/help' ? 'sidebar-help' :
                        item.href === '/invoices' ? 'sidebar-invoices' :
                        item.href === '/pos' ? 'sidebar-pos' :
                        undefined;

                      // Render locked nav item
                      if (isLocked && item.tierFeature) {
                        return (
                          <li key={item.name}>
                            <LockedNavItem
                              feature={item.tierFeature}
                              name={item.name}
                              icon={item.icon}
                              href={item.href}
                              badge={item.badge}
                              sidebarOpen={sidebarOpen}
                            />
                          </li>
                        );
                      }

                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            {...(tourTarget ? { 'data-tour': tourTarget } : {})}
                            className={cn(
                              'group/item relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                              isActive
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white',
                              !sidebarOpen && 'justify-center px-0'
                            )}
                            title={!sidebarOpen ? item.name : undefined}
                          >
                            {/* Active indicator bar */}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
                            )}

                            <item.icon
                              className={cn(
                                'h-[18px] w-[18px] flex-shrink-0 transition-colors duration-150',
                                isActive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-gray-400 dark:text-gray-400 group-hover/item:text-gray-700 dark:group-hover/item:text-white'
                              )}
                            />

                            {sidebarOpen && (
                              <>
                                <span className="flex-1 truncate">{item.name}</span>
                                {item.badge && <Badge type={item.badge} />}
                              </>
                            )}

                            {/* Tooltip for collapsed mode */}
                            {!sidebarOpen && (
                              <div className="absolute left-full ml-2 hidden group-hover/item:flex items-center z-50">
                                <div className="relative flex items-center">
                                  <div className="absolute -left-1 w-2 h-2 bg-white dark:bg-gray-800 rotate-45 border-l border-b border-gray-200 dark:border-white/[0.12]" />
                                  <div className="whitespace-nowrap rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-lg dark:shadow-xl">
                                    {item.name}
                                    {item.badge && (
                                      <span className={cn(
                                        'ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                                        item.badge === 'AI'
                                          ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400'
                                          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                      )}>
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-white/[0.10] px-4 py-3">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wide">
                YaadBooks v1.0
              </span>
              <span className="text-xs opacity-80" title="Made in Jamaica">
                &#x1F1EF;&#x1F1F2;
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="text-[10px] opacity-60" title="Made in Jamaica">
                &#x1F1EF;&#x1F1F2;
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
