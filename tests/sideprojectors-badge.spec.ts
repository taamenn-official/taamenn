import { expect, test, type Locator, type Page } from '@playwright/test';

const LISTING_URL = 'https://www.sideprojectors.com/project/95526/taamen-20';

function listingBadge(page: Page) {
  return page.locator('a.sideprojectors-badge');
}

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

async function expectNoOverlap(first: Locator, second: Locator, label: string) {
  if (!await first.isVisible() || !await second.isVisible()) return;
  const a = await first.boundingBox();
  const b = await second.boundingBox();
  if (!a || !b) return;
  expect(boxesOverlap(a, b), label).toBeFalsy();
}

async function completeSetup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.getByRole('heading', { name: /أهلًا|Welcome/ })).toBeVisible({ timeout: 20_000 });
}

async function settleShell(page: Page, width: number) {
  if (width > 900) await expect(page.locator('.app-shell.is-desktop-nav')).toBeVisible();
  else await expect(page.locator('.app-shell.is-mobile-nav')).toBeVisible();
}

test.describe('SideProjectors listing badge', () => {
  test('is hidden on profile setup and public share routes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /First name|الاسم الأول/ })).toBeVisible();
    await expect(listingBadge(page)).toHaveCount(0);

    await page.goto('/share/profile/not-a-valid-token');
    await expect(listingBadge(page)).toHaveCount(0);

    await page.goto('/share/match/not-a-valid-token');
    await expect(listingBadge(page)).toHaveCount(0);
  });

  test('main shell uses one official listing link', async ({ page }) => {
    await completeSetup(page);
    const badge = listingBadge(page);
    await expect(badge).toHaveCount(1);
    await expect(badge).toHaveClass(/sideprojectors-badge--float/);
    await expect(badge).toHaveAttribute('href', LISTING_URL);
    await expect(badge).toHaveAttribute('target', '_blank');
    await expect(badge).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(badge).toHaveAttribute('aria-label', /SideProjectors/);
    await expect(badge.locator('img')).toHaveAttribute('alt', /SideProjectors/);
    await expect(page.locator('a.sideprojectors-badge--inline')).toHaveCount(0);
  });

  test('acquisition uses the same component as an inline CTA', async ({ page }) => {
    await page.goto('/acquisition');
    const badge = listingBadge(page);
    await expect(badge).toHaveCount(1);
    await expect(badge).toHaveClass(/sideprojectors-badge--inline/);
    await expect(badge).toHaveAttribute('href', LISTING_URL);
    await expect(badge).toHaveAttribute('target', '_blank');
    await expect(badge).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.locator('a.sideprojectors-badge--float')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /live demo|جرّب/i })).toBeVisible();
  });

  test('viewports keep the badge on-screen without covering chrome', async ({ page }) => {
    await completeSetup(page);

    for (const width of [320, 360, 390, 430, 768, 900, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/#home');
      await settleShell(page, width);
      const badge = listingBadge(page);
      await expect(badge, `badge visible at ${width}`).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow at ${width}`).toBeLessThan(32);

      const box = await badge.boundingBox();
      expect(box, `badge box at ${width}`).toBeTruthy();
      if (box) {
        expect(box.x, `badge left at ${width}`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `badge right at ${width}`).toBeLessThanOrEqual(width + 1);
        expect(box.y, `badge top at ${width}`).toBeGreaterThanOrEqual(0);
      }

      await expectNoOverlap(badge, page.locator('header.topbar'), `badge vs topbar at ${width}`);
      const sidebar = page.locator('.app-shell > .sidebar');
      if (await sidebar.isVisible()) {
        await expectNoOverlap(badge, sidebar, `badge vs sidebar at ${width}`);
      }
      const bottomNav = page.locator('.app-shell .bottom-nav');
      if (await bottomNav.isVisible()) {
        await expectNoOverlap(badge, bottomNav, `badge vs bottom nav at ${width}`);
        const home = bottomNav.locator('[data-route="home"]');
        await expect(home).toBeVisible();
        await home.click();
        await expect(page.locator('.app-shell')).toBeVisible();
      }
    }
  });

  test('RTL and LTR keep the desktop badge off the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await completeSetup(page);
    await settleShell(page, 1280);

    const badge = listingBadge(page);
    const sidebar = page.locator('.app-shell > .sidebar');
    await expect(sidebar).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expectNoOverlap(badge, sidebar, 'RTL badge vs sidebar');

    await page.getByRole('button', { name: 'English' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(sidebar).toBeVisible();
    await expectNoOverlap(badge, sidebar, 'LTR badge vs sidebar');
  });
});
