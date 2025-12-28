/**
 * Debug test for registration checkbox issue
 */
import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:5000' });

test('Debug: Check checkbox interaction', async ({ page }) => {
  // Capture console
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  
  await page.goto('/register');
  
  // Fill form
  await page.fill('input[name="email"]', 'debug@test.com');
  await page.fill('input[name="password"]', 'TestPass123!');
  await page.fill('input[name="confirmPassword"]', 'TestPass123!');
  await page.fill('input[name="firstName"]', 'Debug');
  await page.fill('input[name="lastName"]', 'Test');
  
  // Take screenshot before clicking checkbox
  await page.screenshot({ path: 'test-results/before-checkbox.png' });
  
  // Try different ways to click the checkbox
  console.log('Trying to click checkbox...');
  
  // Method 1: Click by role
  try {
    await page.click('button[role="checkbox"]#terms', { timeout: 2000 });
    console.log('Method 1 (role) succeeded');
  } catch (e) {
    console.log('Method 1 (role) failed:', e.message);
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/after-checkbox.png' });
  
  // Check if checkbox is checked
  const isChecked = await page.locator('button[role="checkbox"]#terms').getAttribute('data-state');
  console.log('Checkbox state:', isChecked);
  
  // Try to submit
  console.log('Trying to submit form...');
  await page.click('button[type="submit"]');
  
  // Wait and see what happens
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/after-submit.png' });
  
  console.log('Current URL:', page.url());
});
