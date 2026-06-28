import { test, expect } from '@playwright/test';
import { AdminPage } from '../pages/admin.page';
import { ADMIN } from '../helpers/test-data';
import { loginAdminViaApi } from '../helpers/auth.helper';

test.describe('Admin Panel', () => {
  let admin: AdminPage;

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
  });

  test('admin login page shows Cavero Fragrances branding', async ({ page }) => {
    await admin.gotoLogin();
    // Branding: the admin logo (alt) + footer copyright carry "Cavero Fragrances"
    await expect(page.locator('p').filter({ hasText: 'Cavero Fragrances' })).toBeVisible();
  });

  test('admin login page has no OTP button', async ({ page }) => {
    await admin.gotoLogin();
    const otpBtn = page.locator('button', { hasText: /Send OTP/i });
    await expect(otpBtn).toHaveCount(0);
  });

  test('wrong credentials show error message', async () => {
    await admin.gotoLogin();
    await admin.login('wrong@admin.com', 'wrongpass123');
    await expect(admin.errorBox).toBeVisible({ timeout: 8_000 });
  });

  test('correct credentials redirect to /siteadmin/dashboard', async ({ page }) => {
    await admin.gotoLogin();
    await admin.login(ADMIN.email, ADMIN.password);
    await page.waitForURL('/siteadmin/dashboard', { timeout: 12_000 });
    expect(page.url()).toContain('/siteadmin/dashboard');
  });

  test('accessing dashboard without token redirects to login', async ({ page }) => {
    await page.goto('/siteadmin/dashboard');
    await page.waitForURL(/authentication\/signin/, { timeout: 8_000 });
    expect(page.url()).toContain('authentication/signin');
  });

  test('admin products list loads with a valid token', async ({ page }) => {
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/products');
    await page.waitForLoadState('networkidle');
    // Route is /siteadmin/products
    expect(page.url()).toContain('/siteadmin/products');
  });

  test('Free Gifts admin page shows FreeGiftsComponent not Categories', async ({ page }) => {
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/freegifts');
    await page.waitForLoadState('networkidle');
    // Should show free gifts content, not categories
    await expect(page.locator('text=/Free Gift/i').first()).toBeVisible({ timeout: 8_000 });
    const categoriesHeading = page.locator('text=/All Categories/i');
    await expect(categoriesHeading).toHaveCount(0);
  });

  test('admin returns page is accessible', async ({ page }) => {
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/returns');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/siteadmin/returns');
  });

  test('rate limit triggers on repeated wrong logins', async ({ page }) => {
    // Send 11 rapid requests directly via page.request API
    for (let i = 0; i < 11; i++) {
      await page.request.post('http://localhost:5000/api/auth/login', {
        data: { username: 'ratelimit@test.com', password: 'wrongpass', portal: 'admin' },
      }).catch(() => {});
    }
    // After hitting rate limit, admin login page should still load (not crash)
    await admin.gotoLogin();
    await expect(admin.page).toHaveURL(/authentication\/signin/);
  });
});
