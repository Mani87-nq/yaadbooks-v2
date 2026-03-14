# YaadBooks Complete Test Suite

A comprehensive testing framework covering functional, security, accessibility, visual, load, and API testing.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run smoke tests (quick validation)
npm run test:e2e:smoke
```

## 📋 Test Categories

| Category | Command | What It Tests |
|----------|---------|---------------|
| **Smoke** | `npm run test:e2e:smoke` | All 30+ routes load without errors |
| **Functional** | `npm run test:e2e` | Full E2E user flows |
| **Security** | `npm run test:e2e:security` | XSS, SQL injection, auth bypass |
| **Accessibility** | `npm run test:e2e:accessibility` | WCAG 2.1 compliance |
| **Visual** | `npm run test:e2e:visual` | Screenshot comparison |
| **API** | `npm run test:e2e:api` | REST endpoint validation |
| **Load** | `npm run test:load` | Performance under 100+ users |

## 🧪 Test Files

### Functional Tests (`tests/e2e/`)
| File | Coverage |
|------|----------|
| `smoke.spec.ts` | All routes, basic navigation |
| `customers.spec.ts` | Customer CRUD, search, statements |
| `invoices.spec.ts` | Invoice lifecycle, PDF, payments |
| `pos.spec.ts` | Point of Sale, checkout flow |
| `inventory.spec.ts` | Products, stock management |
| `reports.spec.ts` | Financial reports, exports |

### Security Tests (`security.spec.ts`)
- ✅ XSS (Cross-Site Scripting) prevention
- ✅ SQL Injection protection
- ✅ CSRF protection
- ✅ Authentication security
- ✅ Authorization (role-based access)
- ✅ Security headers
- ✅ Sensitive data exposure
- ✅ Rate limiting

### Accessibility Tests (`accessibility.spec.ts`)
- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast
- ✅ Touch targets (mobile)
- ✅ Focus management

### Visual Regression Tests (`visual.spec.ts`)
- ✅ Desktop screenshots
- ✅ Mobile screenshots
- ✅ Dark mode
- ✅ Component snapshots
- ✅ Print layouts

### Load Tests (`tests/load/load-test.js`)
- ✅ Smoke: 1 user, quick validation
- ✅ Load: Ramp to 50 concurrent users
- ✅ Stress: Push to 150 users
- ✅ Response time thresholds

## 🔧 Configuration

### Environment Variables

Create `.env.test`:
```bash
TEST_URL=https://yaadbooks.com
TEST_USER_EMAIL=test@yaadbooks.com
TEST_USER_PASSWORD=TestPassword123!
```

### Test User Setup

1. Create a test company in YaadBooks
2. Create a test user with full access
3. Add credentials to `.env.test`

## 📊 Running Tests

### Interactive Mode (Recommended for Debugging)
```bash
npm run test:e2e:ui
```

### Run All Tests
```bash
npm run test:all
```

### Run Specific Category
```bash
npm run test:e2e:smoke        # Quick health check
npm run test:e2e:security     # Security tests only
npm run test:e2e:accessibility # a11y tests only
npm run test:e2e:visual       # Visual regression
npm run test:e2e:api          # API endpoint tests
```

### Update Visual Snapshots
```bash
npm run test:e2e:update-snapshots
```

### Load Testing
```bash
# Install k6 first: brew install k6
npm run test:load:smoke  # Quick load test
npm run test:load        # Full load test
```

### View HTML Report
```bash
npm run test:e2e:report
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run smoke tests
        run: npm run test:e2e:smoke
        env:
          TEST_URL: ${{ secrets.TEST_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      
      - name: Run security tests
        run: npm run test:e2e:security
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📈 Test Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| Route Coverage | 30/30 | 100% |
| Core Flows | 15+ | Full coverage |
| Security | OWASP Top 5 | OWASP Top 10 |
| Accessibility | WCAG AA | WCAG AA |
| Visual | Key pages | All pages |
| Load | 150 VUs | 200 VUs |

## 🐛 Troubleshooting

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check network connectivity
- Verify test credentials

### Visual tests fail
- Run `npm run test:e2e:update-snapshots` to update baselines
- Check for dynamic content (timestamps, etc.)

### Load tests fail
- Ensure k6 is installed: `brew install k6`
- Check rate limiting configuration
- Reduce concurrent users if needed

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [k6 Documentation](https://k6.io/docs/)
- [axe-core Accessibility](https://www.deque.com/axe/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
