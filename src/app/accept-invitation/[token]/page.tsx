'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface InvitationData {
  accountantName: string;
  accountantEmail: string;
  companyName: string;
  permissions: {
    canAccessPayroll: boolean;
    canAccessBanking: boolean;
    canExportData: boolean;
  };
}

type InvitationStatus =
  | 'loading'
  | 'valid'
  | 'expired'
  | 'already_accepted'
  | 'invalid'
  | 'accepting'
  | 'accepted'
  | 'error';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string>('');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    validateToken();
  }, [token]);

  async function validateToken() {
    try {
      const response = await fetch(`/api/v1/accountant/accept-invitation/${token}`);
      const data = await response.json();

      if (!response.ok) {
        switch (data.errorCode) {
          case 'EXPIRED':
            setStatus('expired');
            break;
          case 'ALREADY_ACCEPTED':
            setStatus('already_accepted');
            break;
          default:
            setStatus('invalid');
        }
        setError(data.error || 'Invalid invitation');
        return;
      }

      setInvitation(data.data);
      setStatus('valid');
    } catch (err) {
      setStatus('error');
      setError('Failed to validate invitation');
    }
  }

  async function handleAccept() {
    setStatus('accepting');
    try {
      const response = await fetch(`/api/v1/accountant/accept-invitation/${token}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setStatus('accepted');
    } catch (err) {
      setStatus('error');
      setError('Failed to accept invitation');
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Validating Invitation...</h1>
          <p className="text-gray-500 mt-2">Please wait while we verify your invitation.</p>
        </div>
      </div>
    );
  }

  // Error states
  if (status === 'invalid' || status === 'expired' || status === 'already_accepted') {
    const errorConfig = {
      invalid: {
        icon: XCircleIcon,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-100',
        title: 'Invalid Invitation',
        message: 'This invitation link is not valid. It may have been cancelled or the link is incorrect.',
      },
      expired: {
        icon: ClockIcon,
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-100',
        title: 'Invitation Expired',
        message: 'This invitation has expired. Please ask your accountant to send a new invitation.',
      },
      already_accepted: {
        icon: CheckCircleIcon,
        iconColor: 'text-emerald-500',
        bgColor: 'bg-emerald-100',
        title: 'Already Connected',
        message: 'This invitation has already been accepted. Your accountant already has access to your books.',
      },
    };

    const config = errorConfig[status];
    const Icon = config.icon;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-6`}>
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h1>
          <p className="text-gray-600 mb-8">{config.message}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Go to Login
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Generic error
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => validateToken()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'accepted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Connected!</h1>
          <p className="text-gray-600 mb-2">
            <strong>{invitation?.accountantName}</strong> now has access to your YaadBooks account.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            You can manage their access anytime from your settings.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Go to Dashboard
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Valid invitation - show acceptance form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <ShieldCheckIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accountant Invitation</h1>
          <p className="text-gray-600">
            <strong>{invitation?.accountantName}</strong> wants to help manage your books
          </p>
        </div>

        {/* Accountant Info Card */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {invitation?.accountantName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{invitation?.accountantName}</h3>
              <p className="text-gray-500 text-sm">{invitation?.accountantEmail}</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">For business:</h4>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="font-semibold text-blue-900">{invitation?.companyName}</p>
          </div>
        </div>

        {/* Permissions */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Access they'll have:</h4>
          <div className="space-y-2">
            <PermissionItem
              label="View financial data & reports"
              enabled={true}
            />
            <PermissionItem
              label="Access payroll information"
              enabled={invitation?.permissions.canAccessPayroll ?? true}
            />
            <PermissionItem
              label="Access banking & reconciliation"
              enabled={invitation?.permissions.canAccessBanking ?? true}
            />
            <PermissionItem
              label="Export data"
              enabled={invitation?.permissions.canExportData ?? true}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={status === 'accepting'}
            className="w-full py-3 px-6 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'accepting' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Accepting...
              </>
            ) : (
              <>
                Accept Invitation
                <CheckCircleIcon className="w-5 h-5" />
              </>
            )}
          </button>
          <Link
            href="/login"
            className="block w-full py-3 px-6 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors text-center"
          >
            Decline
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-500 text-center mt-6">
          You can revoke this access at any time from your account settings.
        </p>
      </div>
    </div>
  );
}

function PermissionItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
        enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {enabled ? (
          <CheckCircleIcon className="w-4 h-4" />
        ) : (
          <XCircleIcon className="w-4 h-4" />
        )}
      </div>
      <span className={enabled ? 'text-gray-700' : 'text-gray-400 line-through'}>{label}</span>
    </div>
  );
}
