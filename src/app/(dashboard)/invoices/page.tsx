'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, Button, Input, StatusBadge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, ModalBody, ModalFooter, Textarea } from '@/components/ui';
import { useInvoices, useUpdateInvoice, useCustomers } from '@/hooks/api';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import type { Invoice } from '@/types';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PermissionGate } from '@/components/PermissionGate';

export default function InvoicesPage() {
  const { fc } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // API hooks — pass search to server for scalable filtering
  const { data: invoicesResponse, isLoading } = useInvoices({
    search: searchQuery || undefined,
    limit: 200,
  });
  const { data: customersResponse } = useCustomers({ limit: 200 });
  const updateInvoiceMutation = useUpdateInvoice();
  const invoices: Invoice[] = (invoicesResponse as any)?.data ?? [];
  const customers: any[] = (customersResponse as any)?.data ?? [];

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = !searchQuery ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['all', 'draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'];

  const stats = {
    total: invoices.length,
    outstanding: invoices.filter(i => !['paid', 'cancelled'].includes(i.status.toLowerCase())).reduce((sum, i) => sum + Number(i.balance || 0), 0),
    overdue: invoices.filter(i => i.status.toLowerCase() === 'overdue').length,
    paidThisMonth: invoices.filter(i => {
      const paidDate = i.paidDate ? new Date(i.paidDate) : null;
      const now = new Date();
      return paidDate && paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    }).reduce((sum, i) => sum + Number(i.total || 0), 0),
  };

  const handleOpenEmailModal = (invoice: Invoice) => {
    const customer = invoice.customer || customers.find((c) => c.id === invoice.customerId);
    setSelectedInvoice(invoice);
    setEmailTo(customer?.email || '');
    setEmailSubject(`Invoice ${invoice.invoiceNumber} from YaadBooks`);
    setEmailMessage(`Dear ${customer?.name || 'Valued Customer'},

Please find attached invoice ${invoice.invoiceNumber} for ${fc(invoice.total)}.

Payment is due by ${format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}.

Thank you for your business!

Best regards,
YaadBooks`);
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!emailTo || !selectedInvoice) {
      alert('Please enter an email address');
      return;
    }

    setEmailSending(true);
    try {
      await api.post(`/api/v1/invoices/${selectedInvoice.id}/send`, {
        to: emailTo,
        subject: emailSubject,
        message: emailMessage,
      });

      setShowEmailModal(false);
      setSelectedInvoice(null);
      alert(`Invoice sent to ${emailTo}`);
    } catch (err: any) {
      alert(err.message || 'Failed to send invoice');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your sales invoices</p>
        </div>
        <PermissionGate permission="invoices:create">
          <Link href="/invoices/new">
            <Button icon={<PlusIcon className="w-4 h-4" />}>
              New Invoice
            </Button>
          </Link>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
            <p className="text-2xl font-bold text-orange-600">{fc(stats.outstanding)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Paid This Month</p>
            <p className="text-2xl font-bold text-emerald-600">{fc(stats.paidThisMonth)}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
            rightIcon={searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            ) : undefined}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="mb-4">No invoices found</p>
                  <Link href="/invoices/new">
                    <Button>Create your first invoice</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    {invoice.customer?.name || customers.find(c => c.id === invoice.customerId)?.name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="font-medium">{fc(invoice.total)}</TableCell>
                  <TableCell className={invoice.balance > 0 ? 'text-orange-600 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                    {fc(invoice.balance)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="ghost" size="sm" aria-label="View invoice">
                          <EyeIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </Link>
                      <PermissionGate permission="invoices:update">
                        <Link href={`/invoices/${invoice.id}/edit`}>
                          <Button variant="ghost" size="sm" aria-label="Edit invoice">
                            <PencilIcon className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </Link>
                      </PermissionGate>
                      <PermissionGate permission="invoices:update">
                        <Button variant="ghost" size="sm" aria-label="Send invoice by email" onClick={() => handleOpenEmailModal(invoice)}>
                          <EnvelopeIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Email Modal */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="Send Invoice" size="lg">
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="To"
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="customer@email.com"
            />
            <Input
              label="Subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={8}
              />
            </div>
            {selectedInvoice && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Attachment:</strong> Invoice {selectedInvoice.invoiceNumber} (PDF)
                </p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEmailModal(false)}>Cancel</Button>
          <Button onClick={handleSendEmail} disabled={emailSending}>
            {emailSending ? (
              <>Sending...</>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                Send Invoice
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
