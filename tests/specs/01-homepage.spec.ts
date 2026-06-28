import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';

test.describe('Homepage', () => {
  let home: HomePage;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.goto();
  });

  test('page title contains Cavero Fragrances', async ({ page }) => {
    await expect(page).toHaveTitle(/Cavero Fragrances/i);
  });

  test('Cavero logo is visible', async () => {
    await expect(home.logo).toBeVisible();
  });

  test('4 category links are shown', async () => {
    await expect(home.categoryLinks).toHaveCount(4, { timeout: 10_000 });
  });

  test('GA4 tag G-6LJGCTNVNK is in page source', async ({ page }) => {
    const html = await page.content();
    expect(html).toContain('G-6LJGCTNVNK');
  });

  test('favicon references the Cavero icon not yuvik', async ({ page }) => {
    const href = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(href).toMatch(/cavero-(icon|logo)/);
    expect(href).not.toContain('yuvik');
  });

  test('og:site_name meta is present', async ({ page }) => {
    const content = await page.locator('meta[property="og:site_name"]').getAttribute('content');
    expect(content).toBeTruthy();
  });
});
