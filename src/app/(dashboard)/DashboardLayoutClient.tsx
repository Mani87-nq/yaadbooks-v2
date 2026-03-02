'use client';

/**
 * DashboardLayoutClient — Wraps all dashboard pages.
 *
 * CRITICAL FIX: Uses a "mounted" guard to prevent ALL hydration mismatches.
 *
 * The problem: React 19 throws error #418 (text hydration mismatch) whenever
 * server-rendered HTML differs from the client's first render. In this app,
 * dozens of components use Date(), timezone-dependent formatters, theme state,
 * and other browser-only values during render. Each mismatch triggers a React
 * recovery transition that can expire, permanently blocking ALL client-side
 * navigation (router.push, Link clicks — nothing works).
 *
 * The fix: Render a lightweight static skeleton on both server AND client
 * first render (guaranteed identical → zero mismatches). After mount, switch
 * to the real layout. For an authenticated SaaS dashboard, SSR provides no
 * SEO benefit, so this trade-off is ideal.
 *
 * The skeleton matches the visual structure (sidebar + header + content area)
 * to minimize perceived loading time.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QueryProvider } from '@/providers/QueryProvider';
import { useDataHydration } from '@/hooks/useDataHydration';
import { useAppStore } from '@/store/appStore';
import { TourProvider } from '@/components/tour/TourProvider';
import { TourAutoLauncher } from '@/components/tour/TourAutoLauncher';

/**
 * Separate component for data hydration + onboarding enforcement.
 * This prevents the hydration state changes from affecting the
 * rendering of {children} in the parent layout.
 */
function DataHydrationManager() {
  const { isHydrated } = useDataHydration();
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarded = useAppStore((s) => s.isOnboarded);

  // Onboarding enforcement
  useEffect(() => {
    if (isHydrated && !isOnboarded && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
    }
  }, [isHydrated, isOnboarded, pathname, router]);

  return null; // Renders nothing — only runs side effects
}

/**
 * Static skeleton that renders identically on server and client.
 * No Date(), no theme, no Zustand, no browser APIs — just static HTML.
 * This guarantees zero hydration mismatches.
 */
function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">YB</span>
          </div>
          <div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded mt-1 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <div className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-9 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Page content skeleton */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="space-y-6">
            {/* Welcome banner skeleton */}
            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
            {/* Table skeleton */}
            <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Server render + client first render: static skeleton ──────────
  // Both produce identical HTML → zero hydration mismatches → zero
  // React error #418 → zero expired transition lanes → working navigation.
  if (!mounted) {
    return <DashboardSkeleton />;
  }

  // ── After mount: real layout (client-only) ────────────────────────
  // No hydration step — this is a pure client render, so Date(),
  // theme, Zustand, localStorage, etc. are all safe to use.
  return (
    <QueryProvider>
      <TourProvider>
        <DashboardLayout>{children}</DashboardLayout>
        <DataHydrationManager />
        <TourAutoLauncher />
      </TourProvider>
    </QueryProvider>
  );
}
