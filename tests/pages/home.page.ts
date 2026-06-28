import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly logo: Locator;
  readonly categoryLinks: Locator;
  readonly productCards: Locator;

  constructor(readonly page: Page) {
    this.logo = page.locator('img[alt*="Cavero"]').first();
    this.categoryLinks = page.locator('nav a[href*="shop-category"]');
    this.productCards = page.locator('.cavero-product-card');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }
}
