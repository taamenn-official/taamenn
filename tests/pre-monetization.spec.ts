import { expect, test, type Page } from '@playwright/test';

const AHREFS = 'https://analytics.ahrefs.com/analytics.js';

async function blockAhrefs(page: Page) {
  await page.route('https://analytics.ahrefs.com/**', (route) => route.abort());
}

async function completeSetup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await blockAhrefs(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.getByRole('heading', { name: /أهلًا|Welcome/ })).toBeVisible({ timeout: 20_000 });
}

function ahrefsScripts(page: Page) {
  return page.locator(`script[src="${AHREFS}"]`);
}

async function waitForStoredAnalytics(page: Page, enabled: boolean) {
  await page.waitForFunction(async (expected) => {
    const row = await new Promise<{ analytics?: boolean } | undefined>((resolve, reject) => {
      const request = indexedDB.open('taamen-2');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const get = db.transaction('settings', 'readonly').objectStore('settings').get('privacy');
        get.onerror = () => reject(get.error);
        get.onsuccess = () => {
          db.close();
          resolve(get.result as { analytics?: boolean } | undefined);
        };
      };
    });
    return (row?.analytics === true) === expected;
  }, enabled);
}

test('analytics is off until Settings enables it, and navigation does not duplicate it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await completeSetup(page);
  await expect(ahrefsScripts(page)).toHaveCount(0);

  await page.goto('/acquisition');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(ahrefsScripts(page)).toHaveCount(0);

  await page.goto('/#settings');
  await page.getByRole('checkbox', { name: 'التحليلات' }).check();
  await waitForStoredAnalytics(page, true);
  await expect(ahrefsScripts(page)).toHaveCount(1);

  await page.goto('/#archive');
  await expect(ahrefsScripts(page)).toHaveCount(1);
  await page.goto('/#home');
  await expect(ahrefsScripts(page)).toHaveCount(1);

  await page.reload();
  await expect(ahrefsScripts(page)).toHaveCount(1);

  await page.goto('/#settings');
  await page.getByRole('checkbox', { name: 'التحليلات' }).uncheck();
  await waitForStoredAnalytics(page, false);
  await page.reload();
  await expect(ahrefsScripts(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a failed Ahrefs request leaves the app usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await completeSetup(page);
  await page.goto('/#settings');
  await page.getByRole('checkbox', { name: 'التحليلات' }).check();
  await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible();
  await page.goto('/#tactical');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('privacy and terms are public, bilingual, and reloadable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'سياسة الخصوصية', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'تحليلات اختيارية' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'سياسة الخصوصية', level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://taamenn.com/privacy');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Optional analytics' })).toBeVisible();

  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms & Conditions', level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://taamenn.com/terms');
  await page.getByRole('button', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'الشروط والأحكام', level: 1 })).toBeVisible();
});

test('legal pages stay within the viewport from 320px through desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
