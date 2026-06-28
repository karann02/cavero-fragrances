import { Page, Locator } from '@playwright/test';

export class ProductPage {
  readonly productName: Locator;
  readonly addToCartBtn: Locator;
  readonly sizeButtons: Locator;
  readonly badges: Locator;

  constructor(readonly page: Page) {
    this.productName  = page.locator('h1, .product-name, [class*="product-title"]').first();
    this.addToCartBtn = page.locator('button', { hasText: /Add to Cart/i }).first();
    this.sizeButtons  = page.locator('.size-btn');
    this.badges       = page.locator('[class*="badge"]');
  }

  async goto(slug: string) {
    await this.page.goto(`/product/${slug}`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectSize(index: number) {
    await this.sizeButtons.nth(index).click();
  }
}
