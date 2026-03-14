/**
 * YaadBooks Load Testing with k6
 * 
 * Install k6: brew install k6 (macOS) or https://k6.io/docs/getting-started/installation/
 * Run: k6 run tests/load/load-test.js
 * 
 * This tests how the app performs under concurrent user load.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const dashboardDuration = new Trend('dashboard_duration');
const apiDuration = new Trend('api_duration');

// Test configuration
export const options = {
  // Test scenarios
  scenarios: {
    // Smoke test: 1 user, quick validation
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    
    // Load test: Ramp up to 50 users
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up
        { duration: '5m', target: 50 },  // Stay at 50
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
      startTime: '30s', // Start after smoke test
    },
    
    // Stress test: Push to 100+ users
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      startTime: '10m', // Start after load test
    },
  },
  
  // Thresholds - test fails if these are exceeded
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.05'],     // Less than 5% errors
    errors: ['rate<0.1'],               // Less than 10% custom errors
  },
};

// Base URL - change for different environments
const BASE_URL = __ENV.BASE_URL || 'https://yaadbooks.com';

// Test credentials
const TEST_EMAIL = __ENV.TEST_EMAIL || 'loadtest@yaadbooks.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'LoadTest123!';

// Store auth token between requests
let authToken = null;

// Setup - runs once before all VUs
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  return { timestamp: Date.now() };
}

// Main test function - runs for each VU
export default function () {
  group('Authentication', () => {
    // Login
    const loginStart = Date.now();
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    loginDuration.add(Date.now() - loginStart);
    
    const loginSuccess = check(loginRes, {
      'login successful': (r) => r.status === 200,
      'has access token': (r) => r.json('accessToken') !== undefined,
    });
    
    if (!loginSuccess) {
      errorRate.add(1);
      console.log(`Login failed: ${loginRes.status} - ${loginRes.body}`);
      return;
    }
    
    authToken = loginRes.json('accessToken');
  });

  sleep(1);

  group('Dashboard', () => {
    const dashStart = Date.now();
    const dashRes = http.get(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    
    dashboardDuration.add(Date.now() - dashStart);
    
    check(dashRes, {
      'dashboard loads': (r) => r.status === 200,
      'dashboard loads fast': (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.5);

  group('API Endpoints', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    // Customers API
    const customersStart = Date.now();
    const customersRes = http.get(`${BASE_URL}/api/v1/customers?limit=10`, { headers });
    apiDuration.add(Date.now() - customersStart);
    
    check(customersRes, {
      'customers API works': (r) => r.status === 200,
      'customers response time OK': (r) => r.timings.duration < 1500,
    });

    sleep(0.3);

    // Invoices API
    const invoicesStart = Date.now();
    const invoicesRes = http.get(`${BASE_URL}/api/v1/invoices?limit=10`, { headers });
    apiDuration.add(Date.now() - invoicesStart);
    
    check(invoicesRes, {
      'invoices API works': (r) => r.status === 200,
      'invoices response time OK': (r) => r.timings.duration < 1500,
    });

    sleep(0.3);

    // Products API
    const productsStart = Date.now();
    const productsRes = http.get(`${BASE_URL}/api/v1/products?limit=10`, { headers });
    apiDuration.add(Date.now() - productsStart);
    
    check(productsRes, {
      'products API works': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  group('Heavy Operations', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    // Reports (typically heavier queries)
    const reportsRes = http.get(`${BASE_URL}/api/v1/reports/summary`, { headers });
    check(reportsRes, {
      'reports API works': (r) => r.status === 200 || r.status === 404,
    });

    // Search (can be resource-intensive)
    const searchRes = http.get(`${BASE_URL}/api/v1/search?q=test`, { headers });
    check(searchRes, {
      'search API works': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(1);

  group('Logout', () => {
    const logoutRes = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    
    check(logoutRes, {
      'logout successful': (r) => r.status === 200,
    });
  });

  sleep(2); // Think time between iterations
}

// Teardown - runs once after all VUs complete
export function teardown(data) {
  console.log(`Load test completed. Started at: ${new Date(data.timestamp).toISOString()}`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'tests/load/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  // Simple text summary
  const { metrics } = data;
  const lines = [
    '\n=== YaadBooks Load Test Summary ===\n',
    `Total Requests: ${metrics.http_reqs?.values?.count || 0}`,
    `Failed Requests: ${metrics.http_req_failed?.values?.passes || 0}`,
    `Avg Response Time: ${Math.round(metrics.http_req_duration?.values?.avg || 0)}ms`,
    `95th Percentile: ${Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0)}ms`,
    `Max Response Time: ${Math.round(metrics.http_req_duration?.values?.max || 0)}ms`,
    `\nLogin Avg: ${Math.round(loginDuration?.values?.avg || 0)}ms`,
    `Dashboard Avg: ${Math.round(dashboardDuration?.values?.avg || 0)}ms`,
    `API Avg: ${Math.round(apiDuration?.values?.avg || 0)}ms`,
    '\n===================================\n',
  ];
  return lines.join('\n');
}
