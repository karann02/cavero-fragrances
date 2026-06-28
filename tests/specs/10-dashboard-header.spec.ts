import { test, expect } from '@playwright/test';
import { loginAdminViaApi } from '../helpers/auth.helper';

/**
 * Verifies the shared admin top header (the white navbar + CAVERO logo) is
 * fully removed across the admin panel (desktop), and the dashboard keeps its
 * own header row.
 */
test.describe('Admin — shared white header removed (desktop)', () => {
  test('header/navbar is NOT visible on the dashboard', async ({ page }) => {
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-admin-dashboard')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('.navbar')).toBeHidden();
    await expect(page.locator('app-header .logo-name')).toBeHidden();
    await expect(page.locator('app-header img.user_img_brand')).toHaveCount(0);
  });

  test('header/navbar is NOT visible on the products page', async ({ page }) => {
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.navbar')).toBeHidden();
  });

  test('header/navbar is NOT visible on the orders page', async ({ page }) => {
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.navbar')).toBeHidden();
  });

  test('dashboard keeps its own header row (title + New Product)', async ({ page }) => {
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/dashboard');
    await page.waitForLoadState('networkidle');
    // Atelier shell: page title lives in the topbar; primary CTA in the hero row
    await expect(page.locator('.cv-title', { hasText: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.cv-btn', { hasText: 'New Product' })).toBeVisible();
  });
});
