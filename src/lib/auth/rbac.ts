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
  | 'payroll:read' | 'payroll:create' | 'payroll:update' | 'payroll:delete' | 'payroll:approve'
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
  // Fixed Assets
  | 'fixed_assets:read' | 'fixed_assets:create' | 'fixed_assets:update' | 'fixed_assets:delete' | 'fixed_assets:depreciate'
  // POS
  | 'pos:read' | 'pos:create' | 'pos:update' | 'pos:delete' | 'pos:void' | 'pos:settings'
  // ── Module: Restaurant ──────────────────────────────
  | 'restaurant:menu:read' | 'restaurant:menu:create' | 'restaurant:menu:update' | 'restaurant:menu:delete'
  | 'restaurant:tables:read' | 'restaurant:tables:create' | 'restaurant:tables:update' | 'restaurant:tables:delete'
  | 'restaurant:kitchen:read' | 'restaurant:kitchen:update'
  | 'restaurant:reservations:read' | 'restaurant:reservations:create' | 'restaurant:reservations:update' | 'restaurant:reservations:delete'
  | 'restaurant:tips:read' | 'restaurant:tips:create' | 'restaurant:tips:update' | 'restaurant:tips:delete'
  | 'restaurant:orders:read' | 'restaurant:orders:create' | 'restaurant:orders:update'
  // ── Module: Salon ───────────────────────────────────
  | 'salon:appointments:read' | 'salon:appointments:create' | 'salon:appointments:update' | 'salon:appointments:delete'
  | 'salon:services:read' | 'salon:services:create' | 'salon:services:update' | 'salon:services:delete'
  | 'salon:stylists:read' | 'salon:stylists:create' | 'salon:stylists:update' | 'salon:stylists:delete'
  | 'salon:walkins:read' | 'salon:walkins:create' | 'salon:walkins:update'
  // ── Module: Retail & Loyalty ────────────────────────
  | 'retail:loyalty:read' | 'retail:loyalty:create' | 'retail:loyalty:update' | 'retail:loyalty:delete'
  | 'retail:members:read' | 'retail:members:create'
  | 'retail:promotions:read' | 'retail:promotions:create' | 'retail:promotions:update' | 'retail:promotions:delete'
  | 'retail:segments:read' | 'retail:segments:create' | 'retail:segments:update' | 'retail:segments:delete';

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
    'fixed_assets:read',
    'pos:read',
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
    'fixed_assets:create', 'fixed_assets:update',
    'pos:create', 'pos:update',
  ],

  ACCOUNTANT: [
    // Inherits STAFF +
    'customers:delete',
    'products:delete',
    'invoices:delete', 'invoices:approve',
    'quotations:delete',
    'expenses:delete', 'expenses:approve',
    'payroll:create', 'payroll:update', 'payroll:delete', 'payroll:approve',
    'gl:create', 'gl:update', 'gl:delete',
    'journal:create', 'journal:update', 'journal:delete', 'journal:post',
    'banking:update', 'banking:delete', 'banking:reconcile',
    'reports:export',
    'tax:export', 'tax:file',
    'audit:read',
    'inventory:delete',
    'fixed_assets:delete', 'fixed_assets:depreciate',
    'pos:delete', 'pos:void',
  ],

  ADMIN: [
    // Inherits ACCOUNTANT +
    'company:update',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'settings:update', 'settings:write',
    'pos:settings',
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
