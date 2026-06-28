import { test, expect } from '@playwright/test';
import { SignupPage } from '../pages/signup.page';
import { uniqueEmail } from '../helpers/test-data';

test.describe('Customer Signup', () => {
  let signup: SignupPage;

  test.beforeEach(async ({ page }) => {
    signup = new SignupPage(page);
    await signup.goto();
  });

  test('all form fields are visible', async () => {
    await expect(signup.nameInput).toBeVisible();
    await expect(signup.phoneInput).toBeVisible();
    await expect(signup.emailInput).toBeVisible();
    await expect(signup.passwordInput).toBeVisible();
    await expect(signup.confirmPasswordInput).toBeVisible();
    await expect(signup.privacyCheckbox).toBeVisible();
    await expect(signup.submitBtn).toBeVisible();
  });

  test('referral code field is present', async () => {
    await expect(signup.referralCodeInput).toBeVisible();
  });

  test('submitting empty form shows required field errors', async () => {
    await signup.submitBtn.click();
    const requiredErrors = signup.page.locator('.cavero-field-error', { hasText: /^Required$/ });
    await expect(requiredErrors.first()).toBeVisible();
    // name, phone, email, password, confirmPassword all show "Required"
    expect(await requiredErrors.count()).toBeGreaterThanOrEqual(2);
  });

  test('mismatched passwords shows validation error', async () => {
    await signup.nameInput.fill('Test User');
    await signup.phoneInput.fill('9876543210');
    await signup.emailInput.fill(uniqueEmail());
    await signup.passwordInput.fill('Test@12345');
    await signup.confirmPasswordInput.fill('Different@1');
    await signup.privacyCheckbox.click();
    await signup.submitBtn.click();
    await expect(signup.page.locator('.cavero-field-error', { hasText: /Passwords do not match/i })).toBeVisible();
  });

  test('short password shows minlength error', async () => {
    await signup.passwordInput.fill('abc');
    await signup.passwordInput.blur();
    await expect(signup.page.locator('.cavero-field-error', { hasText: /8 characters/i })).toBeVisible();
  });

  test('successful registration shows success banner', async () => {
    await signup.fillAndSubmit({
      name: 'Playwright User',
      phone: '9876543210',
      email: uniqueEmail(),
      password: 'Test@12345',
      confirmPassword: 'Test@12345',
    });
    await expect(signup.successBanner).toBeVisible({ timeout: 12_000 });
    await expect(signup.successBanner).toContainText(/success|created/i);
  });

  test('duplicate email shows error banner', async () => {
    // Try to register with the admin email (already exists)
    await signup.fillAndSubmit({
      name: 'Duplicate Test',
      phone: '9876543210',
      email: 'admin@cavero.com',
      password: 'Test@12345',
      confirmPassword: 'Test@12345',
    });
    await expect(signup.errorBanner).toBeVisible({ timeout: 10_000 });
  });
});
