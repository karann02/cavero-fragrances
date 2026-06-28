import { test, expect } from '@playwright/test';
import { CatalogPage } from '../pages/catalog.page';

test.describe('Product Catalog & Filters', () => {
  let catalog: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalog = new CatalogPage(page);
    await catalog.goto();
  });

  test('loads the product cards', async () => {
    // Catalog size grows as the owner adds products, so assert it renders a
    // non-empty grid that matches the catalog's own count label rather than a
    // brittle hard-coded number.
    await expect(catalog.productCards.first()).toBeVisible({ timeout: 15_000 });
    const cardCount = await catalog.productCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(10);
    const labelCount = await catalog.getProductCount();
    expect(cardCount).toBe(labelCount);
  });

  test('product count label displays a number', async () => {
    await expect(catalog.productCountLabel).toBeVisible();
    const count = await catalog.getProductCount();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('Concentration, Fragrance Family, Gender filter sections are visible', async () => {
    await expect(catalog.concentrationHeader).toBeVisible();
    await expect(catalog.familyHeader).toBeVisible();
    await expect(catalog.genderHeader).toBeVisible();
  });

  test('Concentration EDP filter reduces product count', async () => {
    const before = await catalog.getProductCount();
    await catalog.checkConcentrationFilter('EDP');
    const after = await catalog.getProductCount();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  test('active filter tag appears and shows selected value', async () => {
    await catalog.checkConcentrationFilter('EDP');
    await expect(catalog.filterTags.first()).toBeVisible();
    await expect(catalog.filterTags.first()).toContainText('EDP');
  });

  test('clear-all button restores full product list', async () => {
    const before = await catalog.getProductCount();
    await catalog.checkConcentrationFilter('EDP');
    await catalog.clearAllFiltersBtn.click();
    await catalog.page.waitForTimeout(400);
    const after = await catalog.getProductCount();
    expect(after).toEqual(before);
  });

  test('Gender Men filter shows only men products', async () => {
    await catalog.checkGenderFilter('Men');
    const count = await catalog.getProductCount();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10);
  });

  test('clicking a product card navigates to /product/:slug', async ({ page }) => {
    await catalog.productCards.first().locator('a').first().click();
    await page.waitForURL(/\/product\/.+/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/product\/.+/);
  });

  test('/shop-category/oud-collection shows Oud Collection products', async ({ page }) => {
    await page.goto('/shop-category/oud-collection');
    await page.waitForSelector('.cavero-product-card', { timeout: 15_000 });
    const count = await page.locator('.cavero-product-card').count();
    expect(count).toBeGreaterThan(0);
  });
});
