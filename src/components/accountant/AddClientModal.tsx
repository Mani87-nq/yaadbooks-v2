'use client';

import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter, Button, Input, Textarea } from '@/components/ui';
import {
  EnvelopeIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import type { ClientInvite } from '@/types/accountant';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (invite: ClientInvite) => Promise<void>;
  onGenerateLink: () => Promise<string>;
}

type InviteMethod = 'email' | 'link';

export function AddClientModal({
  isOpen,
  onClose,
  onInvite,
  onGenerateLink,
}: AddClientModalProps) {
  const [method, setMethod] = useState<InviteMethod>('email');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setEmail('');
    setBusinessName('');
    setMessage('');
    setInviteLink('');
    setError('');
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSendInvite = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onInvite({
        email: email.trim(),
        businessName: businessName.trim() || undefined,
        message: message.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError('');

    try {
      const link = await onGenerateLink();
      setInviteLink(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Client"
      description="Invite a client to connect their YaadBooks account with yours."
      size="md"
    >
      <ModalBody>
        {/* Method Toggle */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
          <button
            onClick={() => {
              setMethod('email');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              method === 'email'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <EnvelopeIcon className="w-4 h-4" />
            Invite by Email
          </button>
          <button
            onClick={() => {
              setMethod('link');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              method === 'link'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Generate Link
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {method === 'email' ? (
          <div className="space-y-4">
            <Input
              label="Client Email"
              type="email"
              placeholder="client@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<EnvelopeIcon className="w-4 h-4" />}
            />
            <Input
              label="Business Name (optional)"
              placeholder="Their business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <Textarea
              label="Personal Message (optional)"
              placeholder="Add a personal note to your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {!inviteLink ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Generate Invite Link</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Create a unique link to share with your client. They can use it to connect their
                  YaadBooks account with yours.
                </p>
                <Button onClick={handleGenerateLink} loading={loading}>
                  Generate Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <CheckIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm text-gray-600">Link generated! Share it with your client.</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant={copied ? 'primary' : 'outline'}
                    onClick={handleCopyLink}
                    icon={
                      copied ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      )
                    }
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This link expires in 7 days and can only be used once.
                </p>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        {method === 'email' && (
          <Button
            onClick={handleSendInvite}
            loading={loading}
            icon={<UserPlusIcon className="w-4 h-4" />}
          >
            Send Invitation
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
