'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { useDashboardStats, useRecentInvoices, useLowStockProducts } from '@/hooks/api/useDashboard';
import { formatRelativeTime } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { StatusBadge } from '@/components/ui/Badge';
import {
  BanknotesIcon,
  DocumentTextIcon,
  CubeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  PlusIcon,
  ChartBarIcon,
  SparklesIcon,
  DocumentPlusIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// ============================================
// CSS-ONLY ENTRANCE ANIMATIONS
// ============================================
const fadeSlideUpStyle = (delay: number): React.CSSProperties => ({
  animation: `fadeSlideUp 0.5s ease-out ${delay}ms both`,
});

// Keyframes (fadeSlideUp, shimmer, pulseGlow) are defined in globals.css
// to avoid hydration mismatches from inline <style> tags.

// ============================================
// GREETING HELPER
// ============================================
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// QUICK ACTION COMPONENT (PREMIUM)
// ============================================
function QuickAction({
  icon: Icon,
  title,
  href,
  bgColor,
  hoverBorder,
  tourTarget,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  bgColor: string;
  hoverBorder: string;
  tourTarget?: string;
}) {
  return (
    <Link
      href={href}
      {...(tourTarget ? { 'data-tour': tourTarget } : {})}
      className={`group relative flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 ${hoverBorder} hover:shadow-lg dark:shadow-gray-900/30 transition-all duration-300 overflow-hidden`}
    >
      {/* Subtle background glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 rounded-2xl" style={{ background: 'radial-gradient(circle at center, currentColor, transparent 70%)' }} />
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{title}</span>
    </Link>
  );
}

// ============================================
// STAT CARD COMPONENT (PREMIUM)
// ============================================
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconBg,
  gradientFrom,
  gradientTo,
}: {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-300 p-6 bg-gradient-to-br ${gradientFrom} ${gradientTo}`}
    >
      {/* Decorative corner accent */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07]" style={{ background: 'currentColor' }} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight truncate">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5 mt-3">
              {changeType === 'positive' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{change}</span>
                </div>
              )}
              {changeType === 'negative' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800">
                  <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">{change}</span>
                </div>
              )}
              {changeType === 'neutral' && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-700">
                  {change}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm dark:shadow-gray-900/20 flex-shrink-0`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
  const { fc } = useCurrency();
  const { activeCompany, user } = useAppStore();
  const stats = useDashboardStats();
  const recentInvoices = useRecentInvoices(5);
  const lowStockProducts = useLowStockProducts();

  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);
  const firstName = user?.firstName || 'there';

  return (
      <div className="space-y-8 pb-8">
        {/* ─── WELCOME HEADER ─────────────────────────────────────────── */}
        <div data-tour="dashboard-welcome" style={fadeSlideUpStyle(0)} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-8 lg:p-10 shadow-lg dark:shadow-gray-900/30">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-3 h-3 rounded-full bg-white/20 animate-pulse" />
          <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-white/15" style={{ animation: 'pulseGlow 3s ease-in-out infinite' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDaysIcon className="w-4 h-4 text-emerald-200" />
                <p className="text-emerald-100 text-sm font-medium">{formattedDate}</p>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                {greeting}, {firstName}
              </h1>
              <p className="text-emerald-100 mt-2 text-base">
                Here&apos;s what&apos;s happening with {activeCompany?.businessName || 'your business'} today.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 backdrop-blur-sm transition-all duration-200"
              >
                <ChartBarIcon className="w-4 h-4" />
                View Reports
              </Link>
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-50 shadow-sm transition-all duration-200"
              >
                <PlusIcon className="w-4 h-4" />
                New Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* ─── QUICK ACTIONS ──────────────────────────────────────────── */}
        <div style={fadeSlideUpStyle(80)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <QuickAction
              icon={ShoppingCartIcon}
              title="POS Terminal"
              href="/pos"
              bgColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
              hoverBorder="hover:border-emerald-200"
              tourTarget="quick-action-pos"
            />
            <QuickAction
              icon={DocumentPlusIcon}
              title="New Invoice"
              href="/invoices/new"
              bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
              hoverBorder="hover:border-blue-200"
              tourTarget="quick-action-invoice"
            />
            <QuickAction
              icon={UserPlusIcon}
              title="Add Customer"
              href="/customers/new"
              bgColor="bg-gradient-to-br from-purple-500 to-purple-600"
              hoverBorder="hover:border-purple-200"
            />
            <QuickAction
              icon={CubeIcon}
              title="Add Product"
              href="/inventory"
              bgColor="bg-gradient-to-br from-orange-500 to-orange-600"
              hoverBorder="hover:border-orange-200"
            />
            <QuickAction
              icon={BanknotesIcon}
              title="New Expense"
              href="/expenses"
              bgColor="bg-gradient-to-br from-rose-500 to-rose-600"
              hoverBorder="hover:border-rose-200"
            />
            <QuickAction
              icon={SparklesIcon}
              title="AI Assistant"
              href="/ai"
              bgColor="bg-gradient-to-br from-indigo-500 to-indigo-600"
              hoverBorder="hover:border-indigo-200"
            />
          </div>
        </div>

        {/* ─── STAT CARDS ─────────────────────────────────────────────── */}
        <div style={fadeSlideUpStyle(160)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenue"
            value={fc(stats.totalRevenue)}
            change={`${stats.invoiceCount ?? 0} invoices`}
            changeType="neutral"
            icon={BanknotesIcon}
            iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
            gradientFrom="from-white dark:from-gray-800"
            gradientTo="to-emerald-50/50 dark:to-emerald-900/20"
          />
          <StatCard
            title="Receivable"
            value={fc(stats.totalReceivable)}
            change={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : 'All current'}
            changeType={stats.overdueCount > 0 ? 'negative' : 'positive'}
            icon={DocumentTextIcon}
            iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
            gradientFrom="from-white dark:from-gray-800"
            gradientTo="to-blue-50/50 dark:to-blue-900/20"
          />
          <StatCard
            title="Expenses"
            value={fc(stats.totalExpenses)}
            change={`${stats.expenseCount ?? 0} this month`}
            changeType="neutral"
            icon={BanknotesIcon}
            iconBg="bg-gradient-to-br from-rose-500 to-rose-600"
            gradientFrom="from-white dark:from-gray-800"
            gradientTo="to-rose-50/50 dark:to-rose-900/20"
          />
          <StatCard
            title="Net Profit"
            value={fc(stats.profit)}
            change={stats.profit > 0 ? 'Profitable' : stats.profit < 0 ? 'Loss' : 'Break even'}
            changeType={stats.profit > 0 ? 'positive' : stats.profit < 0 ? 'negative' : 'neutral'}
            icon={ArrowTrendingUpIcon}
            iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
            gradientFrom="from-white dark:from-gray-800"
            gradientTo="to-purple-50/50 dark:to-purple-900/20"
          />
        </div>

        {/* ─── AT A GLANCE METRICS BAR ────────────────────────────────── */}
        <div style={fadeSlideUpStyle(220)} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm dark:shadow-gray-900/20">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.customerCount}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customers</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm dark:shadow-gray-900/20">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.invoiceCount}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm dark:shadow-gray-900/20">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <CubeIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStockCount}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Low Stock</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm dark:shadow-gray-900/20">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdueCount}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
            </div>
          </div>
        </div>

        {/* ─── LOWER SECTION: INVOICES & LOW STOCK ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div style={fadeSlideUpStyle(300)} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Invoices</h3>
              </div>
              <Link
                href="/invoices"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="px-6 pb-6">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No invoices yet</p>
                  <Link
                    href="/invoices/new"
                    className="inline-flex items-center gap-1.5 mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-semibold"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create your first invoice
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentInvoices.map((invoice, index) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50/80 dark:hover:bg-gray-700 transition-all duration-200 group"
                      style={fadeSlideUpStyle(350 + index * 50)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 group-hover:bg-white dark:group-hover:bg-gray-700 flex items-center justify-center transition-colors border border-gray-100 dark:border-gray-700">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                            {(index + 1).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {invoice.customer?.name || 'Unknown'} &middot; {formatRelativeTime(invoice.issueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{fc(invoice.total)}</p>
                        <div className="mt-1">
                          <StatusBadge status={invoice.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div style={fadeSlideUpStyle(320)} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${lowStockProducts.length > 0 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'} flex items-center justify-center`}>
                  {lowStockProducts.length > 0 ? (
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {lowStockProducts.length > 0 ? 'Low Stock Alerts' : 'Stock Status'}
                </h3>
                {lowStockProducts.length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {lowStockProducts.length}
                  </span>
                )}
              </div>
              <Link
                href="/inventory"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
              >
                View inventory
              </Link>
            </div>
            <div className="px-6 pb-6">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">All stock levels healthy</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No items below reorder level</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {lowStockProducts.slice(0, 5).map((product, index) => (
                    <Link
                      key={product.id}
                      href="/inventory"
                      className="flex items-center justify-between p-3.5 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all duration-200 group"
                      style={fadeSlideUpStyle(370 + index * 50)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 flex items-center justify-center transition-colors border border-red-100 dark:border-red-800">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">SKU: {product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-red-600 text-sm">{product.quantity} left</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Reorder at {product.reorderLevel}</p>
                      </div>
                    </Link>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <div className="pt-3 text-center">
                      <Link
                        href="/inventory"
                        className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                      >
                        +{lowStockProducts.length - 5} more items need attention
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── GCT BANNER (PREMIUM) ───────────────────────────────────── */}
        <div style={fadeSlideUpStyle(400)} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 p-6 lg:p-8 shadow-lg dark:shadow-gray-900/30">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full border-2 border-white -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full border-2 border-white translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <CheckCircleIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">GCT Ready</h3>
                <p className="text-emerald-100 text-sm mt-0.5 max-w-md">
                  YaadBooks automatically calculates GCT at 15% on all applicable transactions.
                </p>
              </div>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-50 shadow-sm transition-all duration-200"
              >
                View GCT Report
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 backdrop-blur-sm transition-all duration-200"
              >
                Configure Rates
              </Link>
            </div>
          </div>
        </div>
      </div>
  );
}
