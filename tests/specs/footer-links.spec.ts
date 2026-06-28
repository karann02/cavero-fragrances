import { test, expect } from '@playwright/test';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Navigate to homepage, scroll to footer, click a nav link by exact text */
async function clickFooterNavLink(page: any, label: string | RegExp) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800); // let Angular render footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);

  // Target the link columns specifically — avoids the CTA button at the top
  const link = page
    .locator('footer .accordion-item a, footer ul li a')
    .filter({ hasText: label })
    .first();
  await expect(link).toBeVisible({ timeout: 8000 });
  await link.click();
}

/** Wait for the CMS content area to appear and return its inner HTML */
async function waitForCmsContent(page: any) {
  // .cms-content is inside *ngIf="!loading && pageContent" — wait for it
  const content = page.locator('.cms-content');
  await expect(content).toBeVisible({ timeout: 12000 });
  const html = await content.innerHTML();
  return html;
}

/** Read the CMS page heading. The title is now rendered from the admin-managed
 *  content itself (the component's duplicate <h1> was removed), so read the first
 *  heading inside .cms-content. */
async function getCmsHeading(page: any) {
  const heading = page.locator('.cms-content h1, .cms-content h2, .cms-content h3').first();
  await expect(heading).toBeVisible({ timeout: 12000 });
  return (await heading.textContent())?.trim() ?? '';
}

// ── Information links ─────────────────────────────────────────────────────────

const INFORMATION_LINKS = [
  { label: 'Privacy Policy',       slug: 'privacy-policy',      title: 'Privacy Policy' },
  { label: 'Terms & Conditions',   slug: 'terms-and-conditions', title: 'Terms and Conditions' },
  { label: 'Shipping Policy',      slug: 'shipping-policy',     title: 'Shipping Policy' },
  { label: 'Return & Refund',      slug: 'return-refund-policy', title: 'Return' },
  { label: 'Cancellation Policy',  slug: 'cancellation-policy', title: 'Cancellation Policy' },
  { label: 'COD Policy',           slug: 'cod-policy',          title: 'COD' },
  { label: 'Fragrance Disclaimer', slug: 'fragrance-disclaimer', title: 'Fragrance Disclaimer' },
];

test.describe('Footer — Information links (7 policy pages)', () => {
  for (const link of INFORMATION_LINKS) {
    test(`"${link.label}" → /cms/${link.slug}`, async ({ page }) => {
      await clickFooterNavLink(page, link.label);

      await expect(page).toHaveURL(new RegExp(`/cms/${link.slug}`), { timeout: 10000 });

      const html = await waitForCmsContent(page);
      expect(html.length).toBeGreaterThan(100);

      const heading = await getCmsHeading(page);
      expect(heading.length).toBeGreaterThan(2);
      expect(heading).not.toMatch(/page not found/i);

      // No warning alert visible
      await expect(page.locator('.alert-warning')).not.toBeVisible();

      console.log(`  ✓ ${link.label}: heading="${heading}", content=${html.length} chars`);
    });
  }
});

// ── Company links ─────────────────────────────────────────────────────────────

test.describe('Footer — Company links', () => {
  test('"About Us" → /cms/about-us', async ({ page }) => {
    await clickFooterNavLink(page, 'About Us');
    await expect(page).toHaveURL(/\/cms\/about-us/, { timeout: 10000 });
    const html = await waitForCmsContent(page);
    expect(html.length).toBeGreaterThan(100);
    const heading = await getCmsHeading(page);
    console.log(`  ✓ About Us: heading="${heading}", content=${html.length} chars`);
  });

  test('"Contact Us" nav link → /cms/contact', async ({ page }) => {
    await clickFooterNavLink(page, 'Contact Us');
    await expect(page).toHaveURL(/\/cms\/contact/, { timeout: 10000 });
    const html = await waitForCmsContent(page);
    expect(html.length).toBeGreaterThan(100);
    const heading = await getCmsHeading(page);
    console.log(`  ✓ Contact Us: heading="${heading}", content=${html.length} chars`);
  });

  test('"Contact us" CTA button → /cms/contact', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const cta = page.locator('footer .cavero-footer-btn');
    await expect(cta).toBeVisible({ timeout: 8000 });
    await cta.click();
    await expect(page).toHaveURL(/\/cms\/contact/, { timeout: 10000 });
    const html = await waitForCmsContent(page);
    expect(html.length).toBeGreaterThan(100);
    console.log(`  ✓ CTA "Contact us" → /cms/contact, content=${html.length} chars`);
  });

  test('"FAQ" link is present in footer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const link = page.locator('footer .accordion-item a, footer ul li a').filter({ hasText: /^FAQ$/i }).first();
    await expect(link).toBeVisible({ timeout: 8000 });
    console.log('  ✓ FAQ link visible in footer');
  });
});

// ── Categories ────────────────────────────────────────────────────────────────

test.describe('Footer — Categories (dynamic)', () => {
  test('Category links load from API', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    const catLinks = page.locator('footer li a[href*="shop-category"]');
    const count = await catLinks.count();
    console.log(`  Footer category links: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ── CMS sidebar ───────────────────────────────────────────────────────────────

test.describe('CMS page sidebar — all 9 links', () => {
  test('All 9 policy links appear in sidebar', async ({ page }) => {
    await page.goto('/cms/privacy-policy', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const sidebarLinks = [
      'About Us', 'Privacy Policy', 'Terms', 'Shipping',
      'Return', 'Cancellation', 'COD', 'Disclaimer', 'Contact'
    ];
    for (const text of sidebarLinks) {
      const link = page.locator('aside nav a').filter({ hasText: new RegExp(text, 'i') });
      await expect(link).toBeVisible({ timeout: 5000 });
      console.log(`  ✓ Sidebar has "${text}"`);
    }
  });
});
