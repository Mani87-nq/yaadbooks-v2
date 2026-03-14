/**
 * Module Selection Page
 *
 * Full page module selection for new Professional tier users.
 * Cannot proceed without selecting a module.
 *
 * This page is shown when:
 * - User is on Professional or Business tier
 * - No module has been selected yet
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import prisma from '@/lib/db';
import { ModuleSelector } from '@/components/onboarding/ModuleSelector';
import { BookOpenIcon } from '@heroicons/react/24/outline';

export const metadata = {
  title: 'Choose Your Industry Module | YaadBooks',
  description: 'Select your industry-specific module to unlock tailored features for your business.',
};

async function getCompanyData(userId: string) {
  // Get user's active company
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeCompanyId: true,
      activeCompany: {
        select: {
          id: true,
          businessName: true,
          subscriptionPlan: true,
          selectedModule: true,
        },
      },
    },
  });

  return user?.activeCompany || null;
}

export default async function ModuleSelectionPage() {
  // Get current user from token
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/login?from=/admin/module-selection');
  }

  let userId: string;
  try {
    const payload = await verifyAccessToken(accessToken);
    userId = payload.sub;
  } catch {
    redirect('/login?from=/admin/module-selection');
  }

  // Get company data
  const company = await getCompanyData(userId);

  if (!company) {
    redirect('/dashboard');
  }

  const tier = (company.subscriptionPlan || 'FREE').toLowerCase();

  // Redirect if not eligible for modules
  if (!['professional', 'business', 'enterprise'].includes(tier)) {
    redirect('/dashboard');
  }

  // Redirect if module already selected
  if (company.selectedModule) {
    redirect('/dashboard');
  }

  // Enterprise tier doesn't need selection
  if (tier === 'enterprise') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <BookOpenIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">YaadBooks</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{company.businessName}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Professional Tier Activated
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Industry Module
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your subscription includes one industry-specific module with specialized features
            tailored for your business type. Select the one that fits best.
          </p>
        </div>

        {/* Module Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <ModuleSelector />
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Not sure which to choose?{' '}
            <a
              href="/contact"
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Contact our team
            </a>{' '}
            for guidance.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Need access to multiple modules?{' '}
            <a
              href="/billing/plans"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Upgrade to Enterprise
            </a>{' '}
            for all modules.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} YaadBooks. Built for Jamaican businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}
