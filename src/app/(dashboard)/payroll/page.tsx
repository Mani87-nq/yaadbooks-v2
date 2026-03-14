'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, ModalBody, ModalFooter } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '@/hooks/api';
import { api } from '@/lib/api-client';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PermissionGate } from '@/components/PermissionGate';

interface EmployeeAPI {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string;
  department: string | null;
  employmentType: string;
  paymentFrequency: string;
  baseSalary: number;
  bankAccountNumber?: string;
  bankName?: string;
  trnNumber: string;
  nisNumber: string;
  hireDate: string;
  isActive: boolean;
  createdAt: string;
}

interface PayrollRunAPI {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: string;
  entries: { id: string }[];
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerContributions: number;
  createdAt: string;
}

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
];

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// Server handles all tax calculations — no client-side deduction constants needed

export default function PayrollPage() {
  const { fc } = useCurrency();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeAPI | null>(null);
  const [saveError, setSaveError] = useState('');
  const [payrollRunning, setPayrollRunning] = useState(false);

  // API hooks for employees
  const { data: employeesResponse, isLoading: employeesLoading, error: employeesFetchError, refetch: refetchEmployees } = useEmployees({ limit: 200 });
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const employees: EmployeeAPI[] = (employeesResponse as any)?.data ?? [];

  // Payroll runs — fetch via direct API call
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunAPI[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [approvingRunId, setApprovingRunId] = useState<string | null>(null);
  const [emailingRunId, setEmailingRunId] = useState<string | null>(null);

  // Fetch payroll runs when switching to that tab
  const fetchPayrollRuns = async () => {
    try {
      setPayrollLoading(true);
      const data = await api.get<{ data: PayrollRunAPI[] } | PayrollRunAPI[]>('/api/v1/payroll');
      const list = Array.isArray(data) ? data : (data as any).data ?? [];
      setPayrollRuns(list);
    } catch {
      // Payroll runs may not have a list endpoint yet — show empty
      setPayrollRuns([]);
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleTabChange = (tab: 'employees' | 'payroll') => {
    setActiveTab(tab);
    if (tab === 'payroll' && payrollRuns.length === 0) {
      fetchPayrollRuns();
    }
  };

  const handleApproveRun = async (runId: string) => {
    if (!confirm('Are you sure you want to approve this payroll run? This will post it to the General Ledger.')) return;
    setApprovingRunId(runId);
    try {
      await api.post(`/api/v1/payroll/${runId}/approve`);
      await fetchPayrollRuns();
      alert('Payroll run approved successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve payroll run';
      alert(message);
    } finally {
      setApprovingRunId(null);
    }
  };

  const handleEmailPayslips = async (runId: string) => {
    if (!confirm('Send payslip emails to all employees in this run?')) return;
    setEmailingRunId(runId);
    try {
      const result = await api.post<{ sent: number; failed: number; errors?: string[] }>(
        `/api/v1/payroll/${runId}/payslips`,
      );
      const data = result as any;
      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      alert(`Payslips emailed: ${sent} sent, ${failed} failed`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to email payslips';
      alert(message);
    } finally {
      setEmailingRunId(null);
    }
  };

  // Client-side search filter
  const filteredEmployees = employees.filter((emp) => {
    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(lowerQuery) ||
      emp.email?.toLowerCase().includes(lowerQuery) ||
      emp.department?.toLowerCase().includes(lowerQuery) ||
      emp.position?.toLowerCase().includes(lowerQuery) ||
      emp.employeeNumber?.toLowerCase().includes(lowerQuery) ||
      emp.phone?.toLowerCase().includes(lowerQuery);
    return matchesSearch;
  });

  const [employeeForm, setEmployeeForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    employmentType: 'full_time',
    paymentFrequency: 'monthly',
    baseSalary: '',
    bankAccountNumber: '',
    bankName: '',
    trnNumber: '',
    nisNumber: '',
    dateOfBirth: '',
    hireDate: new Date().toISOString().split('T')[0],
  });

  interface PayrollEmployeeOverride {
    overtime: string;
    bonus: string;
    commission: string;
    allowances: string;
  }

  const [payrollForm, setPayrollForm] = useState({
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    selectedEmployees: [] as string[],
    overrides: {} as Record<string, PayrollEmployeeOverride>,
  });

  const handleOpenEmployeeModal = (employee?: EmployeeAPI) => {
    setSaveError('');
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        position: employee.position || '',
        employmentType: employee.employmentType || 'full_time',
        paymentFrequency: employee.paymentFrequency || 'monthly',
        baseSalary: employee.baseSalary?.toString() || '',
        bankAccountNumber: employee.bankAccountNumber || '',
        bankName: employee.bankName || '',
        trnNumber: employee.trnNumber || '',
        nisNumber: employee.nisNumber || '',
        dateOfBirth: (employee as any).dateOfBirth ? new Date((employee as any).dateOfBirth).toISOString().split('T')[0] : '',
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        employmentType: 'full_time',
        paymentFrequency: 'monthly',
        baseSalary: '',
        bankAccountNumber: '',
        bankName: '',
        trnNumber: '',
        nisNumber: '',
        dateOfBirth: '',
        hireDate: new Date().toISOString().split('T')[0],
      });
    }
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async () => {
    setSaveError('');
    if (!employeeForm.firstName.trim() || !employeeForm.lastName.trim()) {
      setSaveError('Please enter employee name');
      return;
    }

    const payload: Record<string, unknown> = {
      firstName: employeeForm.firstName,
      lastName: employeeForm.lastName,
      email: employeeForm.email || undefined,
      phone: employeeForm.phone || undefined,
      department: employeeForm.department || undefined,
      position: employeeForm.position || 'Employee',
      employmentType: employeeForm.employmentType,
      paymentFrequency: employeeForm.paymentFrequency,
      baseSalary: employeeForm.baseSalary ? parseFloat(employeeForm.baseSalary) : 0,
      bankAccountNumber: employeeForm.bankAccountNumber || undefined,
      bankName: employeeForm.bankName || undefined,
      trnNumber: employeeForm.trnNumber || '',
      nisNumber: employeeForm.nisNumber || '',
      dateOfBirth: employeeForm.dateOfBirth || undefined,
      hireDate: employeeForm.hireDate || undefined,
      isActive: true,
    };

    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({ id: editingEmployee.id, data: payload });
      } else {
        await createEmployee.mutateAsync(payload);
      }
      setShowEmployeeModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save employee';
      setSaveError(message);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee.mutateAsync(id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete employee';
        alert(message);
      }
    }
  };

  const handleOpenPayrollModal = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const activeEmps = employees.filter(e => e.isActive);
    const defaultOverrides: Record<string, PayrollEmployeeOverride> = {};
    activeEmps.forEach(e => {
      defaultOverrides[e.id] = { overtime: '0', bonus: '0', commission: '0', allowances: '0' };
    });
    setPayrollForm({
      payPeriodStart: firstDay.toISOString().split('T')[0],
      payPeriodEnd: lastDay.toISOString().split('T')[0],
      payDate: today.toISOString().split('T')[0],
      selectedEmployees: activeEmps.map(e => e.id),
      overrides: defaultOverrides,
    });
    setShowPayrollModal(true);
  };

  const handleRunPayroll = async () => {
    if (!payrollForm.payPeriodStart || !payrollForm.payPeriodEnd || !payrollForm.payDate) {
      alert('Please fill in all pay period fields');
      return;
    }
    if (payrollForm.selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    setPayrollRunning(true);
    try {
      // Build payroll employee data for the API (server calculates all deductions)
      const selectedEmps = employees.filter(e => payrollForm.selectedEmployees.includes(e.id));
      const employeeEntries = selectedEmps.map(emp => {
        const ov = payrollForm.overrides[emp.id] ?? { overtime: '0', bonus: '0', commission: '0', allowances: '0' };
        return {
          employeeId: emp.id,
          basicSalary: Number(emp.baseSalary || 0),
          overtime: parseFloat(ov.overtime) || 0,
          bonus: parseFloat(ov.bonus) || 0,
          commission: parseFloat(ov.commission) || 0,
          allowances: parseFloat(ov.allowances) || 0,
          pensionContribution: 0,
          otherDeductions: 0,
        };
      });

      await api.post('/api/v1/payroll', {
        periodStart: payrollForm.payPeriodStart,
        periodEnd: payrollForm.payPeriodEnd,
        payDate: payrollForm.payDate,
        employees: employeeEntries,
      });

      setShowPayrollModal(false);
      fetchPayrollRuns();
      alert('Payroll run created successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process payroll';
      alert(message);
    } finally {
      setPayrollRunning(false);
    }
  };

  // Stats
  const activeEmployees = employees.filter(e => e.isActive);
  const totalMonthlyPayroll = activeEmployees.reduce((sum, e) => sum + Number(e.baseSalary || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage employees and process payroll</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'employees' ? (
            <PermissionGate permission="payroll:create">
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => handleOpenEmployeeModal()}>
                Add Employee
              </Button>
            </PermissionGate>
          ) : (
            <PermissionGate permission="payroll:create">
              <Button icon={<PlayIcon className="w-4 h-4" />} onClick={handleOpenPayrollModal}>
                Run Payroll
              </Button>
            </PermissionGate>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleTabChange('employees')}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
            activeTab === 'employees'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <UserGroupIcon className="w-4 h-4 inline mr-2" />
          Employees
        </button>
        <button
          onClick={() => handleTabChange('payroll')}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
            activeTab === 'payroll'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BanknotesIcon className="w-4 h-4 inline mr-2" />
          Payroll Runs
        </button>
      </div>

      {/* Error State */}
      {employeesFetchError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-400">Failed to load employees. {employeesFetchError instanceof Error ? employeesFetchError.message : ''}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchEmployees()}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Employees</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{employeesLoading ? '-' : employees.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{employeesLoading ? '-' : activeEmployees.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Payroll</p>
            <p className="text-2xl font-bold text-blue-600">{employeesLoading ? '-' : fc(totalMonthlyPayroll)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Payroll Runs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{payrollRuns.length}</p>
          </div>
        </Card>
      </div>

      {/* Content */}
      {activeTab === 'employees' ? (
        <>
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search employees..."
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

          {/* Loading State */}
          {employeesLoading && (
            <Card>
              <div className="p-12 text-center">
                <ArrowPathIcon className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                <p className="text-gray-500 dark:text-gray-400">Loading employees...</p>
              </div>
            </Card>
          )}

          {/* Employee Table */}
          {!employeesLoading && (
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p className="mb-4">No employees found</p>
                      <Button onClick={() => handleOpenEmployeeModal()}>Add your first employee</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {employee.firstName} {employee.lastName}
                          </p>
                          {employee.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{employee.department || '-'}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{employee.position || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {employee.employmentType?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.baseSalary ? fc(employee.baseSalary) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? 'success' : 'default'}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <PermissionGate permission="payroll:update">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEmployeeModal(employee)}>
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission="payroll:delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEmployee(employee.id)}
                              disabled={deleteEmployee.isPending}
                            >
                              <TrashIcon className="w-4 h-4 text-red-500" />
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
        </>
      ) : (
        /* Payroll Runs Table */
        <>
          {payrollLoading && (
            <Card>
              <div className="p-12 text-center">
                <ArrowPathIcon className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                <p className="text-gray-500 dark:text-gray-400">Loading payroll runs...</p>
              </div>
            </Card>
          )}
          {!payrollLoading && (
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run #</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p className="mb-4">No payroll runs yet</p>
                      <Button onClick={handleOpenPayrollModal}>
                        <PlayIcon className="w-4 h-4 mr-1" />
                        Run First Payroll
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-mono text-gray-600 dark:text-gray-400">{run.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {formatDate(run.periodStart)} - {formatDate(run.periodEnd)}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">{formatDate(run.payDate)}</TableCell>
                      <TableCell>{run.entries?.length ?? 0}</TableCell>
                      <TableCell className="font-medium">{fc(run.totalGross)}</TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        {fc(run.totalNet)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            run.status === 'paid' || run.status === 'PAID' ? 'success' :
                            run.status === 'approved' || run.status === 'APPROVED' ? 'warning' :
                            'default'
                          }
                        >
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(run.status === 'DRAFT' || run.status === 'draft') && (
                            <PermissionGate permission="payroll:create">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveRun(run.id)}
                                disabled={approvingRunId === run.id}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                {approvingRunId === run.id ? 'Approving...' : 'Approve'}
                              </Button>
                            </PermissionGate>
                          )}
                          {(run.status === 'APPROVED' || run.status === 'approved') && (
                            <PermissionGate permission="payroll:create">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEmailPayslips(run.id)}
                                disabled={emailingRunId === run.id}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <EnvelopeIcon className="w-4 h-4 mr-1" />
                                {emailingRunId === run.id ? 'Sending...' : 'Email Payslips'}
                              </Button>
                            </PermissionGate>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
          )}
        </>
      )}

      {/* Employee Modal */}
      <Modal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        size="lg"
      >
        <ModalBody>
          <div className="space-y-4">
            {saveError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-400">
                {saveError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name *"
                value={employeeForm.firstName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
              />
              <Input
                label="Last Name *"
                value={employeeForm.lastName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Department"
                value={employeeForm.department}
                onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
              />
              <Input
                label="Position"
                value={employeeForm.position}
                onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type</label>
                <select
                  value={employeeForm.employmentType}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employmentType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 px-3 py-2 text-sm"
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pay Frequency</label>
                <select
                  value={employeeForm.paymentFrequency}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, paymentFrequency: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 px-3 py-2 text-sm"
                >
                  {PAY_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Base Salary"
                type="number"
                value={employeeForm.baseSalary}
                onChange={(e) => setEmployeeForm({ ...employeeForm, baseSalary: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={employeeForm.bankName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bankName: e.target.value })}
              />
              <Input
                label="Bank Account"
                value={employeeForm.bankAccountNumber}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bankAccountNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="TRN"
                value={employeeForm.trnNumber}
                onChange={(e) => setEmployeeForm({ ...employeeForm, trnNumber: e.target.value })}
                placeholder="9-digit TRN"
              />
              <Input
                label="NIS Number"
                value={employeeForm.nisNumber}
                onChange={(e) => setEmployeeForm({ ...employeeForm, nisNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                value={employeeForm.dateOfBirth}
                onChange={(e) => setEmployeeForm({ ...employeeForm, dateOfBirth: e.target.value })}
              />
              <Input
                label="Hire Date"
                type="date"
                value={employeeForm.hireDate}
                onChange={(e) => setEmployeeForm({ ...employeeForm, hireDate: e.target.value })}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEmployeeModal(false)}>Cancel</Button>
          <Button
            onClick={handleSaveEmployee}
            disabled={createEmployee.isPending || updateEmployee.isPending}
          >
            {(createEmployee.isPending || updateEmployee.isPending) ? 'Saving...' : editingEmployee ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Payroll Run Modal */}
      <Modal
        isOpen={showPayrollModal}
        onClose={() => setShowPayrollModal(false)}
        title="Run Payroll"
        size="lg"
      >
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Pay Period Start *"
                type="date"
                value={payrollForm.payPeriodStart}
                onChange={(e) => setPayrollForm({ ...payrollForm, payPeriodStart: e.target.value })}
              />
              <Input
                label="Pay Period End *"
                type="date"
                value={payrollForm.payPeriodEnd}
                onChange={(e) => setPayrollForm({ ...payrollForm, payPeriodEnd: e.target.value })}
              />
              <Input
                label="Pay Date *"
                type="date"
                value={payrollForm.payDate}
                onChange={(e) => setPayrollForm({ ...payrollForm, payDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Employees &amp; Earnings</label>
              <div className="border dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                {employees.filter(e => e.isActive).map((emp) => {
                  const isSelected = payrollForm.selectedEmployees.includes(emp.id);
                  const ov = payrollForm.overrides[emp.id] ?? { overtime: '0', bonus: '0', commission: '0', allowances: '0' };
                  const updateOverride = (field: keyof PayrollEmployeeOverride, value: string) => {
                    setPayrollForm(prev => ({
                      ...prev,
                      overrides: { ...prev.overrides, [emp.id]: { ...ov, [field]: value } },
                    }));
                  };
                  return (
                    <div key={emp.id} className={`p-3 border-b last:border-b-0 ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPayrollForm(prev => ({
                                ...prev,
                                selectedEmployees: [...prev.selectedEmployees, emp.id],
                                overrides: { ...prev.overrides, [emp.id]: ov },
                              }));
                            } else {
                              setPayrollForm(prev => ({
                                ...prev,
                                selectedEmployees: prev.selectedEmployees.filter(id => id !== emp.id),
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{emp.position} &middot; Base: {emp.baseSalary ? fc(emp.baseSalary) : '-'}</p>
                        </div>
                      </label>
                      {isSelected && (
                        <div className="grid grid-cols-4 gap-2 mt-2 ml-8">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Overtime</label>
                            <input
                              type="number"
                              value={ov.overtime}
                              onChange={(e) => updateOverride('overtime', e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 text-xs"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Bonus</label>
                            <input
                              type="number"
                              value={ov.bonus}
                              onChange={(e) => updateOverride('bonus', e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 text-xs"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Commission</label>
                            <input
                              type="number"
                              value={ov.commission}
                              onChange={(e) => updateOverride('commission', e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 text-xs"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Allowances</label>
                            <input
                              type="number"
                              value={ov.allowances}
                              onChange={(e) => updateOverride('allowances', e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 text-xs"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Selected Employees:</span>
                <span className="font-medium">{payrollForm.selectedEmployees.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Estimated Gross:</span>
                <span className="font-medium">
                  {fc(
                    employees
                      .filter(e => payrollForm.selectedEmployees.includes(e.id))
                      .reduce((sum, e) => {
                        const ov = payrollForm.overrides[e.id];
                        const extras = ov ? (parseFloat(ov.overtime) || 0) + (parseFloat(ov.bonus) || 0) +
                          (parseFloat(ov.commission) || 0) + (parseFloat(ov.allowances) || 0) : 0;
                        return sum + Number(e.baseSalary || 0) + extras;
                      }, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Jamaica Statutory Deductions</p>
              <ul className="space-y-1 text-blue-600">
                <li>NIS: 3% employee / 3% employer</li>
                <li>NHT: 2% employee / 3% employer</li>
                <li>Education Tax: 2.25%</li>
                <li>PAYE: Based on tax bands</li>
              </ul>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
          <Button onClick={handleRunPayroll} disabled={payrollRunning}>
            <PlayIcon className="w-4 h-4 mr-1" />
            {payrollRunning ? 'Processing...' : 'Process Payroll'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
