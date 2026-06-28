import { Page, Locator } from '@playwright/test';

export class SigninPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly errorBanner: Locator;

  constructor(readonly page: Page) {
    this.emailInput   = page.locator('input[formcontrolname="email"]');
    this.passwordInput = page.locator('input[formcontrolname="password"]');
    this.submitBtn    = page.locator('button[type="submit"]');
    this.errorBanner  = page.locator('.cavero-auth-alert--error');
  }

  async goto() {
    await this.page.goto('/signin');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }
}
