import { expect, test, type Page } from '@playwright/test';

async function completeSetup(page: Page, name = 'Omar') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill(name);
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.getByRole('heading', { name: /أهلًا|Welcome/ })).toBeVisible({ timeout: 20_000 });
}

async function useEnglish(page: Page) {
  const toggle = page.getByRole('button', { name: 'English' });
  if (await toggle.count()) await toggle.first().click();
}

test('classic home shows the archive hero and not the dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeSetup(page);
  await useEnglish(page);
  await expect(page.locator('.home-hero-single')).toBeVisible();
  await expect(page.locator('.home-stats')).toBeVisible();
  await expect(page.locator('.home-venues-card')).toBeVisible();
  await expect(page.locator('.archive-preview-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome Omar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Latest matches' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore archive' })).toBeVisible();
  await expect(page.locator('.home-actions').getByRole('button', { name: 'Profile' })).toBeVisible();
  await expect(page.locator('.home-dashboard')).toHaveCount(0);
  await expect(page.locator('.ta-widget')).toHaveCount(0);
  await expect(page.locator('.quick-action')).toHaveCount(0);
  await expect(page.locator('.home-next')).toHaveCount(0);
  await expect(page.locator('.ad-slot')).toHaveCount(0);
});

test('archive action opens the archive and the bottom nav stays at six items', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeSetup(page);
  await useEnglish(page);
  await page.getByRole('button', { name: 'Explore archive' }).click();
  await expect(page.getByRole('heading', { name: 'Archive', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#archive/);
  await expect(page.locator('.bottom-nav-item')).toHaveCount(6);
  const active = page.locator('.bottom-nav-item.is-active');
  await expect(active).toHaveAttribute('aria-current', 'page');
});

test('Arabic stays RTL and English stays LTR in light and dark', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await completeSetup(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await useEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('iOS guidance is compact and does not pretend to prompt', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  await completeSetup(page);
  await useEnglish(page);
  const banner = page.locator('.install-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Add TAAMEN to your Home Screen');
  await expect(banner).toContainText('Share → Add to Home Screen');
  await expect(banner.getByRole('button', { name: 'Install' })).toHaveCount(0);
  await page.evaluate(() => { document.scrollingElement?.scrollTo(0, document.scrollingElement.scrollHeight); });
  const gap = await page.evaluate(() => {
    const bar = document.querySelector('.install-banner')?.getBoundingClientRect();
    const content = document.querySelector('.archive-preview-panel')?.getBoundingClientRect();
    if (!bar || !content) return null;
    return bar.top - (content.top + content.height);
  });
  expect(gap).not.toBeNull();
  expect(gap ?? -1).toBeGreaterThanOrEqual(0);
  await banner.getByRole('button', { name: 'Close' }).click();
  await expect(banner).toHaveCount(0);
  await context.close();
});

test('update banner can be dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeSetup(page);
  await useEnglish(page);
  await page.evaluate(() => window.dispatchEvent(new Event('taamen-sw-update')));
  const banner = page.locator('.update-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Update available');
  const overlap = await page.evaluate(() => {
    const bar = document.querySelector('.update-banner')?.getBoundingClientRect();
    const theme = document.querySelector('.theme-toggle')?.getBoundingClientRect();
    if (!bar || !theme) return 1;
    const x = Math.min(bar.right, theme.right) - Math.max(bar.left, theme.left);
    const y = Math.min(bar.bottom, theme.bottom) - Math.max(bar.top, theme.top);
    return x > 0 && y > 0 ? y : 0;
  });
  expect(overlap).toBe(0);
  await banner.getByRole('button', { name: 'Dismiss update' }).click();
  await expect(banner).toBeHidden();
});

test('tactical focus hides the bottom nav and a token still drags', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeSetup(page);
  await useEnglish(page);
  await page.goto('/#tactical');
  await expect(page.getByRole('heading', { name: /Tactical Board/ })).toBeVisible();
  await page.getByRole('button', { name: 'Focus pitch' }).click();
  await expect(page.locator('.bottom-nav')).toBeHidden();
  const token = page.locator('.player-token').first();
  const before = await token.evaluate((el) => (el as HTMLElement).style.left);
  const box = await token.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 36, box.y + box.height / 2 + 24);
  await page.mouse.up();
  const after = await token.evaluate((el) => (el as HTMLElement).style.left);
  expect(after).not.toBe(before);
  await expect(page.locator('.pitch')).toBeVisible();
});

test('focus-visible remains and 360px does not overflow under the nav', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await completeSetup(page);
  await useEnglish(page);
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus-visible');
  await expect(focused).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const nav = await page.locator('.bottom-nav').boundingBox();
  const hero = await page.locator('.home-hero-single').boundingBox();
  expect(nav && hero && hero.y + hero.height <= (nav.y ?? 0) + 1).toBeTruthy();
});

test('share, acquisition, and legal routes still open', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /سياسة الخصوصية|Privacy Policy/ })).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /الشروط|Terms/ })).toBeVisible();
  await page.goto('/acquisition');
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.goto('/share/match/not-a-valid-token');
  await expect(page.getByRole('heading', { name: /غير صالح|Invalid/ })).toBeVisible();
});
