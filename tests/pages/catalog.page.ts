import { Page, Locator } from '@playwright/test';

/**
 * Selectors updated for the Session 22 catalog redesign (cavero-* classes).
 * Product grid: .cavero-product-card · count label: .cavero-found-count
 * Filter sections: button.cavero-filter-header · options: label.cavero-chip
 * (the checkbox input is visually hidden, so we click the label) ·
 * active tags: .cavero-tag · clear: .cavero-tag-clear
 */
export class CatalogPage {
  readonly productCards: Locator;
  readonly productCountLabel: Locator;
  readonly concentrationHeader: Locator;
  readonly familyHeader: Locator;
  readonly genderHeader: Locator;
  readonly filterTags: Locator;
  readonly clearAllFiltersBtn: Locator;

  constructor(readonly page: Page) {
    this.productCards        = page.locator('.cavero-product-card');
    this.productCountLabel   = page.locator('.cavero-found-count');
    this.concentrationHeader = page.locator('button.cavero-filter-header', { hasText: 'Concentration' });
    this.familyHeader        = page.locator('button.cavero-filter-header', { hasText: 'Fragrance Family' });
    this.genderHeader        = page.locator('button.cavero-filter-header', { hasText: 'Gender' });
    this.filterTags          = page.locator('.cavero-tag');
    this.clearAllFiltersBtn  = page.locator('button.cavero-tag-clear');
  }

  async goto() {
    await this.page.goto('/shop');
    await this.page.waitForSelector('.cavero-product-card', { timeout: 15_000 });
  }

  async getProductCount(): Promise<number> {
    const text = await this.productCountLabel.textContent();
    const m = text?.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }

  async checkConcentrationFilter(value: string) {
    await this.openSection(this.concentrationHeader);
    await this.clickChip(value);
    await this.page.waitForTimeout(400);
  }

  async checkFamilyFilter(value: string) {
    await this.openSection(this.familyHeader);
    await this.clickChip(value);
    await this.page.waitForTimeout(400);
  }

  async checkGenderFilter(value: string) {
    await this.openSection(this.genderHeader);
    await this.clickChip(value);
    await this.page.waitForTimeout(400);
  }

  /** Filter sections default to open; only click the header if it's collapsed. */
  private async openSection(header: Locator) {
    const cls = (await header.getAttribute('class')) ?? '';
    if (!cls.includes('open')) {
      await header.click();
      await this.page.waitForTimeout(150);
    }
  }

  /**
   * The chip checkbox is visually hidden (opacity:0 / pointer-events:none), so
   * we click the chip LABEL — native label behaviour toggles the checkbox and
   * fires its change handler. Exact ^value$ match avoids "Men" hitting "Women".
   */
  private async clickChip(value: string) {
    // Match the chip's checkbox by its accessible name — this normalizes the
    // label's whitespace (an anchored ^value$ text regex fails on the padded
    // textContent). The chip sits far down an overflow:hidden sidebar, so we
    // toggle it via a direct DOM click, firing the native change event that
    // Angular's (change) handler listens for.
    const checkbox = this.page.getByRole('checkbox', { name: value, exact: true }).first();
    await checkbox.evaluate((el) => (el as HTMLInputElement).click());
  }
}
