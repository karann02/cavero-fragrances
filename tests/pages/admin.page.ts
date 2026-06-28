import { Page, Locator } from '@playwright/test';

export class AdminPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly errorBox: Locator;

  constructor(readonly page: Page) {
    this.usernameInput = page.locator('input[formcontrolname="username"]');
    this.passwordInput = page.locator('input[formcontrolname="password"]');
    this.submitBtn     = page.locator('button[type="submit"]');
    this.errorBox      = page.locator('.cvr-admin-error');
  }

  async gotoLogin() {
    await this.page.goto('/authentication/signin');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.usernameInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }
}
