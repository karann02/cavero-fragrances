import { test, expect } from '@playwright/test';
import { loginAdminViaApi } from '../helpers/auth.helper';

/**
 * Admin dialog UI — verifies the brand-green theme, scrollable body, and
 * sticky footer (Save always reachable) on the product add/edit popup.
 */
test.describe('Admin product dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await loginAdminViaApi(page);
    await page.goto('/siteadmin/products');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
  });

  async function openAddDialog(page: any) {
    await page.locator('button:has-text("Add"), button[aria-label="Add product"]').first().click();
    await expect(page.locator('.addContainer')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(800);
  }

  test('opens with the dark brand theme (not white)', async ({ page }) => {
    await openAddDialog(page);
    const bg = await page.locator('.mat-mdc-dialog-surface').evaluate(
      (el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor
    );
    // Dark gradient/teal — must NOT be plain white
    expect(bg).not.toContain('rgb(255, 255, 255)');
    const headerBg = await page.locator('.addContainer .modalHeader').evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(headerBg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('body scrolls and the Save button stays reachable (sticky footer)', async ({ page }) => {
    await openAddDialog(page);
    const content = page.locator('[mat-dialog-content]').first();

    const scrollable = await content.evaluate(
      (el) => el.scrollHeight > el.clientHeight + 5
    );
    expect(scrollable).toBe(true);

    // scroll to the very bottom
    await content.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(400);

    // the primary submit button must be visible after scrolling
    const submit = page.locator('.example-button-row button[type="submit"]').first();
    await expect(submit).toBeVisible();
    await expect(submit).toBeInViewport();
  });

  test('closes via the X button', async ({ page }) => {
    await openAddDialog(page);
    await page.locator('.modal-close-button').first().click();
    await expect(page.locator('.addContainer')).toHaveCount(0, { timeout: 6000 });
  });
});
