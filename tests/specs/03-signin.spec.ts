import { test, expect } from '@playwright/test';
import { SigninPage } from '../pages/signin.page';
import { uniqueEmail, TEST_CUSTOMER } from '../helpers/test-data';
import { registerCustomerViaApi } from '../helpers/auth.helper';

test.describe('Customer Signin', () => {
  let signin: SigninPage;
  let testEmail: string;

  test.beforeAll(async () => {
    testEmail = uniqueEmail();
    await registerCustomerViaApi(testEmail, TEST_CUSTOMER.password);
  });

  test.beforeEach(async ({ page }) => {
    signin = new SigninPage(page);
    await signin.goto();
  });

  test('signin page has email, password fields and submit button', async () => {
    await expect(signin.emailInput).toBeVisible();
    await expect(signin.passwordInput).toBeVisible();
    await expect(signin.submitBtn).toBeVisible();
  });

  test('admin portal link is present', async ({ page }) => {
    const adminLink = page.locator('a[href*="authentication/signin"], a[routerLink*="authentication/signin"]');
    await expect(adminLink).toBeVisible();
  });

  test('wrong credentials show error message', async () => {
    await signin.login('nobody@nowhere.com', 'wrongpassword');
    await expect(signin.errorBanner).toBeVisible({ timeout: 8_000 });
  });

  test('valid credentials log in and redirect away from /signin', async ({ page }) => {
    await signin.login(testEmail, TEST_CUSTOMER.password);
    await page.waitForURL('/', { timeout: 12_000 });
    expect(page.url()).not.toContain('/signin');
  });

  test('after login JWT is stored in localStorage', async ({ page }) => {
    await signin.login(testEmail, TEST_CUSTOMER.password);
    await page.waitForURL('/', { timeout: 12_000 });
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeTruthy();
    expect(token!.split('.').length).toBe(3); // valid JWT has 3 parts
  });
});
