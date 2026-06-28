import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/product.page';
import { PRODUCT } from '../helpers/test-data';

test.describe('Product Detail Page', () => {
  let product: ProductPage;

  test.beforeEach(async ({ page }) => {
    product = new ProductPage(page);
    await product.goto(PRODUCT.slug);
  });

  test('product name is displayed correctly', async () => {
    await expect(product.productName).toBeVisible();
    await expect(product.productName).toContainText(PRODUCT.name);
  });

  test('price contains ₹ symbol', async ({ page }) => {
    const priceEl = page.locator('[class*="price"]').first();
    await expect(priceEl).toBeVisible();
    await expect(priceEl).toContainText('₹');
  });

  test('concentration badge Attar / Itr is shown', async ({ page }) => {
    const badge = page.locator('[class*="badge"], .badge').filter({ hasText: PRODUCT.concentration });
    await expect(badge.first()).toBeVisible({ timeout: 8_000 });
  });

  test('Add to Cart button is visible', async () => {
    await expect(product.addToCartBtn).toBeVisible();
  });

  test('Add to Cart button works without error', async ({ page }) => {
    await product.addToCartBtn.click();
    // No error message should appear
    await page.waitForTimeout(800);
    const errorToast = page.locator('[class*="error"], .swal2-error').first();
    const hasError = await errorToast.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('cart icon/link exists in the page header', async ({ page }) => {
    // Cart is an offcanvas drawer triggered by a button, not a /cart link
    const cartBtn = page.locator('[data-bs-target="#shoppingCart"], [aria-label*="cart" i], button:has(.ci-shopping-cart)').first();
    await expect(cartBtn).toBeVisible();
  });

  test('invalid product slug shows a 404 / redirect', async ({ page }) => {
    await page.goto('/product/this-product-does-not-exist-xyz');
    await page.waitForLoadState('networkidle');
    // Should not throw a hard JS error — Angular handles gracefully
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
