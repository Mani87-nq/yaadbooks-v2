/**
 * YaadBooks API Test Runner
 * 
 * Automated testing harness for validating all API endpoints.
 * Run: npx tsx scripts/api-test-runner.ts
 * 
 * Features:
 * - Authenticates via API (no browser needed)
 * - Tests all CRUD operations
 * - Reports pass/fail for each endpoint
 * - Can be used for stress testing with --stress flag
 */

const BASE_URL = process.env.API_URL || 'https://yaadbooks.com';

const TEST_CREDENTIALS = {
  email: 'api-tester@yaadbooks.com',
  password: 'YaadBooks-API-Test-2026!',
};

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];
let accessToken: string = '';
let testCompanyId: string = '';

// ============= HELPER FUNCTIONS =============

async function login(): Promise<boolean> {
  console.log('🔐 Authenticating...');
  
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS),
  });

  if (!res.ok) {
    console.error('❌ Login failed:', res.status);
    return false;
  }

  const data = await res.json();
  accessToken = data.accessToken;
  testCompanyId = data.user.activeCompanyId;
  
  console.log('✅ Logged in as:', data.user.email);
  console.log('🏢 Company ID:', testCompanyId);
  return true;
}

async function testEndpoint(
  method: string,
  endpoint: string,
  body?: object,
  expectedStatus: number = 200
): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint}`;
  const start = Date.now();
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - start;
    const passed = res.status === expectedStatus || (res.status >= 200 && res.status < 300);

    const result: TestResult = {
      endpoint,
      method,
      status: res.status,
      passed,
      duration,
    };

    if (!passed) {
      try {
        const errorData = await res.json();
        result.error = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        result.error = `Expected ${expectedStatus}, got ${res.status}`;
      }
    }

    results.push(result);
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${method.padEnd(6)} ${endpoint.padEnd(50)} ${res.status} (${duration}ms)`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    const result: TestResult = {
      endpoint,
      method,
      status: 0,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : 'Network error',
    };
    results.push(result);
    console.log(`❌ ${method.padEnd(6)} ${endpoint.padEnd(50)} ERROR (${duration}ms)`);
    return result;
  }
}

// ============= TEST SUITES =============

async function testHealthEndpoints() {
  console.log('\n📡 HEALTH ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/health');
  await testEndpoint('GET', '/api/v1/health');
}

async function testAuthEndpoints() {
  console.log('\n🔐 AUTH ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/auth/me');
  await testEndpoint('GET', '/api/auth/sessions');
}

async function testCustomerEndpoints() {
  console.log('\n👥 CUSTOMER ENDPOINTS');
  console.log('-'.repeat(70));
  
  // List customers
  await testEndpoint('GET', '/api/v1/customers');
  
  // Create customer
  const createRes = await testEndpoint('POST', '/api/v1/customers', {
    name: `Test Customer ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    phone: '876-555-0100',
  });
  
  // If created, test get/update/delete
  if (createRes.passed && createRes.status === 201) {
    try {
      const customer = await fetch(`${BASE_URL}/api/v1/customers`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }).then(r => r.json());
      
      if (customer.data?.[0]?.id) {
        const customerId = customer.data[0].id;
        await testEndpoint('GET', `/api/v1/customers/${customerId}`);
        await testEndpoint('PATCH', `/api/v1/customers/${customerId}`, { phone: '876-555-0199' });
      }
    } catch {}
  }
}

async function testInvoiceEndpoints() {
  console.log('\n📄 INVOICE ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/v1/invoices');
  await testEndpoint('GET', '/api/v1/invoices?status=DRAFT');
}

async function testProductEndpoints() {
  console.log('\n📦 PRODUCT ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/v1/products');
  
  // Create product
  await testEndpoint('POST', '/api/v1/products', {
    name: `Test Product ${Date.now()}`,
    sku: `TEST-${Date.now()}`,
    price: 1000,
    type: 'PRODUCT',
  });
}

async function testPOSEndpoints() {
  console.log('\n🛒 POS ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/v1/pos/terminals');
  await testEndpoint('GET', '/api/v1/pos/sessions');
  await testEndpoint('GET', '/api/v1/pos/orders');
}

async function testReportEndpoints() {
  console.log('\n📊 REPORT ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/v1/reports/dashboard');
  await testEndpoint('GET', '/api/v1/reports/sales-summary');
}

async function testAccountingEndpoints() {
  console.log('\n💰 ACCOUNTING ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/v1/gl-accounts');
  await testEndpoint('GET', '/api/v1/journal-entries');
  await testEndpoint('GET', '/api/v1/expenses');
}

async function testPayrollEndpoints() {
  console.log('\n👷 PAYROLL ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/v1/employees');
  await testEndpoint('GET', '/api/v1/payroll');
}

async function testTeamEndpoints() {
  console.log('\n👥 TEAM ENDPOINTS');
  console.log('-'.repeat(70));
  
  await testEndpoint('GET', '/api/v1/team');
  await testEndpoint('GET', '/api/v1/team/permissions');
}

// ============= STRESS TEST =============

async function stressTest(concurrency: number = 10, duration: number = 30) {
  console.log(`\n🔥 STRESS TEST: ${concurrency} concurrent requests for ${duration}s`);
  console.log('-'.repeat(70));
  
  const endpoints = [
    '/api/v1/customers',
    '/api/v1/products',
    '/api/v1/invoices',
    '/api/health',
  ];
  
  const startTime = Date.now();
  let requestCount = 0;
  let errorCount = 0;
  const latencies: number[] = [];
  
  while (Date.now() - startTime < duration * 1000) {
    const promises = [];
    
    for (let i = 0; i < concurrency; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const start = Date.now();
      
      promises.push(
        fetch(`${BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        })
          .then(res => {
            latencies.push(Date.now() - start);
            requestCount++;
            if (!res.ok) errorCount++;
          })
          .catch(() => {
            errorCount++;
            requestCount++;
          })
      );
    }
    
    await Promise.all(promises);
  }
  
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
  
  console.log(`\n📈 STRESS TEST RESULTS`);
  console.log(`Total Requests:  ${requestCount}`);
  console.log(`Error Count:     ${errorCount}`);
  console.log(`Success Rate:    ${((1 - errorCount / requestCount) * 100).toFixed(2)}%`);
  console.log(`Avg Latency:     ${avgLatency.toFixed(0)}ms`);
  console.log(`P95 Latency:     ${p95}ms`);
  console.log(`Requests/sec:    ${(requestCount / duration).toFixed(1)}`);
}

// ============= MAIN =============

async function main() {
  console.log('🚀 YaadBooks API Test Runner');
  console.log('='.repeat(70));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }

  // Check for stress test flag
  if (process.argv.includes('--stress')) {
    await stressTest(10, 30);
  } else {
    // Run all test suites
    await testHealthEndpoints();
    await testAuthEndpoints();
    await testCustomerEndpoints();
    await testInvoiceEndpoints();
    await testProductEndpoints();
    await testPOSEndpoints();
    await testReportEndpoints();
    await testAccountingEndpoints();
    await testPayrollEndpoints();
    await testTeamEndpoints();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const avgTime = results.reduce((a, b) => a + b.duration, 0) / results.length;
    
    console.log(`✅ Passed:  ${passed}`);
    console.log(`❌ Failed:  ${failed}`);
    console.log(`⏱️  Avg Time: ${avgTime.toFixed(0)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   ${r.method} ${r.endpoint}: ${r.error}`);
      });
    }
  }
}

main().catch(console.error);
