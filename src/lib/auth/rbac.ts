/**
 * Role-Based Access Control (RBAC) for YaadBooks.
 *
 * Role hierarchy: OWNER > ADMIN > ACCOUNTANT > STAFF > READ_ONLY
 *
 * Each role inherits permissions from the roles below it.
 */

export type Role = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'READ_ONLY';

export type Permission =
  // Company
  | 'company:read' | 'company:update' | 'company:delete'
  // Users
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  // Customers
  | 'customers:read' | 'customers:create' | 'customers:update' | 'customers:delete'
  // Products
  | 'products:read' | 'products:create' | 'products:update' | 'products:delete'
  // Invoices
  | 'invoices:read' | 'invoices:create' | 'invoices:update' | 'invoices:delete' | 'invoices:approve'
  // Quotations
  | 'quotations:read' | 'quotations:create' | 'quotations:update' | 'quotations:delete'
  // Expenses
  | 'expenses:read' | 'expenses:create' | 'expenses:update' | 'expenses:delete' | 'expenses:approve'
  // Payroll
  | 'payroll:read' | 'payroll:create' | 'payroll:approve'
  // GL / Accounting
  | 'gl:read' | 'gl:create' | 'gl:update' | 'gl:delete'
  | 'journal:read' | 'journal:create' | 'journal:update' | 'journal:delete' | 'journal:post'
  // Banking
  | 'banking:read' | 'banking:create' | 'banking:update' | 'banking:delete' | 'banking:reconcile'
  // Reports
  | 'reports:read' | 'reports:export'
  // Settings
  | 'settings:read' | 'settings:update' | 'settings:write'
  // Audit
  | 'audit:read'
  // Tax
  | 'tax:read' | 'tax:export' | 'tax:file'
  // Inventory (Purchase Orders, Goods Received Notes)
  | 'inventory:read' | 'inventory:create' | 'inventory:update' | 'inventory:delete'
  // Accountant-specific permissions (multi-client management)
  | 'accountant:clients' | 'accountant:switch' | 'accountant:dashboard';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  READ_ONLY: [
    'company:read',
    'customers:read',
    'products:read',
    'invoices:read',
    'quotations:read',
    'expenses:read',
    'payroll:read',
    'gl:read',
    'journal:read',
    'banking:read',
    'reports:read',
    'settings:read',
    'tax:read',
    'inventory:read',
  ],

  STAFF: [
    // Inherits READ_ONLY +
    'customers:create', 'customers:update',
    'products:create', 'products:update',
    'invoices:create', 'invoices:update',
    'quotations:create', 'quotations:update',
    'expenses:create', 'expenses:update',
    'banking:create',
    'inventory:create', 'inventory:update',
  ],

  ACCOUNTANT: [
    // Inherits STAFF +
    'customers:delete',
    'products:delete',
    'invoices:delete', 'invoices:approve',
    'quotations:delete',
    'expenses:delete', 'expenses:approve',
    'payroll:create', 'payroll:approve',
    'gl:create', 'gl:update', 'gl:delete',
    'journal:create', 'journal:update', 'journal:delete', 'journal:post',
    'banking:update', 'banking:delete', 'banking:reconcile',
    'reports:export',
    'tax:export', 'tax:file',
    'audit:read',
    'inventory:delete',
    // Multi-client management for external accountants
    'accountant:clients',   // Manage client relationships (invite, suspend, view)
    'accountant:switch',    // Switch between client company contexts
    'accountant:dashboard', // View aggregated multi-client dashboard
  ],

  ADMIN: [
    // Inherits ACCOUNTANT +
    'company:update',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'settings:update', 'settings:write',
  ],

  OWNER: [
    // Inherits ADMIN +
    'company:delete',
  ],
};

// Build resolved permissions (with inheritance)
const ROLE_HIERARCHY: Role[] = ['READ_ONLY', 'STAFF', 'ACCOUNTANT', 'ADMIN', 'OWNER'];

const resolvedPermissions = new Map<Role, Set<Permission>>();

function buildResolvedPermissions() {
  const accumulated = new Set<Permission>();
  for (const role of ROLE_HIERARCHY) {
    for (const perm of ROLE_PERMISSIONS[role]) {
      accumulated.add(perm);
    }
    resolvedPermissions.set(role, new Set(accumulated));
  }
}

buildResolvedPermissions();

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = resolvedPermissions.get(role);
  return perms?.has(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role (including inherited).
 */
export function getPermissions(role: Role): Permission[] {
  const perms = resolvedPermissions.get(role);
  return perms ? Array.from(perms) : [];
}

/**
 * Compare role levels. Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareRoles(a: Role, b: Role): number {
  return ROLE_HIERARCHY.indexOf(a) - ROLE_HIERARCHY.indexOf(b);
}
