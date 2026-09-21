import { expect, test, type Page } from '@playwright/test';

const LISTING_URL = 'https://www.sideprojectors.com/project/95526/taamen-20';

async function completeSetup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.getByRole('heading', { name: /أهلًا|Welcome/ })).toBeVisible({ timeout: 20_000 });
}

test.describe('Acquisition dossier', () => {
  test('keeps pathname on refresh and exposes honest CTAs', async ({ page }) => {
    await page.goto('/acquisition');
    await expect(page).toHaveURL(/\/acquisition$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/acquisition$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Explore the acquisition|استكشف ملف الاستحواذ/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open TAAMEN|افتح TAAMEN/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Technical overview|نظرة تقنية/ }).first()).toBeVisible();
    await expect(page.locator('#acquisition-contact')).toBeVisible();
    await expect(page.locator('a.sideprojectors-badge--inline')).toHaveAttribute('href', LISTING_URL);
    await expect(page.locator('a.sideprojectors-badge--float')).toHaveCount(0);
    await expect(page.getByText(/USD 4,900/)).toBeVisible();
    await expect(page.getByText(/negotiable|قابل للتفاوض/i).first()).toBeVisible();
    await expect(page.getByText(/SALE/)).toHaveCount(0);
  });

  test('RTL and LTR keep the dossier readable', async ({ page }) => {
    await page.goto('/acquisition');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByRole('button', { name: 'English' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { name: /existing football-focused product foundation/i })).toBeVisible();
    await expect(page.getByText(/Cloudflare-observed traffic since launch/)).toBeVisible();
    await expect(page.getByText(/not verified unique human users/i)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThan(32);
  });

  test('desktop sidebar has a quiet Acquisition entry and bottom nav does not', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await completeSetup(page);
    await expect(page.locator('.app-shell.is-desktop-nav')).toBeVisible();
    const sideLink = page.locator('a.acquisition-nav');
    await expect(sideLink).toBeVisible();
    await expect(sideLink).toHaveAttribute('href', '/acquisition');
    await expect(page.locator('.bottom-nav a.acquisition-nav, .bottom-nav [href="/acquisition"]')).toHaveCount(0);
    await expect(page.locator('.bottom-nav-item')).not.toContainText(/Acquisition|الاستحواذ/);
    await sideLink.click();
    await expect(page).toHaveURL(/\/acquisition$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('mobile reaches Acquisition from Settings, not bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await completeSetup(page);
    await expect(page.locator('.app-shell.is-mobile-nav')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('.bottom-nav a.acquisition-nav, .bottom-nav [href="/acquisition"]')).toHaveCount(0);
    await page.locator('.bottom-nav [data-route="settings"]').click();
    await expect(page.getByRole('heading', { name: /Settings|الإعدادات/ })).toBeVisible();
    const settingsLink = page.locator('a[href="/acquisition"]');
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();
    await expect(page).toHaveURL(/\/acquisition$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('hash app routes still work after visiting acquisition', async ({ page }) => {
    await completeSetup(page);
    await page.goto('/acquisition');
    await page.goto('/#home');
    await expect(page).toHaveURL(/\/#home/);
    await expect(page.locator('.app-shell')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/acquisition/);
    await page.goForward();
    await expect(page.locator('.app-shell')).toBeVisible();
  });

  test('FAQ accordion is keyboard reachable', async ({ page }) => {
    await page.goto('/acquisition');
    await page.getByRole('button', { name: 'English' }).first().click();
    const summary = page.locator('#acquisition-faq summary').first();
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#acquisition-faq details').first()).toHaveAttribute('open', '');
  });

  test('viewports 320–1440 keep the dossier without large overflow', async ({ page }) => {
    await page.goto('/acquisition');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow at ${width}`).toBeLessThan(32);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });
});
