import { test, expect } from '@playwright/test';

test.describe('Sprint 0 - Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que la page charge (status 200 déjà vérifié par goto)
    await expect(page).toHaveTitle(/DuoFlow Finance/);
  });

  test('should display login page by default', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier qu'on est sur la page de login
    await expect(page.locator('text=Bon retour !')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    
    // Cliquer sur le lien d'inscription
    await page.click('text=Créer un compte');
    
    // Vérifier qu'on est sur la page d'inscription
    await expect(page.locator('text=Créez votre compte')).toBeVisible();
  });
});
