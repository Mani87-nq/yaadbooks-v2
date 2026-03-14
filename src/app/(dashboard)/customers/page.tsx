'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, ModalBody, ModalFooter } from '@/components/ui';
import { useCurrency } from '@/hooks/useCurrency';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/api';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PermissionGate } from '@/components/PermissionGate';

interface CustomerAPI {
  id: string;
  name: string;
  type: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  trnNumber: string | null;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const { fc } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerAPI | null>(null);
  const [saveError, setSaveError] = useState('');

  // API hooks
  const { data: customersResponse, isLoading, error: fetchError, refetch } = useCustomers({
    search: searchQuery || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 200,
  });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const customers: CustomerAPI[] = (customersResponse as any)?.data ?? [];

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    type: 'customer' as 'customer' | 'vendor' | 'both',
    trnNumber: '',
    notes: '',
  });

  const handleOpenModal = (customer?: CustomerAPI) => {
    setSaveError('');
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        companyName: customer.companyName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        type: (customer.type as 'customer' | 'vendor' | 'both') || 'customer',
        trnNumber: customer.trnNumber || '',
        notes: '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        type: 'customer',
        trnNumber: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaveError('');
    if (!formData.name.trim()) {
      setSaveError('Please enter a name');
      return;
    }

    const payload: Record<string, unknown> = {
      name: formData.name,
      companyName: formData.companyName || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      type: formData.type,
      trnNumber: formData.trnNumber || undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, data: payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }
      setShowModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save contact';
      setSaveError(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteCustomer.mutateAsync(id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete contact';
        alert(message);
      }
    }
  };

  const stats = {
    total: customers.length,
    customers: customers.filter(c => c.type === 'customer' || c.type === 'both').length,
    vendors: customers.filter(c => c.type === 'vendor' || c.type === 'both').length,
    withBalance: customers.filter(c => c.balance > 0).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers & Vendors</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your business contacts</p>
        </div>
        <PermissionGate permission="customers:create">
          <div className="flex gap-2">
            <Link href="/customers/new">
              <Button variant="outline" icon={<PlusIcon className="w-4 h-4" />}>
                New Customer
              </Button>
            </Link>
            <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => handleOpenModal()}>
              Quick Add
            </Button>
          </div>
        </PermissionGate>
      </div>

      {/* Error State */}
      {fetchError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-300">Failed to load contacts. {fetchError instanceof Error ? fetchError.message : ''}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Contacts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '-' : stats.total}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Customers</p>
            <p className="text-2xl font-bold text-emerald-600">{isLoading ? '-' : stats.customers}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Vendors</p>
            <p className="text-2xl font-bold text-blue-600">{isLoading ? '-' : stats.vendors}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">With Balance</p>
            <p className="text-2xl font-bold text-orange-600">{isLoading ? '-' : stats.withBalance}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search contacts..."
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
        <div className="flex gap-2">
          {['all', 'customer', 'vendor', 'both'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                typeFilter === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <div className="p-12 text-center">
            <ArrowPathIcon className="w-8 h-8 mx-auto mb-3 text-gray-400 dark:text-gray-500 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400">Loading contacts...</p>
          </div>
        </Card>
      )}

      {/* Table */}
      {!isLoading && (
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>TRN</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="mb-4">No contacts found</p>
                  <PermissionGate permission="customers:create">
                    <Button onClick={() => handleOpenModal()}>Add your first contact</Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link href={`/customers/${customer.id}`} className="block group">
                      <p className="font-medium text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">{customer.name}</p>
                      {customer.companyName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.companyName}</p>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.type === 'customer' ? 'success' : customer.type === 'vendor' ? 'info' : 'default'}>
                      {customer.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <EnvelopeIcon className="w-3 h-3" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <PhoneIcon className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">{customer.trnNumber || '-'}</TableCell>
                  <TableCell className={customer.balance > 0 ? 'text-orange-600 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                    {fc(customer.balance)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link href={`/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm" aria-label="View customer details">
                          <EyeIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </Link>
                      <PermissionGate permission="customers:update">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(customer)} aria-label="Edit customer">
                          <PencilIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="customers:delete">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
                          disabled={deleteCustomer.isPending}
                          aria-label="Delete customer"
                        >
                          <TrashIcon className="w-4 h-4 text-red-500" aria-hidden="true" />
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
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCustomer ? 'Edit Contact' : 'Add Contact'}
        size="lg"
      >
        <ModalBody>
          <div className="space-y-4">
            {saveError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
                {saveError}
              </div>
            )}
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name or business name"
            />
            <Input
              label="Company Name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <Input
                label="TRN (Tax Registration Number)"
                value={formData.trnNumber}
                onChange={(e) => setFormData({ ...formData, trnNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200 resize-none"
                rows={3}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={createCustomer.isPending || updateCustomer.isPending}
          >
            {(createCustomer.isPending || updateCustomer.isPending) ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
