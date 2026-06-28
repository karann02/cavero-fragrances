import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly zipCodeInput: Locator;
  readonly codRadio: Locator;
  readonly onlineRadio: Locator;
  readonly placeOrderBtn: Locator;
  readonly phoneError: Locator;
  readonly zipError: Locator;

  constructor(readonly page: Page) {
    this.firstNameInput = page.locator('input[formcontrolname="firstName"]');
    this.lastNameInput  = page.locator('input[formcontrolname="lastName"]');
    this.phoneInput     = page.locator('input[formcontrolname="phone"]');
    this.emailInput     = page.locator('input[formcontrolname="email"]');
    this.addressInput   = page.locator('input[formcontrolname="address"]');
    this.cityInput      = page.locator('input[formcontrolname="city"]');
    this.zipCodeInput   = page.locator('input[formcontrolname="zipCode"]');
    // The radio inputs are visually-hidden; the clickable/visible target is the
    // payment card label (Session 25 redesign).
    this.codRadio       = page.locator('.cavero-payment-card', { hasText: 'Cash on Delivery' });
    this.onlineRadio    = page.locator('.cavero-payment-card', { hasText: 'Online Payment' });
    this.placeOrderBtn  = page.locator('button[type="submit"]', { hasText: /Place Order/i });
    this.phoneError     = page.locator('.cavero-field-error', { hasText: /Indian mobile/i });
    this.zipError       = page.locator('.cavero-field-error', { hasText: /PIN code/i });
  }

  async goto() {
    await this.page.goto('/checkout');
    await this.page.waitForLoadState('domcontentloaded');
    // Brief settle for Angular to initialize the form
    await this.page.waitForTimeout(800);
  }

  async fillShipping(data: {
    firstName: string; lastName: string; phone: string;
    email: string; address: string; city: string; zipCode: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.phoneInput.fill(data.phone);
    await this.emailInput.fill(data.email);
    await this.addressInput.fill(data.address);
    await this.cityInput.fill(data.city);
    await this.zipCodeInput.fill(data.zipCode);
  }
}
