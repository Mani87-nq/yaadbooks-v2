/**
 * Role-Based Access Control (RBAC) Tests
 *
 * Tests the permission hierarchy: OWNER > ADMIN > ACCOUNTANT > STAFF > READ_ONLY
 * and all permission checking functions.
 */
import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  compareRoles,
  type Role,
  type Permission,
} from '@/lib/auth/rbac';

describe('RBAC — Role-Based Access Control', () => {
  // ──────────────────────────────────────────
  // Role Hierarchy
  // ──────────────────────────────────────────

  describe('Role hierarchy and inheritance', () => {
    it('READ_ONLY should only have read permissions', () => {
      const perms = getPermissions('READ_ONLY');

      // Should have read permissions
      expect(perms).toContain('company:read');
      expect(perms).toContain('invoices:read');
      expect(perms).toContain('expenses:read');
      expect(perms).toContain('reports:read');
      expect(perms).toContain('pos:read');

      // Should NOT have write permissions
      expect(perms).not.toContain('invoices:create');
      expect(perms).not.toContain('expenses:create');
      expect(perms).not.toContain('company:update');
      expect(perms).not.toContain('company:delete');
    });

    it('STAFF should inherit READ_ONLY + create/update permissions', () => {
      const perms = getPermissions('STAFF');

      // Inherited from READ_ONLY
      expect(perms).toContain('company:read');
      expect(perms).toContain('invoices:read');

      // STAFF's own permissions
      expect(perms).toContain('customers:create');
      expect(perms).toContain('customers:update');
      expect(perms).toContain('invoices:create');
      expect(perms).toContain('invoices:update');
      expect(perms).toContain('pos:create');
      expect(perms).toContain('pos:update');

      // Should NOT have delete/approve
      expect(perms).not.toContain('invoices:delete');
      expect(perms).not.toContain('invoices:approve');
      expect(perms).not.toContain('company:delete');
    });

    it('ACCOUNTANT should inherit STAFF + delete/approve/GL permissions', () => {
      const perms = getPermissions('ACCOUNTANT');

      // Inherited from STAFF
      expect(perms).toContain('invoices:create');
      expect(perms).toContain('invoices:update');

      // ACCOUNTANT's own permissions
      expect(perms).toContain('invoices:delete');
      expect(perms).toContain('invoices:approve');
      expect(perms).toContain('expenses:approve');
      expect(perms).toContain('payroll:create');
      expect(perms).toContain('payroll:update');
      expect(perms).toContain('payroll:delete');
      expect(perms).toContain('payroll:approve');
      expect(perms).toContain('gl:create');
      expect(perms).toContain('journal:post');
      expect(perms).toContain('banking:reconcile');
      expect(perms).toContain('reports:export');
      expect(perms).toContain('tax:file');
      expect(perms).toContain('audit:read');

      // Should NOT have user management or company delete
      expect(perms).not.toContain('users:create');
      expect(perms).not.toContain('users:delete');
      expect(perms).not.toContain('company:delete');
    });

    it('ADMIN should inherit ACCOUNTANT + user management + settings', () => {
      const perms = getPermissions('ADMIN');

      // Inherited from ACCOUNTANT
      expect(perms).toContain('invoices:approve');
      expect(perms).toContain('journal:post');

      // ADMIN's own permissions
      expect(perms).toContain('company:update');
      expect(perms).toContain('users:read');
      expect(perms).toContain('users:create');
      expect(perms).toContain('users:update');
      expect(perms).toContain('users:delete');
      expect(perms).toContain('settings:update');
      expect(perms).toContain('settings:write');
      expect(perms).toContain('pos:settings');

      // Should NOT be able to delete company
      expect(perms).not.toContain('company:delete');
    });

    it('OWNER should have ALL permissions including company:delete', () => {
      const perms = getPermissions('OWNER');

      // Everything inherited
      expect(perms).toContain('company:read');
      expect(perms).toContain('invoices:create');
      expect(perms).toContain('journal:post');
      expect(perms).toContain('users:delete');
      expect(perms).toContain('settings:write');

      // OWNER-only
      expect(perms).toContain('company:delete');
    });

    it('each higher role should have more permissions than the one below', () => {
      const hierarchy: Role[] = ['READ_ONLY', 'STAFF', 'ACCOUNTANT', 'ADMIN', 'OWNER'];

      for (let i = 1; i < hierarchy.length; i++) {
        const lowerPerms = getPermissions(hierarchy[i - 1]);
        const higherPerms = getPermissions(hierarchy[i]);
        expect(higherPerms.length).toBeGreaterThan(lowerPerms.length);

        // Every lower-role permission should be in the higher role
        for (const perm of lowerPerms) {
          expect(higherPerms).toContain(perm);
        }
      }
    });
  });

  // ──────────────────────────────────────────
  // hasPermission
  // ──────────────────────────────────────────

  describe('hasPermission', () => {
    it('should return true for a direct permission', () => {
      expect(hasPermission('READ_ONLY', 'invoices:read')).toBe(true);
    });

    it('should return true for an inherited permission', () => {
      // STAFF inherits invoices:read from READ_ONLY
      expect(hasPermission('STAFF', 'invoices:read')).toBe(true);
    });

    it('should return false for an unauthorized permission', () => {
      expect(hasPermission('READ_ONLY', 'invoices:create')).toBe(false);
    });

    it('should deny company:delete to everyone except OWNER', () => {
      expect(hasPermission('READ_ONLY', 'company:delete')).toBe(false);
      expect(hasPermission('STAFF', 'company:delete')).toBe(false);
      expect(hasPermission('ACCOUNTANT', 'company:delete')).toBe(false);
      expect(hasPermission('ADMIN', 'company:delete')).toBe(false);
      expect(hasPermission('OWNER', 'company:delete')).toBe(true);
    });

    it('should deny user management to non-admins', () => {
      expect(hasPermission('READ_ONLY', 'users:create')).toBe(false);
      expect(hasPermission('STAFF', 'users:create')).toBe(false);
      expect(hasPermission('ACCOUNTANT', 'users:create')).toBe(false);
      expect(hasPermission('ADMIN', 'users:create')).toBe(true);
      expect(hasPermission('OWNER', 'users:create')).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // hasAllPermissions
  // ──────────────────────────────────────────

  describe('hasAllPermissions', () => {
    it('should return true when all permissions are held', () => {
      expect(
        hasAllPermissions('ACCOUNTANT', ['invoices:create', 'invoices:approve', 'gl:create']),
      ).toBe(true);
    });

    it('should return false when ANY permission is missing', () => {
      // STAFF can create invoices but can't approve them
      expect(
        hasAllPermissions('STAFF', ['invoices:create', 'invoices:approve']),
      ).toBe(false);
    });

    it('should return true for empty permission array', () => {
      expect(hasAllPermissions('READ_ONLY', [])).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // hasAnyPermission
  // ──────────────────────────────────────────

  describe('hasAnyPermission', () => {
    it('should return true when at least one permission is held', () => {
      expect(
        hasAnyPermission('READ_ONLY', ['invoices:create', 'invoices:read']),
      ).toBe(true);
    });

    it('should return false when NO permissions are held', () => {
      expect(
        hasAnyPermission('READ_ONLY', ['invoices:create', 'invoices:delete', 'users:create']),
      ).toBe(false);
    });

    it('should return false for empty permission array', () => {
      expect(hasAnyPermission('OWNER', [])).toBe(false);
    });
  });

  // ──────────────────────────────────────────
  // compareRoles
  // ──────────────────────────────────────────

  describe('compareRoles', () => {
    it('should return 0 for same role', () => {
      expect(compareRoles('ADMIN', 'ADMIN')).toBe(0);
    });

    it('should return positive when first role is higher', () => {
      expect(compareRoles('OWNER', 'READ_ONLY')).toBeGreaterThan(0);
      expect(compareRoles('ADMIN', 'STAFF')).toBeGreaterThan(0);
    });

    it('should return negative when first role is lower', () => {
      expect(compareRoles('READ_ONLY', 'OWNER')).toBeLessThan(0);
      expect(compareRoles('STAFF', 'ACCOUNTANT')).toBeLessThan(0);
    });

    it('should be consistent with the hierarchy order', () => {
      expect(compareRoles('OWNER', 'ADMIN')).toBeGreaterThan(0);
      expect(compareRoles('ADMIN', 'ACCOUNTANT')).toBeGreaterThan(0);
      expect(compareRoles('ACCOUNTANT', 'STAFF')).toBeGreaterThan(0);
      expect(compareRoles('STAFF', 'READ_ONLY')).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────
  // Critical Security Scenarios
  // ──────────────────────────────────────────

  describe('Critical security scenarios', () => {
    it('STAFF should NOT be able to approve payroll', () => {
      expect(hasPermission('STAFF', 'payroll:approve')).toBe(false);
    });

    it('STAFF should NOT be able to post journal entries', () => {
      expect(hasPermission('STAFF', 'journal:post')).toBe(false);
    });

    it('STAFF should NOT be able to reconcile banking', () => {
      expect(hasPermission('STAFF', 'banking:reconcile')).toBe(false);
    });

    it('READ_ONLY should NOT be able to void POS transactions', () => {
      expect(hasPermission('READ_ONLY', 'pos:void')).toBe(false);
    });

    it('ACCOUNTANT should NOT be able to manage POS settings', () => {
      expect(hasPermission('ACCOUNTANT', 'pos:settings')).toBe(false);
    });

    it('ADMIN should be able to manage settings but not delete company', () => {
      expect(hasPermission('ADMIN', 'settings:write')).toBe(true);
      expect(hasPermission('ADMIN', 'company:delete')).toBe(false);
    });
  });
});
