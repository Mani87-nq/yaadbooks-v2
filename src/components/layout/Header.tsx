'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import api, { setAccessToken } from '@/lib/api-client';
import {
  Bars3Icon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { NotificationBell } from './NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import { useTheme } from 'next-themes';

export function Header() {
  const router = useRouter();
  // ── Atomic Zustand selectors ────────────────────────────────────
  // CRITICAL: useAppStore() without a selector subscribes to the ENTIRE
  // store — every data-hydration change re-renders the Header.  Use
  // individual selectors so we only re-render when the value we need
  // actually changes.
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const user = useAppStore((s) => s.user);
  const activeCompany = useAppStore((s) => s.activeCompany);
  const companies = useAppStore((s) => s.companies);
  const switchCompany = useAppStore((s) => s.switchCompany);
  const clearCompanyData = useAppStore((s) => s.clearCompanyData);
  const settings = useAppStore((s) => s.settings);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [switchingCompany, setSwitchingCompany] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === activeCompany?.id || switchingCompany) return;
    setSwitchingCompany(true);
    setShowCompanyDropdown(false);
    try {
      const res = await api.patch<{ accessToken: string; companyId: string }>(
        '/api/v1/user/active-company',
        { companyId }
      );

      // Update the in-memory access token so subsequent requests use the new one
      setAccessToken(res.accessToken);

      // Update local store state immediately (for optimistic UI)
      switchCompany(companyId);
      clearCompanyData();

      // Full page reload to re-hydrate all company-scoped data with new JWT
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed to switch company:', error);
      setSwitchingCompany(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Continue to redirect even if API call fails
    } finally {
      // ALWAYS clear token and redirect — don't leave user stuck on dashboard
      // Even if logout API fails, clear local state and send to login
      setAccessToken(null);
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden -ml-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open navigation menu"
        >
          <Bars3Icon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Company Switcher */}
        {companies.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <BuildingOfficeIcon className="h-5 w-5 text-emerald-600" />
              <span className="hidden sm:block text-sm font-medium text-gray-900 dark:text-white max-w-[150px] truncate">
                {activeCompany?.tradingName || activeCompany?.businessName}
              </span>
              <ChevronDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>

            {showCompanyDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCompanyDropdown(false)}
                />
                <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    Switch Company
                  </div>
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      disabled={switchingCompany}
                      onClick={() => handleSwitchCompany(company.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">
                          {company.businessName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {company.tradingName || company.businessName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{company.industry}</div>
                      </div>
                      {activeCompany?.id === company.id && (
                        <CheckIcon className="h-5 w-5 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Global Search */}
        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Currency Display — reads from user's display preference, falls back to company currency */}
        <div className="hidden md:flex items-center px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium">
          {settings.currency || activeCompany?.currency || 'JMD'}
        </div>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5 text-yellow-400" />
            ) : (
              <MoonIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="User menu"
            aria-expanded={showUserDropdown}
            aria-haspopup="menu"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-emerald-100 dark:ring-emerald-900/30"
              />
            ) : (
              <UserCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            )}
            <div className="hidden lg:block text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {activeCompany?.businessName}
              </div>
            </div>
            <ChevronDownIcon className="hidden lg:block h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>

          {showUserDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserDropdown(false)}
                onTouchEnd={() => setShowUserDropdown(false)}
              />
              <div 
                className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push('/profile');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 touch-manipulation"
                  >
                    <UserIcon className="h-4 w-4" />
                    Your Profile
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push('/settings');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 touch-manipulation"
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    Settings
                  </button>
                </div>

                {/* Sign Out */}
                <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLogout();
                    }}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 disabled:opacity-50 touch-manipulation"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    {loggingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
