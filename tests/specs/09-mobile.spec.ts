import { test, expect } from '@playwright/test';

// Force mobile 390px viewport on any browser project
test.use({ viewport: { width: 390, height: 844 } });

test.describe('Mobile Responsiveness — 390px (iPhone 12)', () => {

  test('viewport width is ≤ 400px', async ({ page }) => {
    await page.goto('/');
    const vp = page.viewportSize();
    expect(vp?.width).toBeLessThanOrEqual(400);
  });

  test('homepage loads and shows Cavero title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Cavero Fragrances/i);
  });

  test('mobile navigation control (hamburger/offcanvas) is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const mobileNav = page.locator(
      '[data-bs-toggle="offcanvas"], [data-bs-toggle="collapse"], .navbar-toggler, [class*="hamburger"]',
    );
    expect(await mobileNav.count()).toBeGreaterThan(0);
  });

  test('shop page renders product cards on mobile', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForSelector('.cavero-product-card', { timeout: 15_000 });
    const count = await page.locator('.cavero-product-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('product detail page is usable on mobile', async ({ page }) => {
    await page.goto('/product/ameer-al-oudh');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, [class*="product-title"], [class*="product-name"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('signup form is accessible on mobile', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[formcontrolname="name"]')).toBeVisible();
    await expect(page.locator('input[formcontrolname="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('signin form is accessible on mobile', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[formcontrolname="email"]')).toBeVisible();
    await expect(page.locator('input[formcontrolname="password"]')).toBeVisible();
  });

  test('cart page loads on mobile without errors', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/error/);
  });

  test('filter sidebar toggle is visible on mobile catalog', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForSelector('.cavero-product-card', { timeout: 15_000 });
    // On mobile, filter sidebar is an offcanvas — a toggle button should exist
    const filterToggle = page.locator(
      '[data-bs-target="#filterSidebar"], button[aria-controls*="filter" i], [class*="filter-toggle"]',
    );
    expect(await filterToggle.count()).toBeGreaterThan(0);
  });
});
