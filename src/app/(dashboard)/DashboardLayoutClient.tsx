'use client';

/**
 * TEMPORARY: Stripped-down layout for debugging hydration mismatch.
 * The original file has loading/error guards, TourProvider,
 * useDataHydration, and onboarding enforcement.
 */
import { QueryProvider } from '@/providers/QueryProvider';

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
