'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import {
  ClockIcon,
  ArrowPathIcon,
  XMarkIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export interface PendingInvitation {
  id: string;
  invitedEmail: string;
  invitedAt: Date | string;
  invitationExpiresAt: Date | string | null;
  company: {
    id: string;
    businessName: string;
    email: string | null;
    industry: string | null;
  };
}

interface PendingInvitationsPanelProps {
  invitations: PendingInvitation[];
  onResend: (invitationId: string) => Promise<void>;
  onCancel: (invitationId: string) => Promise<void>;
  isLoading?: boolean;
}

export function PendingInvitationsPanel({
  invitations,
  onResend,
  onCancel,
  isLoading = false,
}: PendingInvitationsPanelProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (invitations.length === 0 && !isLoading) {
    return null; // Don't show empty panel
  }

  const handleResend = async (id: string) => {
    setResendingId(id);
    setSuccessMessage(null);
    try {
      await onResend(id);
      setSuccessMessage('Invitation resent successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      // Error handling done in parent
    } finally {
      setResendingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await onCancel(id);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-JM', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiresAt: Date | string | null): number | null => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isExpired = (expiresAt: Date | string | null): boolean => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClockIcon className="w-4 h-4 text-amber-600" />
            </div>
            <CardTitle className="text-base">
              Pending Invitations
              <Badge variant="warning" className="ml-2">{invitations.length}</Badge>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircleIcon className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => {
              const daysLeft = getDaysUntilExpiry(invitation.invitationExpiresAt);
              const expired = isExpired(invitation.invitationExpiresAt);

              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Business Icon */}
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-semibold text-sm">
                        {invitation.company.businessName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {invitation.company.businessName}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <EnvelopeIcon className="w-3.5 h-3.5" />
                        <span className="truncate">{invitation.invitedEmail}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Sent {formatDate(invitation.invitedAt)}</span>
                        {expired ? (
                          <span className="text-red-500 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            Expired
                          </span>
                        ) : daysLeft !== null && daysLeft <= 3 ? (
                          <span className="text-amber-600">
                            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </span>
                        ) : daysLeft !== null ? (
                          <span>Expires in {daysLeft} days</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend(invitation.id)}
                      loading={resendingId === invitation.id}
                      disabled={cancellingId === invitation.id}
                      icon={<ArrowPathIcon className="w-4 h-4" />}
                    >
                      {expired ? 'Resend' : 'Resend'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(invitation.id)}
                      loading={cancellingId === invitation.id}
                      disabled={resendingId === invitation.id}
                      icon={<XMarkIcon className="w-4 h-4" />}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
