import { test, expect } from '@playwright/test';
import { CartPage } from '../pages/cart.page';
import { FREE_GIFT_1_THRESHOLD, FREE_GIFT_2_THRESHOLD } from '../helpers/test-data';

test.describe('Cart & Free Gifts', () => {
  let cart: CartPage;

  test.beforeEach(async ({ page }) => {
    cart = new CartPage(page);
  });

  test('empty cart page loads without errors', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/error/);
    // With no cart injected the page shows the empty-state (Session 24 redesign)
    await expect(page.locator('.cavero-empty-title').filter({ hasText: /empty/i })).toBeVisible({ timeout: 8_000 });
  });

  test('injected product appears on cart page', async ({ page }) => {
    await cart.gotoWithCart(1299, 1);
    // Product name appears in the main cart list (.cavero-item-name)
    await expect(page.locator('.cavero-item-name').filter({ hasText: 'Ameer Al Oudh' }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('subtotal is displayed correctly for injected item', async ({ page }) => {
    await cart.gotoWithCart(1299, 1);
    // Cart uses the ₹ symbol with number:'1.2-2' → ₹1,299.00
    const subtotalEl = page.locator('text=/₹.*1[,.]299/').first();
    await expect(subtotalEl).toBeVisible({ timeout: 8_000 });
  });

  test('free gift progress bar appears below threshold', async ({ page }) => {
    await cart.gotoWithCart(FREE_GIFT_1_THRESHOLD - 200); // below ₹999
    const progressArea = page.locator('.cavero-gift-progress-wrap').first();
    await expect(progressArea).toBeVisible({ timeout: 8_000 });
  });

  test('free gift Attar Sample unlocked at ₹999', async ({ page }) => {
    await cart.gotoWithCart(FREE_GIFT_1_THRESHOLD, 1);
    const unlocked = page.locator('.cavero-gift-unlocked').first();
    await expect(unlocked).toBeVisible({ timeout: 8_000 });
    await expect(unlocked).toContainText(/Attar Sample/i);
  });

  test('both free gifts unlocked at ₹1999', async ({ page }) => {
    await cart.gotoWithCart(FREE_GIFT_2_THRESHOLD, 1);
    const unlocked = page.locator('.cavero-gift-unlocked');
    await expect(unlocked).toHaveCount(2, { timeout: 8_000 });
  });

  test('checkout button is present and points to /checkout', async ({ page }) => {
    await cart.gotoWithCart(1299);
    const checkoutLink = page.locator('a[href="/checkout"]').first();
    await expect(checkoutLink).toBeVisible({ timeout: 8_000 });
    const href = await checkoutLink.getAttribute('href');
    expect(href).toBe('/checkout');
  });
});
