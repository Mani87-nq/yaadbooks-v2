# YaadBooks API Testing Guide

## Overview

YaadBooks provides a complete REST API for automated testing, stress testing, and penetration testing. All endpoints are accessible via API authentication — no browser needed.

## Quick Start

### 1. Setup Test Account

```bash
npx tsx scripts/setup-test-account.ts
```

This creates a dedicated test account with full ENTERPRISE access.

### 2. Authenticate

```bash
curl -X POST https://yaadbooks.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-tester@yaadbooks.com",
    "password": "YaadBooks-API-Test-2026!"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "api-tester@yaadbooks.com",
    "firstName": "API",
    "lastName": "Tester",
    "activeCompanyId": "..."
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Use the Token

```bash
curl https://yaadbooks.com/api/v1/customers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Test Runner

Run the automated test suite:

```bash
# Full test suite
npx tsx scripts/api-test-runner.ts

# Stress test (10 concurrent, 30 seconds)
npx tsx scripts/api-test-runner.ts --stress
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/logout` | Logout (invalidate session) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/sessions` | List active sessions |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers` | List all customers |
| POST | `/api/v1/customers` | Create customer |
| GET | `/api/v1/customers/:id` | Get customer |
| PATCH | `/api/v1/customers/:id` | Update customer |
| DELETE | `/api/v1/customers/:id` | Delete customer |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List all products |
| POST | `/api/v1/products` | Create product |
| GET | `/api/v1/products/:id` | Get product |
| PATCH | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Delete product |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/invoices` | List invoices |
| POST | `/api/v1/invoices` | Create invoice |
| GET | `/api/v1/invoices/:id` | Get invoice |
| PATCH | `/api/v1/invoices/:id` | Update invoice |
| POST | `/api/v1/invoices/:id/send` | Send invoice |
| POST | `/api/v1/invoices/:id/void` | Void invoice |

### POS (Point of Sale)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pos/terminals` | List terminals |
| GET | `/api/v1/pos/sessions` | List POS sessions |
| POST | `/api/v1/pos/sessions` | Open new session |
| GET | `/api/v1/pos/orders` | List orders |
| POST | `/api/v1/pos/orders` | Create order |

### Accounting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/gl-accounts` | Chart of accounts |
| GET | `/api/v1/journal-entries` | Journal entries |
| POST | `/api/v1/journal-entries` | Create entry |
| GET | `/api/v1/expenses` | List expenses |
| POST | `/api/v1/expenses` | Create expense |

### Payroll
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/employees` | List employees |
| POST | `/api/v1/employees` | Create employee |
| GET | `/api/v1/payroll` | List payroll runs |
| POST | `/api/v1/payroll` | Create payroll run |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/dashboard` | Dashboard stats |
| GET | `/api/v1/reports/sales-summary` | Sales summary |
| GET | `/api/v1/reports/profit-loss` | P&L report |
| GET | `/api/v1/reports/balance-sheet` | Balance sheet |

### Team Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/team` | List team members |
| POST | `/api/v1/team/invite` | Invite member |
| PATCH | `/api/v1/team/:id` | Update member role |
| DELETE | `/api/v1/team/:id` | Remove member |

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/auth/login` | 5 requests/minute |
| All other endpoints | 100 requests/minute |

## Error Responses

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "validation_error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Email is required"
}
```

## Security Testing Notes

For penetration testing:

1. **Authentication bypass** — Test without token, with expired token, with forged token
2. **Authorization** — Test accessing other companies' data
3. **Input validation** — SQL injection, XSS in string fields
4. **Rate limiting** — Verify limits are enforced
5. **IDOR** — Test changing IDs to access other resources

## Test Account Credentials

```
Email: api-tester@yaadbooks.com
Password: YaadBooks-API-Test-2026!
Tier: ENTERPRISE (all features unlocked)
```

**⚠️ Do not use in production. This account is for testing only.**
