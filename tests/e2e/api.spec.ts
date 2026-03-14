import { test, expect } from '@playwright/test';

/**
 * API Endpoint Tests
 * Tests all REST API endpoints for correct responses and error handling.
 */

test.describe('API Endpoints', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: process.env.TEST_USER_EMAIL || 'test@yaadbooks.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
      },
    });
    
    const loginData = await loginRes.json();
    authToken = loginData.accessToken;
  });

  const authHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  });

  test.describe('Authentication API', () => {
    test('POST /api/auth/login - valid credentials', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: process.env.TEST_USER_EMAIL || 'test@yaadbooks.com',
          password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
        },
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('user');
    });

    test('POST /api/auth/login - invalid credentials', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'wrong@example.com',
          password: 'wrongpassword',
        },
      });
      
      expect(response.status()).toBe(401);
    });

    test('POST /api/auth/logout', async ({ request }) => {
      const response = await request.post('/api/auth/logout', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
    });

    test('GET /api/auth/me - returns current user', async ({ request }) => {
      const response = await request.get('/api/auth/me', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('email');
    });
  });

  test.describe('Customers API', () => {
    let testCustomerId: string;

    test('GET /api/v1/customers - list customers', async ({ request }) => {
      const response = await request.get('/api/v1/customers', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBeTruthy();
    });

    test('POST /api/v1/customers - create customer', async ({ request }) => {
      const response = await request.post('/api/v1/customers', {
        headers: authHeaders(),
        data: {
          name: `API Test Customer ${Date.now()}`,
          email: `apitest${Date.now()}@example.com`,
          phone: '876-555-0100',
          type: 'customer',
        },
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      testCustomerId = data.id;
    });

    test('GET /api/v1/customers/:id - get single customer', async ({ request }) => {
      if (!testCustomerId) return;
      
      const response = await request.get(`/api/v1/customers/${testCustomerId}`, {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(testCustomerId);
    });

    test('PATCH /api/v1/customers/:id - update customer', async ({ request }) => {
      if (!testCustomerId) return;
      
      const response = await request.patch(`/api/v1/customers/${testCustomerId}`, {
        headers: authHeaders(),
        data: {
          name: 'Updated API Test Customer',
        },
      });
      
      expect(response.status()).toBe(200);
    });

    test('DELETE /api/v1/customers/:id - delete customer', async ({ request }) => {
      if (!testCustomerId) return;
      
      const response = await request.delete(`/api/v1/customers/${testCustomerId}`, {
        headers: authHeaders(),
      });
      
      expect([200, 204]).toContain(response.status());
    });
  });

  test.describe('Invoices API', () => {
    test('GET /api/v1/invoices - list invoices', async ({ request }) => {
      const response = await request.get('/api/v1/invoices', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
    });

    test('GET /api/v1/invoices - with filters', async ({ request }) => {
      const response = await request.get('/api/v1/invoices?status=paid&limit=5', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
    });

    test('GET /api/v1/invoices - with pagination', async ({ request }) => {
      const response = await request.get('/api/v1/invoices?page=1&limit=10', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
    });
  });

  test.describe('Products API', () => {
    test('GET /api/v1/products - list products', async ({ request }) => {
      const response = await request.get('/api/v1/products', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
    });

    test('GET /api/v1/products - search', async ({ request }) => {
      const response = await request.get('/api/v1/products?search=test', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
    });
  });

  test.describe('Expenses API', () => {
    test('GET /api/v1/expenses - list expenses', async ({ request }) => {
      const response = await request.get('/api/v1/expenses', {
        headers: authHeaders(),
      });
      
      expect(response.status()).toBe(200);
    });
  });

  test.describe('Reports API', () => {
    test('GET /api/v1/reports/summary - dashboard summary', async ({ request }) => {
      const response = await request.get('/api/v1/reports/summary', {
        headers: authHeaders(),
      });
      
      // May return 200 or 404 depending on implementation
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Error Handling', () => {
    test('returns 401 without auth token', async ({ request }) => {
      const response = await request.get('/api/v1/customers');
      expect(response.status()).toBe(401);
    });

    test('returns 401 with invalid auth token', async ({ request }) => {
      const response = await request.get('/api/v1/customers', {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('returns 404 for non-existent resource', async ({ request }) => {
      const response = await request.get('/api/v1/customers/non-existent-id-12345', {
        headers: authHeaders(),
      });
      expect([404, 400]).toContain(response.status());
    });

    test('returns 400 for invalid input', async ({ request }) => {
      const response = await request.post('/api/v1/customers', {
        headers: authHeaders(),
        data: {
          // Missing required 'name' field
          email: 'invalid',
        },
      });
      expect([400, 422]).toContain(response.status());
    });
  });

  test.describe('Rate Limiting', () => {
    test('handles rapid requests', async ({ request }) => {
      const promises = [];
      
      // Make 20 rapid requests
      for (let i = 0; i < 20; i++) {
        promises.push(
          request.get('/api/v1/customers', {
            headers: authHeaders(),
          })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Most should succeed, some may be rate limited
      const successCount = responses.filter(r => r.status() === 200).length;
      expect(successCount).toBeGreaterThan(10);
    });
  });
});
