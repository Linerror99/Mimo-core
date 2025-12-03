import { test, expect } from '@playwright/test';

test.describe('Sprint 0 - Backend Health', () => {
  test('backend health endpoint should respond', async ({ request }) => {
    const response = await request.get('http://localhost:8000/health');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('backend detailed health should check database and redis', async ({ request }) => {
    const response = await request.get('http://localhost:8000/health/detailed');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.checks.database).toBe('ok');
    expect(data.checks.redis).toBe('ok');
  });
});
