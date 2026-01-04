/**
 * E2E Tests for Authentication Features (Sprint 1)
 * 
 * User Stories:
 * - US-1.1: User can create an account (register)
 * - US-6.1: User can logout
 * - US-6.2: User can update profile information
 * - US-6.2b: User can change password
 */
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPass123!',
  firstName: 'John',
  lastName: 'Doe'
};

const UPDATED_USER = {
  firstName: 'Jane',
  lastName: 'Smith'
};

const NEW_PASSWORD = 'NewPass456!';

test.describe('Authentication Flow - Sprint 1', () => {
  
  /**
   * US-1.1: User can create an account
   * 
   * Acceptance Criteria:
   * - User fills registration form with email, password, first name, last name
   * - Password must meet strength requirements (8+ chars, uppercase, lowercase, number)
   * - On success, user is redirected to dashboard
   * - User account is created in database
   */
  test('US-1.1: User can register new account', async ({ page }) => {
    // Capture console messages and errors for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    // Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);
    
    // Accept terms and conditions - use Radix UI checkbox role
    await page.click('button[role="checkbox"]#terms');
    
    // Wait a bit for state update
    await page.waitForTimeout(500);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Verify user is logged in (check for user info display)
    await expect(page.getByRole('heading', { name: `Welcome, ${TEST_USER.firstName}` })).toBeVisible();
  });
  
  /**
   * Test registration validation
   */
  test('Registration fails with weak password', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="email"]', 'weak@example.com');
    await page.fill('input[name="password"]', 'weak'); // Too weak
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    
    await page.click('button[type="submit"]');
    
    // Should show error message or remain on page (frontend/backend validation)
    await page.waitForTimeout(1000);
    // Should still be on register page
    await expect(page).toHaveURL('/register');
  });
  
  test('Registration fails with duplicate email', async ({ page }) => {
    // First registration
    await page.goto('/register');
    const email = `duplicate_${Date.now()}@example.com`;
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', 'First');
    await page.fill('input[name="lastName"]', 'User');
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard', { timeout: 5000 });

    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    
    // Logout - Click "Plus" button in bottom nav, then Déconnexion
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByText('Déconnexion', { exact: true }).click();
    await page.waitForURL('/login');    // Try to register again with same email
    await page.goto('/register');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', 'Second');
    await page.fill('input[name="lastName"]', 'User');
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=/email/i')).toBeVisible();
  });
  
  /**
   * Login functionality (required for other tests)
   */
  test('User can login with valid credentials', async ({ page }) => {
    // Create account first
    await page.goto('/register');
    const email = `login_${Date.now()}@example.com`;
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Logout - Click "Plus" button in bottom nav, then Déconnexion
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByText('Déconnexion', { exact: true }).click();
    await page.waitForURL('/login');    // Login with same credentials
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });
    await expect(page.locator(`text=${TEST_USER.firstName}`)).toBeVisible();
  });
  
  test('Login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');
    
    // Should show error - use first() to handle toast + form error
    await expect(page.locator('text=/invalid.*credentials/i').first()).toBeVisible();
    
    // Should remain on login page
    await expect(page).toHaveURL('/login');
  });
  
  /**
   * US-6.1: User can logout
   * 
   * Acceptance Criteria:
   * - Logged-in user clicks logout button
   * - User is redirected to login page
   * - User cannot access protected pages without re-login
   * - Access token is invalidated
   */
  test('US-6.1: User can logout', async ({ page }) => {
    // Create account and login
    const email = `logout_${Date.now()}@example.com`;
    await page.goto('/register');
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Click logout button - Click "Plus" button in bottom nav
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByText('Déconnexion', { exact: true }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/login', { timeout: 5000 });    // Try to access protected page (dashboard)
    await page.goto('/dashboard');
    
    // Should redirect back to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
  
  /**
   * US-6.2: User can update profile information
   * 
   * Acceptance Criteria:
   * - User navigates to settings/profile page
   * - User can update first name and last name
   * - Changes are saved to database
   * - Updated name is displayed in UI
   */
  test('US-6.2: User can update profile information', async ({ page }) => {
    // Create account
    const email = `update_${Date.now()}@example.com`;
    await page.goto('/register');
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings/profile page - Click "Plus" button then Profil
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByText('Profil', { exact: true }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 5000 });    // Update first and last name
    await page.fill('input[name="firstName"]', UPDATED_USER.firstName);
    await page.fill('input[name="lastName"]', UPDATED_USER.lastName);
    
    // Save changes
    await page.click('button[type="submit"]:has-text("Save")');
    
    // Should show success message
    await expect(page.locator('text=/successfully.*updated/i')).toBeVisible({ timeout: 5000 });
    
    // Verify updated name is displayed
    await expect(page.locator(`text=${UPDATED_USER.firstName}`)).toBeVisible();
    
    // Navigate back to dashboard and verify persistence
    await page.goto('/dashboard');
    await expect(page.locator(`text=${UPDATED_USER.firstName}`)).toBeVisible();
  });
  
  /**
   * US-6.2b: User can change password
   * 
   * Acceptance Criteria:
   * - User navigates to settings/change password page
   * - User enters old password and new password
   * - New password must meet strength requirements
   * - User can login with new password
   * - Old password no longer works
   */
  test('US-6.2b: User can change password', async ({ page }) => {
    // Create account
    const email = `changepass_${Date.now()}@example.com`;
    await page.goto('/register');
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings - Click "Plus" button then Profil
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByText('Profil', { exact: true }).click();
    await expect(page).toHaveURL(/\/settings/);    // Click on change password tab/section
    await page.click('button:has-text("Change Password"), a:has-text("Change Password")');
    
    // Fill password change form
    await page.fill('input[name="oldPassword"]', TEST_USER.password);
    await page.fill('input[name="newPassword"]', NEW_PASSWORD);
    await page.fill('input[name="confirmPassword"]', NEW_PASSWORD);
    
    // Submit password change
    await page.click('button[type="submit"]:has-text("Change Password")');
    
    // Should show success message
    await expect(page.locator('text=/password.*changed.*successfully/i')).toBeVisible({ timeout: 5000 });
    
    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login');
    
    // Try to login with old password (should fail)
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible();
    
    // Login with new password (should succeed)
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', NEW_PASSWORD);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });
  });
  
  test('Change password fails with incorrect old password', async ({ page }) => {
    // Create account
    const email = `wrongpass_${Date.now()}@example.com`;
    await page.goto('/register');
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);
    await page.click('button[role="checkbox"]#terms');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings - Click "Plus" button then Profil
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByText('Profil', { exact: true }).click();
    await page.click('button:has-text("Change Password"), a:has-text("Change Password")');    // Enter wrong old password
    await page.fill('input[name="oldPassword"]', 'WrongOldPass123!');
    await page.fill('input[name="newPassword"]', NEW_PASSWORD);
    await page.fill('input[name="confirmPassword"]', NEW_PASSWORD);
    
    await page.click('button[type="submit"]:has-text("Change Password")');
    
    // Should show error
    await expect(page.locator('text=/old.*password.*incorrect/i')).toBeVisible();
  });
});
