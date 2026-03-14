# YAADBOOKS FIXES - MASTER TRACKER
**Created:** 2026-03-14 09:01 AM EDT
**Session:** Saturday Fix Everything Sprint
**Standard:** Senior Developer Level — Verify Every Fix

---

## 🎯 RULES OF ENGAGEMENT

1. **Fix → Test → Verify → Document → Next**
2. **No assumptions** — Every fix verified working
3. **Commit after each fix** — Atomic, traceable changes
4. **Update this file** — Real-time progress tracking

---

## 🔴 PRIORITY 1: MEDIUM ISSUES

### 1. Stripe Webhook Handlers (Stubs)
- **Status:** ⬜ NOT STARTED
- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Issue:** Event handlers only log to console, no DB updates
- **Impact:** Subscription status won't auto-update
- **Fix Required:** Implement actual handlers for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 2. Banking/Accounting Pages Don't Persist
- **Status:** ⬜ NOT STARTED
- **Pages:** Banking, Chart of Accounts, Journal Entries
- **Issue:** Zustand store data lost on refresh
- **Fix Required:** Migrate to React Query + API endpoints (like POS/Customers)

### 3. AI Assistant - Rule-Based, Not Real AI
- **Status:** ⬜ NOT STARTED
- **File:** `src/app/(dashboard)/ai/page.tsx`
- **Issue:** Uses keyword matching, not actual LLM
- **Fix Required:** Integrate Claude API for real AI insights

---

## 🟡 PRIORITY 2: ACCESSIBILITY (WCAG)

### 4. WCAG Violations (6 Pages)
- **Status:** ⬜ NOT STARTED
- **Pages:** Dashboard, Login, Invoices, Customers, POS, Settings
- **Issue:** Color contrast, keyboard nav, screen reader issues
- **Fix Required:** Audit each page, fix violations

---

## 🟢 PRIORITY 3: CODE CLEANUP

### 5. Delete Orphaned plan-gate Files
- **Status:** ⬜ NOT STARTED
- **Files:** 
  - `src/lib/plan-gate.ts`
  - `src/lib/plan-gate.server.ts`
- **Fix:** Delete both files

### 6. Legacy Plan Names in Prisma Enum
- **Status:** ⬜ NOT STARTED
- **File:** `prisma/schema.prisma`
- **Issue:** STARTER, BUSINESS, PROFESSIONAL, ENTERPRISE still in enum
- **Fix:** Remove after confirming no active legacy subscriptions

### 7. Redundant Permission Filtering in Sidebar
- **Status:** ⬜ NOT STARTED
- **File:** `src/components/layout/Sidebar.tsx`
- **Fix:** Use `visibleItems` variable instead of re-filtering

### 8. Payroll Permissions Coarse
- **Status:** ⬜ NOT STARTED
- **File:** `src/lib/auth/rbac.ts`
- **Fix:** Add `payroll:update` and `payroll:delete` permissions

### 9. Sub-pages Lack PermissionGate
- **Status:** ⬜ NOT STARTED
- **Pages:** Invoice editing, stock counts, banking
- **Fix:** Add client-side PermissionGate components

---

## 📋 FIX LOG

| Time | Issue | Action | Result | Commit |
|------|-------|--------|--------|--------|
| - | - | - | - | - |

---

## 📂 RELATED FILES

- Known Issues: `/Users/dolphy/clawd/yaadbooks-web-prod/KNOWN-ISSUES.md`
- Completion Audit: `/Users/dolphy/clawd/yaadbooks-web-prod/COMPLETION-AUDIT.md`
- Repo: `/Users/dolphy/clawd/yaadbooks-web-prod/`

---

*Last Updated: 2026-03-14 09:01 AM EDT*
