'use client';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/components/ui';
import { ClientCard, ClientCardCompact, AlertsPanel, AddClientModal, PendingInvitationsPanel } from '@/components/accountant';
import {
  useAccountantStore,
  useFilteredClients,
  useAccountantStats,
  useAllAlerts,
  usePendingInvitations,
  useAccountantError,
} from '@/store/accountantStore';
import { formatJMD } from '@/lib/utils';
import {
  UserGroupIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

// Stats Card Component
function StatsCard({
  title,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

// Pending Invitations Section (uses store hooks)
function PendingInvitationsSection() {
  const pendingInvitations = usePendingInvitations();
  const { resendInvitation, cancelInvitation, isLoading } = useAccountantStore();

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <PendingInvitationsPanel
      invitations={pendingInvitations}
      onResend={resendInvitation}
      onCancel={cancelInvitation}
      isLoading={isLoading}
    />
  );
}

export default function AccountantDashboardPage() {
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    isLoading,
    refreshClients,
    inviteClient,
    generateInviteLink,
    switchToClient,
  } = useAccountantStore();

  const clients = useFilteredClients();
  const stats = useAccountantStats();
  const allAlerts = useAllAlerts();
  const error = useAccountantError();
  const clearError = useAccountantStore((state) => state.clearError);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Initial load
  useEffect(() => {
    refreshClients();
  }, []);

  const sortOptions = [
    { value: 'activity', label: 'Recent Activity' },
    { value: 'name', label: 'Business Name' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'alerts', label: 'Alert Count' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-700">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Unable to load live data</p>
              <p className="text-sm text-red-600">{error} — Showing demo data instead</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h1>
          <p className="text-gray-500">
            Managing {stats.totalClients} {stats.totalClients === 1 ? 'client' : 'clients'}
            {stats.activeClients < stats.totalClients && (
              <span className="text-yellow-600">
                {' '}
                ({stats.totalClients - stats.activeClients} pending)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => refreshClients()}
            loading={isLoading}
            icon={<ArrowPathIcon className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            icon={<PlusIcon className="w-4 h-4" />}
          >
            Add Client
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Clients"
          value={stats.totalClients}
          subValue={`${stats.activeClients} active`}
          icon={UserGroupIcon}
          color="bg-blue-600"
        />
        <StatsCard
          title="Combined Revenue"
          value={formatJMD(stats.totalRevenue)}
          subValue="This month"
          icon={BanknotesIcon}
          color="bg-emerald-600"
        />
        <StatsCard
          title="Active Alerts"
          value={stats.totalAlerts}
          subValue={`${stats.criticalAlerts} critical`}
          icon={ExclamationTriangleIcon}
          color={stats.criticalAlerts > 0 ? 'bg-red-600' : 'bg-yellow-500'}
        />
        <StatsCard
          title="Clients with Issues"
          value={stats.clientsWithIssues}
          subValue="Need attention"
          icon={ExclamationTriangleIcon}
          color="bg-orange-500"
        />
      </div>

      {/* Pending Invitations Panel */}
      <PendingInvitationsSection />

      {/* Alerts Panel */}
      {allAlerts.length > 0 && (
        <AlertsPanel
          alerts={allAlerts}
          maxVisible={5}
          showClientName={true}
          onAlertClick={(alert) => {
            // Navigate to the client's specific issue
            switchToClient(alert.clientId);
          }}
        />
      )}

      {/* Clients Section */}
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowSortMenu(!showSortMenu)}
                icon={<FunnelIcon className="w-4 h-4" />}
              >
                {sortOptions.find((o) => o.value === sortBy)?.label || 'Sort'}
                <ChevronDownIcon className="w-4 h-4 ml-1" />
              </Button>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          sortBy === option.value
                            ? 'text-emerald-600 bg-emerald-50'
                            : 'text-gray-700'
                        }`}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortMenu(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                className={`p-2.5 ${
                  viewMode === 'grid'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                className={`p-2.5 border-l border-gray-200 ${
                  viewMode === 'list'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clients Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No clients found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Get started by adding your first client'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)} icon={<PlusIcon className="w-4 h-4" />}>
                  Add Client
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onEnterBooks={switchToClient}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => (
                <ClientCardCompact
                  key={client.id}
                  client={client}
                  onEnterBooks={switchToClient}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onInvite={async (invite) => {
          await inviteClient(invite);
          await refreshClients();
        }}
        onGenerateLink={generateInviteLink}
      />
    </div>
  );
}
