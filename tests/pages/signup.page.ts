import { Page, Locator } from '@playwright/test';

export class SignupPage {
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly referralCodeInput: Locator;
  readonly privacyCheckbox: Locator;
  readonly submitBtn: Locator;
  readonly successBanner: Locator;
  readonly errorBanner: Locator;

  constructor(readonly page: Page) {
    this.nameInput            = page.locator('input[formcontrolname="name"]');
    this.phoneInput           = page.locator('input[formcontrolname="phone"]');
    this.emailInput           = page.locator('input[formcontrolname="email"]');
    this.passwordInput        = page.locator('input[formcontrolname="password"]');
    this.confirmPasswordInput = page.locator('input[formcontrolname="confirmPassword"]');
    this.referralCodeInput    = page.locator('input[formcontrolname="referralCode"]');
    this.privacyCheckbox      = page.locator('input[formcontrolname="privacyPolicy"]');
    this.submitBtn            = page.locator('button[type="submit"]');
    this.successBanner        = page.locator('.cavero-auth-alert--success');
    this.errorBanner          = page.locator('.cavero-auth-alert--error');
  }

  async goto() {
    await this.page.goto('/signup');
    await this.page.waitForLoadState('networkidle');
  }

  async fillAndSubmit(data: {
    name: string; phone: string; email: string;
    password: string; confirmPassword: string;
  }) {
    await this.nameInput.fill(data.name);
    await this.phoneInput.fill(data.phone);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.confirmPassword);
    await this.privacyCheckbox.click();
    await this.submitBtn.click();
  }
}
