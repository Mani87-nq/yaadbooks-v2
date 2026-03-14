'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { setAccessToken } from '@/lib/api-client';
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

// Google Icon SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    activeCompanyId: string | null;
  };
  companies: Array<{
    id: string;
    businessName: string;
    role: string;
  }>;
  accessToken: string;
}

interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  tempToken: string;
  userId: string;
}

interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    activeCompanyId: string | null;
  };
  companies: Array<{
    id: string;
    businessName: string;
    role: string;
  }>;
  accessToken: string;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_oauth_not_configured: 'Google Sign-In is not yet configured. Please use email and password.',
  google_oauth_denied: 'Google sign-in was cancelled. Please try again.',
  google_oauth_invalid: 'Invalid Google sign-in response. Please try again.',
  google_oauth_csrf: 'Security verification failed. Please try again.',
  google_oauth_token_failed: 'Failed to complete Google sign-in. Please try again.',
  google_oauth_profile_failed: 'Failed to fetch Google profile. Please try again.',
  google_oauth_no_email: 'No email address found in your Google account.',
  google_oauth_error: 'An error occurred during Google sign-in. Please try again.',
};

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setCompanies, setActiveCompany, setAuthenticated } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Show Google OAuth error from URL params
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) {
      setError(OAUTH_ERROR_MESSAGES[oauthError]);
    }
  }, [searchParams]);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  /** Complete login after receiving full tokens (from initial login or 2FA verify). */
  const completeLogin = (data: LoginResponse | TwoFactorVerifyResponse) => {
    // Store access token in memory (cookie is already set by the server response)
    setAccessToken(data.accessToken);

    // Map API role to app role
    const apiRole = data.companies[0]?.role?.toLowerCase() ?? 'admin';
    const appRole = (apiRole === 'owner' || apiRole === 'admin') ? 'admin'
      : apiRole === 'staff' ? 'staff'
      : 'user';

    // Set user in store
    setUser({
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      activeCompanyId: data.user.activeCompanyId ?? undefined,
      role: appRole as 'admin' | 'user' | 'staff',
      createdAt: new Date().toISOString(),
    });

    setAuthenticated(true);

    // Store companies from login response (partial data -- full hydration
    // happens in useDataHydration when the dashboard mounts)
    const loginCompanies = data.companies.map((c) => ({
      id: c.id,
      businessName: c.businessName,
      tradingName: '',
      trnNumber: '',
      email: data.user.email,
      phone: '',
      address: '',
      parish: '',
      industry: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setCompanies(loginCompanies);

    // Set active company if exists
    if (data.companies.length > 0) {
      const active = data.companies.find(c => c.id === data.user.activeCompanyId) ?? data.companies[0];
      setActiveCompany(loginCompanies.find(c => c.id === active.id) ?? loginCompanies[0]);
    }

    // Redirect to the page the user was trying to access, or dashboard
    const redirectTo = searchParams.get('from') || '/dashboard';
    // Prevent open redirect — only allow relative paths
    const safePath = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard';
    router.push(safePath);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter email and password');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 423) {
          setError('Account locked due to too many failed attempts. Please try again later.');
        } else if (res.status === 429) {
          setError('Too many login attempts. Please wait a moment and try again.');
        } else {
          setError(data.detail ?? 'Invalid email or password');
        }
        return;
      }

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        setRequires2FA(true);
        setTempToken(data.tempToken);
        return;
      }

      // No 2FA — complete login immediately
      completeLogin(data as LoginResponse);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tempToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code: twoFACode, action: 'login' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? 'Invalid 2FA code');
        return;
      }

      completeLogin(data as TwoFactorVerifyResponse);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tempToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code: backupCode, action: 'login' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? 'Invalid backup code');
        return;
      }

      completeLogin(data as TwoFactorVerifyResponse);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetTo2FALogin = () => {
    setRequires2FA(false);
    setTempToken('');
    setTwoFACode('');
    setBackupCode('');
    setUseBackupCode(false);
    setError('');
  };

  // ─── 2FA Verification Form ──────────────────────────────────
  const render2FAForm = () => (
    <div className="w-full max-w-md">
      <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xl">
          YB
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">YaadBooks</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <ShieldCheckIcon className="h-7 w-7 text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {useBackupCode
          ? 'Enter one of your backup codes'
          : 'Enter the 6-digit code from your authenticator app'}
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {useBackupCode ? (
        /* Backup code form */
        <form onSubmit={handleBackupCode} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Backup Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono tracking-wider"
                placeholder="XXXX-XXXX"
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !backupCode.trim()}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify Backup Code'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setUseBackupCode(false); setError(''); setBackupCode(''); }}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Use authenticator code
            </button>
            <button
              type="button"
              onClick={resetTo2FALogin}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Back to login
            </button>
          </div>
        </form>
      ) : (
        /* TOTP code form */
        <form onSubmit={handleVerify2FA} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Authentication Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ShieldCheckIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={twoFACode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTwoFACode(val);
                }}
                pattern="[0-9]{6}"
                inputMode="numeric"
                maxLength={6}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center font-mono text-2xl tracking-[0.5em]"
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || twoFACode.length !== 6}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setUseBackupCode(true); setError(''); setTwoFACode(''); }}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Use backup code
            </button>
            <button
              type="button"
              onClick={resetTo2FALogin}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Back to login
            </button>
          </div>
        </form>
      )}
    </div>
  );

  // ─── Login Form ─────────────────────────────────────────────
  const renderLoginForm = () => (
    <div className="w-full max-w-md">
      <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xl">
          YB
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">YaadBooks</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in to your account to continue</p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 dark:bg-gray-800" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Google Sign In */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.href = '/api/auth/oauth/google'}
          disabled={isLoading}
          className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors disabled:opacity-50"
        >
          <GoogleIcon className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
          Sign up for free
        </Link>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-emerald-800 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-600 font-bold text-xl">
              YB
            </div>
            <span className="text-2xl font-bold text-white">YaadBooks</span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Run your business<br />with confidence
          </h1>
          <p className="text-emerald-100 text-lg">
            Jamaica&apos;s complete business management solution. Invoicing, POS, inventory, payroll, and more - all in one place.
          </p>
        </div>

        <div className="text-emerald-200 text-sm">
          Made with love in Jamaica
        </div>
      </div>

      {/* Right Panel - Login or 2FA Form */}
      <div className="flex-1 flex items-center justify-center p-8 dark:bg-gray-900">
        {requires2FA ? render2FAForm() : renderLoginForm()}
      </div>
    </div>
  );
}
