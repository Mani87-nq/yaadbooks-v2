'use client';

// Force dynamic rendering to avoid static generation issues with auth
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, ModalBody, ModalFooter } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { formatJMD } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import type { GLAccount } from '@/types/generalLedger';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset', color: 'blue' },
  { value: 'liability', label: 'Liability', color: 'red' },
  { value: 'equity', label: 'Equity', color: 'purple' },
  { value: 'revenue', label: 'Revenue', color: 'green' },
  { value: 'expense', label: 'Expense', color: 'orange' },
];

const SUB_TYPES: Record<string, string[]> = {
  asset: ['Current Asset', 'Fixed Asset', 'Other Asset', 'Bank', 'Accounts Receivable'],
  liability: ['Current Liability', 'Long-term Liability', 'Accounts Payable', 'Credit Card'],
  equity: ['Owner Equity', 'Retained Earnings', 'Common Stock'],
  income: ['Sales Revenue', 'Service Revenue', 'Other Income', 'Interest Income'],
  expense: ['Cost of Goods Sold', 'Operating Expense', 'Payroll Expense', 'Other Expense'],
};

export default function ChartOfAccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GLAccount | null>(null);

  const { glAccounts, addGLAccount, updateGLAccount, deleteGLAccount } = useAppStore();

  const [formData, setFormData] = useState({
    accountNumber: '',
    name: '',
    type: 'asset' as GLAccount['type'],
    subType: '',
    description: '',
    parentAccountId: '',
    isActive: true,
  });

  const filteredAccounts = glAccounts.filter((account) => {
    const matchesSearch = !searchQuery ||
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.accountNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || account.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Group accounts by type
  const groupedAccounts = ACCOUNT_TYPES.map(type => ({
    ...type,
    accounts: filteredAccounts.filter(a => a.type === type.value),
    total: filteredAccounts
      .filter(a => a.type === type.value)
      .reduce((sum, a) => sum + (a.balance || 0), 0),
  }));

  const handleOpenModal = (account?: GLAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        accountNumber: account.accountNumber,
        name: account.name,
        type: account.type,
        subType: account.subType || '',
        description: account.description || '',
        parentAccountId: account.parentAccountId || '',
        isActive: account.isActive,
      });
    } else {
      setEditingAccount(null);
      const nextNumber = (glAccounts.length + 1).toString().padStart(4, '0');
      setFormData({
        accountNumber: nextNumber,
        name: '',
        type: 'asset',
        subType: '',
        description: '',
        parentAccountId: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.accountNumber.trim()) {
      alert('Please enter an account number');
      return;
    }
    if (!formData.name.trim()) {
      alert('Please enter an account name');
      return;
    }

    const accountData = {
      accountNumber: formData.accountNumber,
      name: formData.name,
      type: formData.type,
      subType: formData.subType || undefined,
      description: formData.description || undefined,
      parentAccountId: formData.parentAccountId || undefined,
      isActive: formData.isActive,
      updatedAt: new Date(),
    };

    if (editingAccount) {
      updateGLAccount(editingAccount.id, accountData);
    } else {
      addGLAccount({
        id: uuidv4(),
        ...accountData,
        balance: 0,
        createdAt: new Date(),
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const account = glAccounts.find(a => a.id === id);
    if (account?.balance !== 0) {
      alert('Cannot delete an account with a balance');
      return;
    }
    if (confirm('Are you sure you want to delete this account?')) {
      deleteGLAccount(id);
    }
  };

  const getTypeColor = (type: string) => {
    const typeInfo = ACCOUNT_TYPES.find(t => t.value === type);
    switch (typeInfo?.color) {
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'red': return 'bg-red-100 text-red-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      case 'green': return 'bg-green-100 text-green-800';
      case 'orange': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-500">Manage your general ledger accounts</p>
        </div>
        <div className="flex gap-2">
          <Link href="/accounting/journal">
            <Button variant="outline">Journal Entries</Button>
          </Link>
          <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => handleOpenModal()}>
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {ACCOUNT_TYPES.map((type) => {
          const typeAccounts = glAccounts.filter(a => a.type === type.value);
          const total = typeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
          return (
            <Card key={type.value}>
              <div className="p-4">
                <p className="text-sm text-gray-500">{type.label}</p>
                <p className="text-xl font-bold text-gray-900">{typeAccounts.length}</p>
                <p className="text-sm text-gray-500">{formatJMD(total)}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ value: 'all', label: 'All' }, ...ACCOUNT_TYPES].map((type) => (
            <button
              key={type.value}
              onClick={() => setTypeFilter(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                typeFilter === type.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts by Type */}
      {groupedAccounts.map((group) => (
        group.accounts.length > 0 && (
          <Card key={group.value} padding="none">
            <CardHeader className="bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-5 h-5 text-gray-500" />
                  <CardTitle>{group.label}</CardTitle>
                  <Badge variant="default">{group.accounts.length}</Badge>
                </div>
                <span className="font-medium">{formatJMD(group.total)}</span>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Sub-Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-gray-600">
                      {account.accountNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{account.name}</p>
                        {account.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {account.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {account.subType || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatJMD(account.balance || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? 'success' : 'default'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(account)}>
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)}>
                          <TrashIcon className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ))}

      {filteredAccounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No accounts found</p>
            <Button onClick={() => handleOpenModal()}>Add your first account</Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        size="lg"
      >
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Account Number *"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="e.g., 1000"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    type: e.target.value as GLAccount['type'],
                    subType: ''
                  })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              label="Account Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Cash on Hand"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Type</label>
                <select
                  value={formData.subType}
                  onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select sub-type</option>
                  {SUB_TYPES[formData.type]?.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
                <select
                  value={formData.parentAccountId}
                  onChange={(e) => setFormData({ ...formData, parentAccountId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">None (Top-level)</option>
                  {glAccounts
                    .filter(a => a.type === formData.type && a.id !== editingAccount?.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountNumber} - {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm resize-none"
                rows={2}
                placeholder="Optional description for this account"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editingAccount ? 'Update' : 'Create'}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
