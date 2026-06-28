import { Page, Locator } from '@playwright/test';
import { makeGuestCart, GUEST_CART_KEY, USER_CART_PREFIX } from '../helpers/test-data';

export class CartPage {
  readonly freeGiftProgress: Locator;
  readonly freeGiftUnlocked: Locator;
  readonly checkoutBtn: Locator;

  constructor(readonly page: Page) {
    this.freeGiftProgress = page.locator('.cavero-gift-progress-wrap').first();
    this.freeGiftUnlocked = page.locator('.cavero-gift-unlocked').first();
    this.checkoutBtn = page.locator(
      'a[href="/checkout"], a[routerLink="/checkout"], button',
      { hasText: /checkout/i },
    ).first();
  }

  async goto() {
    await this.page.goto('/cart');
    await this.page.waitForLoadState('networkidle');
  }

  /** Inject a guest cart directly into localStorage then navigate */
  async gotoWithCart(price = 1299, quantity = 1) {
    const cart = makeGuestCart(price, quantity);
    // Navigate to the app origin first so localStorage is set on the right domain
    await this.page.goto('/');
    await this.page.evaluate(
      ([key, c]) => localStorage.setItem(key as string, JSON.stringify(c)),
      [GUEST_CART_KEY, cart],
    );
    await this.goto();
  }

  /** Inject a logged-in user cart (requires userId from decoded token) */
  async injectUserCart(userId: string, price = 1299, quantity = 1) {
    const cart = makeGuestCart(price, quantity);
    const key = `${USER_CART_PREFIX}${userId}`;
    await this.page.evaluate(
      ([k, c]) => localStorage.setItem(k as string, JSON.stringify(c)),
      [key, cart],
    );
  }
}
