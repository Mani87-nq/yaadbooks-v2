# YaadBooks E2E Tests

Automated end-to-end tests using Playwright.

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run only smoke tests (quick validation)
npm run test:e2e:smoke

# View test report
npm run test:e2e:report
```

## Test Files

| File | What it tests |
|------|---------------|
| `smoke.spec.ts` | All routes load, no 500 errors |
| `customers.spec.ts` | Customer CRUD, search, statements |
| `invoices.spec.ts` | Invoice lifecycle, PDF preview |
| `pos.spec.ts` | Point of Sale, checkout flow |
| `inventory.spec.ts` | Products, stock management |
| `reports.spec.ts` | Financial reports, exports |

## Configuration

Tests use environment variables:

```bash
# .env.test
TEST_URL=https://yaadbooks.com
TEST_USER_EMAIL=test@yaadbooks.com
TEST_USER_PASSWORD=TestPassword123!
```

## Authentication

Tests authenticate once in `auth.setup.ts` and reuse the session.
Auth state is saved to `tests/.auth/user.json` (gitignored).

## CI Integration

Add to GitHub Actions:

```yaml
- name: Run E2E Tests
  run: |
    npx playwright install --with-deps
    npm run test:e2e
```
