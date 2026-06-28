import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/checkout.page';
import { uniqueEmail, TEST_CUSTOMER, API_AUTH } from '../helpers/test-data';
import {
  registerCustomerViaApi,
  loginCustomerViaApi,
  getUserIdFromToken,
} from '../helpers/auth.helper';
import { CartPage } from '../pages/cart.page';

let testEmail: string;

test.describe('Checkout', () => {
  let checkout: CheckoutPage;
  let cartPage: CartPage;

  test.beforeAll(async () => {
    testEmail = uniqueEmail();
    await registerCustomerViaApi(testEmail, TEST_CUSTOMER.password);
  });

  const MOCK_CART = {
    items: [{ id: '999', product_id: '1', product_name: 'Ameer Al Oudh',
      product_image: '/uploads/products/ameer-al-oudh-1.jpg',
      price: 1299, quantity: 1, stock: 50, total: 1299, item_type: 'product' }],
    subtotal: 1299, total_items: 1, delivery_fee: 0, total: 1299,
    free_delivery_threshold: 999, coupon_discount: 0,
    coupon_code: null, coupon_id: null, applied_coupon: null
  };

  /** Helper: inject cart into localStorage AND intercept API so fetchServerCart also returns it */
  async function setupCartWithItem(page: any) {
    // Fetch a real product ID from the backend so the order API can find it
    let realProductId = '1';
    try {
      const resp = await page.request.get(`${API_AUTH}/products?limit=1`);
      const data = await resp.json();
      const first = data?.data?.[0] ?? data?.[0];
      if (first?.id) realProductId = String(first.id);
    } catch { /* use fallback '1' */ }

    const cartWithRealId = {
      ...MOCK_CART,
      items: [{ ...MOCK_CART.items[0], product_id: realProductId }],
    };

    // Intercept the server cart GET so fetchServerCart() returns our mock
    await page.route(/\/api\/auth\/cart$/, async (route: any) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: cartWithRealId })
        });
      } else {
        await route.continue();
      }
    });
    // Reload so Angular re-initializes with auth
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Also inject into localStorage so it survives page.goto('/checkout')
    const userId = await page.evaluate(() => {
      const token = localStorage.getItem('authToken');
      if (!token) return '';
      try { const p = JSON.parse(atob(token.split('.')[1])); return String(p.id ?? ''); } catch { return ''; }
    });
    if (userId) {
      await page.evaluate(([key, cart]: [string, object]) => {
        localStorage.setItem(key, JSON.stringify(cart));
      }, [`user_cart_v2_${userId}`, cartWithRealId]);
    }
  }

  test.beforeEach(async ({ page }) => {
    checkout = new CheckoutPage(page);
    cartPage = new CartPage(page);

    // Boot the Angular app and authenticate (simple — no cart needed for validation tests)
    await page.goto('/');
    await loginCustomerViaApi(page, testEmail, TEST_CUSTOMER.password);
  });

  test('checkout page renders all required form fields', async () => {
    await checkout.goto();
    await expect(checkout.firstNameInput).toBeVisible();
    await expect(checkout.lastNameInput).toBeVisible();
    await expect(checkout.phoneInput).toBeVisible();
    await expect(checkout.emailInput).toBeVisible();
    await expect(checkout.addressInput).toBeVisible();
    await expect(checkout.cityInput).toBeVisible();
    await expect(checkout.zipCodeInput).toBeVisible();
    await expect(checkout.codRadio).toBeVisible();
    await expect(checkout.onlineRadio).toBeVisible();
    await expect(checkout.placeOrderBtn).toBeVisible();
  });

  test('invalid Indian phone (starts with 1) shows error', async () => {
    await checkout.goto();
    await checkout.phoneInput.fill('1234567890');
    await checkout.phoneInput.blur();
    await expect(checkout.phoneError).toBeVisible({ timeout: 5_000 });
  });

  test('phone with letters shows error', async () => {
    await checkout.goto();
    await checkout.phoneInput.fill('abc1234567');
    await checkout.phoneInput.blur();
    await expect(checkout.phoneError).toBeVisible({ timeout: 5_000 });
  });

  test('5-digit PIN code shows error', async () => {
    await checkout.goto();
    await checkout.zipCodeInput.fill('12345');
    await checkout.zipCodeInput.blur();
    await expect(checkout.zipError).toBeVisible({ timeout: 5_000 });
  });

  test('valid phone 9876543210 passes validation', async () => {
    await checkout.goto();
    await checkout.phoneInput.fill('9876543210');
    await checkout.phoneInput.blur();
    await expect(checkout.phoneError).not.toBeVisible();
  });

  test('valid 6-digit PIN 395001 passes validation', async () => {
    await checkout.goto();
    await checkout.zipCodeInput.fill('395001');
    await checkout.zipCodeInput.blur();
    await expect(checkout.zipError).not.toBeVisible();
  });

  test('COD: complete order placement redirects to /order-success', async ({ page }) => {
    // Set up cart with items via route intercept (cart service fetches from server)
    await setupCartWithItem(page);
    // Debug: intercept order POST to see what items are being sent
    let capturedOrderItems: unknown = null;
    await page.route('**/api/orders', async (route) => {
      const body = route.request().postDataJSON();
      capturedOrderItems = body?.items;
      await route.continue();
    });
    await checkout.goto();
    await checkout.fillShipping({
      firstName: 'Playwright',
      lastName: 'Tester',
      phone: '9876543210',
      email: testEmail,
      address: '12 Rose Lane, Adajan',
      city: 'Surat',
      zipCode: '395001',
    });
    // Click the COD payment card — labels trigger proper Angular form change events
    await page.keyboard.press('Escape');
    await page.locator('.cavero-payment-card', { hasText: 'Cash on Delivery' }).click();
    await checkout.placeOrderBtn.click();

    // If items were empty, order won't be placed — assert items were sent
    await page.waitForURL(/\/order-success\/\d+/, { timeout: 20_000 });
    expect(capturedOrderItems).not.toBeNull();
    expect(Array.isArray(capturedOrderItems) && (capturedOrderItems as unknown[]).length).toBeTruthy();
    expect(page.url()).toMatch(/\/order-success\/\d+/);
    // Order success page should confirm the order
    await expect(page.locator('text=/order/i').first()).toBeVisible();
  });

  test('Online Payment: /api/payment/create-order is called with correct data', async ({ page }) => {
    // Set up cart with items via route intercept
    await setupCartWithItem(page);

    // Mock Razorpay SDK so loadRazorpayScript() resolves immediately without CDN fetch
    await page.addInitScript(() => {
      (window as any).Razorpay = function(opts: any) {
        return { open: () => {}, on: () => {} };
      };
    });

    // Also intercept /api/payment/config so getPublicKey() returns a known key fast
    await page.route('**/api/payment/config', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ key: 'rzp_test_SdknSR5NK48L65', mode: 'test' }),
      });
    });

    let capturedBody: unknown = null;
    const createOrderPromise = new Promise<void>((resolve) => {
      page.route('**/api/payment/create-order', async (route) => {
        capturedBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            order: { id: 'order_pw_test', amount: 129900, currency: 'INR' },
            key: 'rzp_test_SdknSR5NK48L65',
          }),
        });
        resolve();
      });
    });

    await checkout.goto();
    await checkout.fillShipping({
      firstName: 'Playwright',
      lastName: 'Tester',
      phone: '9876543210',
      email: testEmail,
      address: '12 Rose Lane',
      city: 'Surat',
      zipCode: '395001',
    });
    // Click the Online payment card — labels trigger proper Angular form change events
    await page.keyboard.press('Escape');
    await page.locator('.cavero-payment-card', { hasText: 'Online Payment' }).click();
    await checkout.placeOrderBtn.click();
    // Wait for the actual network call rather than a fixed timeout
    await Promise.race([createOrderPromise, page.waitForTimeout(8_000)]);

    expect(capturedBody).not.toBeNull();
  });
});
