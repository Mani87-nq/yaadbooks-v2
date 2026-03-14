# YaadBooks API Audit Fix Plan
**Target: Pass Dual-Agent Audit with STRONG BETA READY rating**

Generated: 2026-03-14

---

## 🚨 P1 FIXES (IMMEDIATE - Before any testing)

### 1. Invoice Totals Returning 0

**Root Cause:** The API expects client to calculate and send `subtotal`, `gctAmount`, and `total`. Test scripts sent items with `taxRate` but API expects `gctRate` and pre-calculated totals.

**Two Options:**

#### Option A: Server-Side Calculation (RECOMMENDED)
Add automatic calculation in the POST handler:

```typescript
// src/app/api/v1/invoices/route.ts - In POST handler, before creating invoice

// Calculate totals server-side (don't trust client)
const GCT_RATES = {
  STANDARD: 0.15,
  TELECOM: 0.25,
  TOURISM: 0.10,
  ZERO_RATED: 0,
  EXEMPT: 0,
};

let calculatedSubtotal = 0;
let calculatedGct = 0;

const processedItems = items.map(item => {
  const lineSubtotal = item.quantity * item.unitPrice;
  const gctRate = GCT_RATES[item.gctRate] || 0;
  const lineGct = lineSubtotal * gctRate;
  
  calculatedSubtotal += lineSubtotal;
  calculatedGct += lineGct;
  
  return {
    ...item,
    gctAmount: lineGct,
    total: lineSubtotal + lineGct,
  };
});

const discountAmount = invoiceData.discountType === 'PERCENTAGE' 
  ? calculatedSubtotal * (invoiceData.discount / 100)
  : invoiceData.discount;

const calculatedTotal = calculatedSubtotal + calculatedGct - discountAmount;

// Use calculated values, not client-provided
const finalInvoiceData = {
  ...invoiceData,
  subtotal: calculatedSubtotal,
  gctAmount: calculatedGct,
  total: calculatedTotal,
};
```

**File:** `src/app/api/v1/invoices/route.ts`
**Effort:** 30 minutes

---

### 2. Duplicate Records on Concurrent POSTs

**Root Cause:** No idempotency check or unique constraints on business keys.

**Fix:** Add idempotency key support:

```typescript
// src/lib/idempotency.ts
import { createHash } from 'crypto';
import prisma from '@/lib/db';

export async function checkIdempotency(
  key: string,
  companyId: string,
  ttlMs: number = 60000 // 1 minute
): Promise<{ isDuplicate: boolean; existingResult?: any }> {
  const hash = createHash('sha256').update(`${companyId}:${key}`).digest('hex');
  
  const existing = await prisma.idempotencyKey.findUnique({
    where: { hash },
  });
  
  if (existing && existing.expiresAt > new Date()) {
    return { isDuplicate: true, existingResult: existing.response };
  }
  
  return { isDuplicate: false };
}

export async function storeIdempotency(
  key: string,
  companyId: string,
  response: any,
  ttlMs: number = 60000
): Promise<void> {
  const hash = createHash('sha256').update(`${companyId}:${key}`).digest('hex');
  
  await prisma.idempotencyKey.upsert({
    where: { hash },
    create: {
      hash,
      companyId,
      response,
      expiresAt: new Date(Date.now() + ttlMs),
    },
    update: {
      response,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
}
```

**Usage in routes:**
```typescript
// Check Idempotency-Key header
const idempotencyKey = request.headers.get('Idempotency-Key');
if (idempotencyKey) {
  const { isDuplicate, existingResult } = await checkIdempotency(idempotencyKey, companyId);
  if (isDuplicate) {
    return NextResponse.json(existingResult, { status: 200 });
  }
}
```

**DB Migration needed:**
```sql
CREATE TABLE "IdempotencyKey" (
  "hash" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_idempotency_expires ON "IdempotencyKey"("expiresAt");
```

**Files:** 
- `src/lib/idempotency.ts` (new)
- `prisma/schema.prisma` (add model)
- All POST routes in `src/app/api/v1/`

**Effort:** 2 hours

---

## ⚠️ P2 FIXES (Before beta expansion)

### 3. XSS Payloads Stored Without Sanitization

**Root Cause:** No input sanitization layer.

**Fix:** Add sanitization middleware:

```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeString(input: string): string {
  // Remove HTML tags and encode special characters
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = Array.isArray(value) 
        ? value.map(v => typeof v === 'object' ? sanitizeObject(v) : sanitizeString(String(v)))
        : sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}
```

**Usage:**
```typescript
const body = sanitizeObject(await request.json());
```

**Install:** `npm install isomorphic-dompurify`

**Effort:** 1 hour

---

### 4. Rate Limiting on API Endpoints

**Root Cause:** Rate limiting only on contact form, not API endpoints.

**Fix:** Add global rate limiter middleware:

```typescript
// src/middleware.ts (or src/lib/rate-limit.ts)
import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMITS = {
  '/api/auth/login': { requests: 5, windowMs: 60000 },      // 5/min
  '/api/v1/': { requests: 100, windowMs: 60000 },           // 100/min for API
  'default': { requests: 200, windowMs: 60000 },            // 200/min default
};

const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const path = new URL(request.url).pathname;
  
  // Find matching rate limit
  let limit = RATE_LIMITS['default'];
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(pattern)) {
      limit = config;
      break;
    }
  }
  
  const key = `${ip}:${path.split('/').slice(0, 4).join('/')}`;
  const now = Date.now();
  const entry = ipRequestMap.get(key);
  
  if (!entry || entry.resetAt < now) {
    ipRequestMap.set(key, { count: 1, resetAt: now + limit.windowMs });
    return null;
  }
  
  entry.count++;
  
  if (entry.count > limit.requests) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: Math.ceil((entry.resetAt - now) / 1000) },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          'X-RateLimit-Limit': String(limit.requests),
          'X-RateLimit-Remaining': '0',
        }
      }
    );
  }
  
  return null;
}
```

**Apply in middleware.ts:**
```typescript
import { rateLimit } from './lib/rate-limit';

export function middleware(request: NextRequest) {
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // ... rest of middleware
}
```

**Effort:** 1 hour

---

### 5. Brute Force Protection on Login

**Fix:** Progressive delays on failed login attempts:

```typescript
// src/app/api/auth/login/route.ts

const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

// Before validating credentials:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
const key = `login:${ip}:${email}`;
const attempt = loginAttempts.get(key) || { count: 0 };

if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
  const waitSec = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Too many failed attempts', retryAfter: waitSec },
    { status: 429 }
  );
}

// After failed login:
attempt.count++;
if (attempt.count >= 5) {
  // Lock for 15 minutes after 5 failures
  attempt.lockedUntil = Date.now() + 15 * 60 * 1000;
}
loginAttempts.set(key, attempt);

// After successful login:
loginAttempts.delete(key);
```

**Effort:** 30 minutes

---

## 📋 Implementation Order

| Priority | Task | Time | File(s) |
|----------|------|------|---------|
| 1 | Server-side invoice calculation | 30m | `invoices/route.ts` |
| 2 | Login brute-force protection | 30m | `auth/login/route.ts` |
| 3 | Input sanitization | 1h | New `lib/sanitize.ts` + all routes |
| 4 | Global rate limiting | 1h | `middleware.ts` |
| 5 | Idempotency keys | 2h | New `lib/idempotency.ts` + migration |

**Total estimated time: ~5 hours**

---

## 🧪 Retest Plan

After fixes, run audit again with:

```bash
# Test accounts
api-tester@yaadbooks.com (full access)
codex-tester@yaadbooks.com (restricted - verify tier enforcement still works)

# Invoice test - should now return calculated totals
curl -X POST "https://yaadbooks.com/api/v1/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "xxx",
    "dueDate": "2026-04-20",
    "issueDate": "2026-03-14",
    "items": [
      {"description": "Test", "quantity": 2, "unitPrice": 100, "gctRate": "STANDARD"}
    ]
  }'
# Expected: subtotal=200, gctAmount=30, total=230

# Concurrent duplicate test - should return same response
for i in {1..3}; do
  curl -X POST "https://yaadbooks.com/api/v1/customers" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Idempotency-Key: test-unique-key" \
    -H "Content-Type: application/json" \
    -d '{"name": "Test"}' &
done
# Expected: Only 1 customer created

# Rate limit test
for i in {1..150}; do curl -s -o /dev/null -w "%{http_code}\n" ...; done
# Expected: 429 after ~100 requests
```

---

## ✅ Success Criteria

After fixes, audit should show:
- ✅ Invoice totals calculated correctly
- ✅ No duplicates on concurrent POSTs (with idempotency key)
- ✅ Rate limiting returns 429
- ✅ Login lockout after 5 failures
- ✅ XSS payloads sanitized

**Target Rating: STRONG BETA READY**
