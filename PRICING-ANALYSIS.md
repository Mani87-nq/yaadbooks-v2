# YaadBooks Pricing & Tier Analysis
**Competitive Research + Recommendations**

Generated: 2026-03-14

---

## Current YaadBooks Tier Structure

### FREE Tier (Current)
| Feature | Status |
|---------|--------|
| Invoicing | ✅ Included |
| Quotations | ✅ Included |
| Expenses | ✅ Included |
| Basic Reports | ✅ Included |
| GCT Compliance | ✅ Included |
| Users | 1 |
| Invoices/month | 50 |
| Storage | 500MB |
| AI Questions | 1/month |

**Problem:** This is basically a complete accounting system. A small business with <50 invoices/month (bakery, salon, small shop) may NEVER need to upgrade.

---

## Competitor Comparison

### Zoho Books FREE
- ✅ Unlimited invoices
- ✅ Bank reconciliation
- ✅ P&L, Balance Sheet + 50 reports
- ✅ 1 user + 1 accountant
- **First paid tier:** $15/mo (3 users, API, custom fields)

### Wave FREE
- ✅ Unlimited invoices
- ✅ Unlimited users
- ✅ Full accounting
- ✅ Bank connections
- **Paid:** Only payments processing + payroll

### QuickBooks Online
- ❌ No free tier
- Simple Start: $30/mo
- Plus: $90/mo

### FreshBooks
- ❌ No free tier
- Lite: $19/mo (5 clients limit)
- Plus: $33/mo (50 clients)

---

## The Problem

**YaadBooks FREE is more restrictive than Zoho/Wave on LIMITS but generous on FEATURES.**

The issue: A Jamaican business that:
- Has <50 invoices/month
- Only needs 1 user
- Wants GCT compliance
- Needs basic reporting

...gets everything they need for FREE. No reason to upgrade.

---

## Recommended Changes

### Option A: Limit-Based Restrictions (Moderate)

| Change | Current | Proposed |
|--------|---------|----------|
| Invoices/month | 50 | **10** |
| Quotations/month | Unlimited | **5** |
| Customers | Unlimited | **10** |
| Reports | Basic | **Last 30 days only** |
| Invoice PDF | Clean | **"Powered by YaadBooks" watermark** |
| GCT Filing | Full export | **View only, no export** |

**Rationale:** Users hit walls faster, feel the need to upgrade.

### Option B: Feature-Based Restrictions (Aggressive)

| Feature | Current (FREE) | Proposed (FREE) |
|---------|----------------|-----------------|
| Invoicing | ✅ | ✅ (5/month) |
| Quotations | ✅ | ❌ → STARTER |
| Expenses | ✅ | ✅ (basic) |
| Basic Reports | ✅ | ❌ → STARTER (only dashboard) |
| GCT Compliance | ✅ | ⚠️ (calculate only, no export) |
| Bank Reconciliation | ❌ | ❌ |
| Payroll | ❌ | ❌ |

**Rationale:** FREE becomes a "taste" not a "meal."

### Option C: Branding + Time Limits (Soft)

Keep current features but add:
1. **"Powered by YaadBooks" on all invoices** (removable at STARTER)
2. **Data limited to last 90 days** (historical data at STARTER)
3. **No PDF exports** (upgrade to download)
4. **Dashboard ads/upgrade prompts**

---

## My Recommendation: Option A + Partial B

### New FREE Tier Proposal

```
FREE - "Try YaadBooks"
├── Invoicing: 10/month (was 50)
├── Quotations: 3/month (was unlimited)
├── Customers: 15 max
├── Expenses: ✅ Basic tracking
├── Reports: Dashboard + Last 30 days only
├── GCT: Calculate only (no TAJ export)
├── Invoice PDF: "Powered by YaadBooks" watermark
├── Users: 1
├── Storage: 250MB
└── AI: 0 questions (taste = upgrade prompt)
```

### STARTER Unlocks (J$3,499/mo)
- Unlimited invoices
- Unlimited quotations
- Unlimited customers
- Full reports (all time)
- GCT filing export
- Clean invoices (no watermark)
- 3 users
- 2GB storage
- 25 AI questions

---

## Pricing Sustainability Analysis

### Current Pricing vs Competitors

| Tier | YaadBooks (JMD) | YaadBooks (USD) | Zoho | QuickBooks |
|------|-----------------|-----------------|------|------------|
| Free | J$0 | $0 | $0 | ❌ |
| Starter | J$3,499 | ~$22 | $15 | $30 |
| Professional | J$7,499 | ~$48 | $40 | $60 |
| Business | J$13,999 | ~$90 | $60 | $90 |
| Enterprise | J$22,999 | ~$148 | $120-240 | Custom |

**Assessment:** Pricing is competitive but slightly higher than Zoho at lower tiers.

### Recommendation
- **Keep current pricing** - Jamaica premium is justified by local compliance
- **Add annual discount** - 15-20% off for yearly commitment
- **Consider STARTER at J$2,999** - Lower barrier to first paid conversion

---

## Implementation Priority

### Phase 1: Quick Wins (This Week)
1. ✅ Reduce FREE invoice limit: 50 → 10
2. ✅ Add invoice watermark for FREE tier
3. ✅ Limit FREE reports to last 30 days
4. ✅ Remove GCT export from FREE (calculate only)

### Phase 2: Enforcement (Next Sprint)
1. Add upgrade prompts when hitting limits
2. Dashboard "upgrade banner" for FREE users
3. Email drip campaign for FREE → STARTER conversion

### Phase 3: Polish
1. Annual billing discount
2. Referral program for upgrades
3. "Downgrade protection" warnings

---

## Code Changes Required

### 1. Update TIER_LIMITS in feature-matrix.ts

```typescript
free: {
  maxUsers: 1,
  maxCompanies: 1,
  maxInvoicesPerMonth: 10,      // Changed from 50
  maxQuotationsPerMonth: 3,     // NEW
  maxCustomers: 15,             // NEW
  maxPayrollEmployees: 0,
  maxStorageMb: 250,            // Changed from 500
  maxAiQuestionsPerMonth: 0,    // Changed from 1
  maxLocations: 1,
  includesModules: 0,
  reportHistoryDays: 30,        // NEW
  invoiceWatermark: true,       // NEW
  gctExportEnabled: false,      // NEW
}
```

### 2. Add watermark to invoice PDF generation

### 3. Add report date filter for FREE tier

### 4. Block GCT export for FREE tier

---

## Summary

**The Core Issue:** FREE tier is too complete. Users get full value without paying.

**The Fix:** Create friction points that push users to upgrade:
- Lower limits (10 invoices, not 50)
- Feature gates (no report export, no GCT filing)
- Branding (watermark on FREE invoices)
- Time limits (30-day report history)

**Trust First:** These changes don't feel predatory - they're standard SaaS practices. Users get a genuine taste, then upgrade for the full experience.

---

*Ready to implement. Awaiting approval.*
