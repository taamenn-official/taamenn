import { expect, test, type Locator, type Page } from '@playwright/test';

const PREVIEW = 'http://127.0.0.1:5174';

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

async function boot(page: Page, language: 'ar' | 'en', collapsed = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ language, collapsed }) => {
    localStorage.setItem('taamen-language', language);
    localStorage.setItem('taamen-sidebar-collapsed', collapsed ? 'true' : 'false');
  }, { language, collapsed });
  await page.goto('/');
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.getByRole('heading', { name: /أهلًا|Welcome/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
}

async function expectNoHorizontalOverflow(page: Page) {
  const delta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(delta).toBeLessThanOrEqual(1);
}

async function waitForSidebar(page: Page, collapsed: boolean) {
  await expect.poll(async () => (await page.locator('.sidebar').boundingBox())?.width ?? 0).toBeLessThan(collapsed ? 90 : 400);
  await expect.poll(async () => (await page.locator('.sidebar').boundingBox())?.width ?? 0).toBeGreaterThan(collapsed ? 60 : 200);
}

async function expectColumnFits(page: Page, dir: 'ltr' | 'rtl') {
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const sidebar = await page.locator('.sidebar').boundingBox();
  const main = await page.locator('.main-content').boundingBox();
  expect(sidebar).toBeTruthy();
  expect(main).toBeTruthy();
  if (!sidebar || !main || !viewport) return;
  expect(main.x).toBeGreaterThanOrEqual(-1);
  expect(main.x + main.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(sidebar.y).toBeLessThanOrEqual(1);
  if (dir === 'ltr') {
    expect(sidebar.x).toBeLessThanOrEqual(1);
    expect(main.x).toBeGreaterThanOrEqual(sidebar.width - 2);
  } else {
    expect(sidebar.x + sidebar.width).toBeGreaterThanOrEqual(viewport.width - 2);
    expect(main.x + main.width).toBeLessThanOrEqual(sidebar.x + 2);
  }
  await expectNoHorizontalOverflow(page);
}

async function expectIndicatorCoversActive(nav: Locator) {
  const pill = nav.locator('.nav-active-indicator');
  const active = nav.locator('.is-active');
  await expect(pill).toBeVisible();
  await expect(active).toBeVisible();
  await expect.poll(async () => {
    const pillBox = await pill.boundingBox();
    const activeBox = await active.boundingBox();
    if (!pillBox || !activeBox || activeBox.height === 0) return 0;
    const x = Math.max(0, Math.min(pillBox.x + pillBox.width, activeBox.x + activeBox.width) - Math.max(pillBox.x, activeBox.x));
    const y = Math.max(0, Math.min(pillBox.y + pillBox.height, activeBox.y + activeBox.height) - Math.max(pillBox.y, activeBox.y));
    return (x * y) / (activeBox.width * activeBox.height);
  }).toBeGreaterThan(0.7);
}

async function expectTooltipSide(page: Page, dir: 'ltr' | 'rtl') {
  const item = page.locator('.sidebar.is-collapsed .side-nav .nav-item').first();
  const tooltip = item.locator('.tooltip');
  const sidebar = page.locator('.sidebar');
  const before = await sidebar.boundingBox();
  const beforeScroll = await page.evaluate(() => document.documentElement.scrollWidth);
  await item.hover();
  await expect(tooltip).toHaveCSS('opacity', '1');
  const button = await item.boundingBox();
  const tip = await tooltip.boundingBox();
  const after = await sidebar.boundingBox();
  expect(button).toBeTruthy();
  expect(tip).toBeTruthy();
  expect(before).toBeTruthy();
  expect(after).toBeTruthy();
  if (!button || !tip || !before || !after) return;
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
  if (dir === 'ltr') expect(tip.x).toBeGreaterThanOrEqual(button.x + button.width - 2);
  else expect(tip.x + tip.width).toBeLessThanOrEqual(button.x + 2);
  await item.focus();
  await expect(tooltip).toHaveCSS('opacity', '1');
  const afterScroll = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(Math.abs(afterScroll - beforeScroll)).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
}

test.beforeEach(({ }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'viewports are set inside each test');
});

const VERIFICATION_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7265269139254398';

async function expectVerificationScriptOnce(page: Page) {
  const scripts = page.locator(`script[src="${VERIFICATION_SRC}"]`);
  await expect(scripts).toHaveCount(1);
  await expect(page.locator('#taamen-adsense')).toHaveCount(0);
  await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
}

test('default build shows the verification script once and no visible ad', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page, 'en');
  await expect(page.locator('.ad-slot')).toHaveCount(0);
  await expectVerificationScriptOnce(page);
  for (const hash of ['tactical', 'settings', 'support', 'match-center', 'profile']) {
    await page.goto(`/#${hash}`);
    await expect(page.locator('.ad-slot')).toHaveCount(0);
    await expectVerificationScriptOnce(page);
  }
  await page.goto('/acquisition');
  await expect(page.locator('.ad-slot')).toHaveCount(0);
  await expectVerificationScriptOnce(page);
});

test('preview slots stay on home, stadiums, and archive only', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('taamen-language', 'en'));
  await page.goto(`${PREVIEW}/`);
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.locator('.ad-slot')).toHaveCount(1);
  await expect(page.locator('.ad-slot-preview')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Advertisement' })).toBeVisible();
  await expect(page.locator('.ad-slot a, .ad-slot button')).toHaveCount(0);
  await expectVerificationScriptOnce(page);

  await page.goto(`${PREVIEW}/#stadiums`);
  await expect(page.locator('.ad-slot')).toHaveCount(1);
  await page.goto(`${PREVIEW}/#archive`);
  await expect(page.locator('.ad-slot')).toHaveCount(1);

  for (const hash of ['tactical', 'settings', 'support', 'match-center', 'profile']) {
    await page.goto(`${PREVIEW}/#${hash}`);
    await expect(page.locator('.ad-slot')).toHaveCount(0);
  }
  await page.goto(`${PREVIEW}/acquisition`);
  await expect(page.locator('.ad-slot')).toHaveCount(0);
  await expectVerificationScriptOnce(page);
});

test('desktop LTR expanded and collapsed tooltip and indicator stay inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page, 'en');
  await expect(page.locator('.app-shell.is-desktop-nav')).toBeVisible();
  await expectColumnFits(page, 'ltr');
  await expectIndicatorCoversActive(page.locator('.side-nav'));

  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  await expect(page.locator('.sidebar.is-collapsed')).toBeVisible();
  await waitForSidebar(page, true);
  await expectColumnFits(page, 'ltr');
  await expectTooltipSide(page, 'ltr');
  await expectIndicatorCoversActive(page.locator('.side-nav'));

  await page.getByRole('button', { name: 'Expand navigation' }).click();
  await expect(page.locator('.sidebar.is-collapsed')).toHaveCount(0);
  await waitForSidebar(page, false);
  await expectColumnFits(page, 'ltr');
  await expectIndicatorCoversActive(page.locator('.side-nav'));
});

test('desktop RTL Arabic collapsed tooltip faces the content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page, 'ar', true);
  await expect(page.locator('.app-shell.is-desktop-nav')).toBeVisible();
  await expect(page.locator('.sidebar.is-collapsed')).toBeVisible();
  await waitForSidebar(page, true);
  await expectColumnFits(page, 'rtl');
  await expectTooltipSide(page, 'rtl');
  await expectIndicatorCoversActive(page.locator('.side-nav'));

  await page.getByRole('button', { name: 'توسيع القائمة' }).click();
  await expect(page.locator('.sidebar.is-collapsed')).toHaveCount(0);
  await waitForSidebar(page, false);
  await expectColumnFits(page, 'rtl');
  await expectIndicatorCoversActive(page.locator('.side-nav'));

  await page.getByRole('button', { name: 'التبديل إلى English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expectColumnFits(page, 'ltr');
  await expectIndicatorCoversActive(page.locator('.side-nav'));

  await page.setViewportSize({ width: 1280, height: 800 });
  await expectColumnFits(page, 'ltr');
  await expectIndicatorCoversActive(page.locator('.side-nav'));
});

test('mobile preview does not cover the bottom nav or overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('taamen-language', 'en'));
  await page.goto(`${PREVIEW}/`);
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.locator('.app-shell.is-mobile-nav')).toBeVisible();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.bottom-nav-item')).toHaveCount(6);
  const ad = page.locator('.ad-slot');
  const nav = page.locator('.bottom-nav');
  await expect(ad).toBeVisible();
  await expect(nav).toBeVisible();
  const adBox = await ad.boundingBox();
  const navBox = await nav.boundingBox();
  expect(adBox).toBeTruthy();
  expect(navBox).toBeTruthy();
  if (adBox && navBox) expect(boxesOverlap(adBox, navBox)).toBeFalsy();
  const slot = await page.evaluate(() => {
    const el = document.querySelector('.ad-slot');
    if (!el) return null;
    const style = getComputedStyle(el);
    return { width: style.width, maxWidth: style.maxWidth, boxSizing: style.boxSizing, position: style.position };
  });
  expect(slot?.boxSizing).toBe('border-box');
  expect(slot?.position).not.toBe('fixed');
  await expectNoHorizontalOverflow(page);

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await expectNoHorizontalOverflow(page);
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
  await expectNoHorizontalOverflow(page);
});

test('the page scrolls while the outer scrollbar is hidden and the drawer still scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await boot(page, 'en');
  await page.goto('/#stadiums');
  await expect(page.locator('.stadium-card').first()).toBeVisible();
  await page.locator('.page-heading h1').click();
  const scrollbar = await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth);
  expect(scrollbar).toBe('none');
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.keyboard.press('Home');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);

  await page.getByRole('button', { name: 'Notifications' }).click();
  const drawer = page.locator('.notification-drawer');
  await expect(drawer).toBeVisible();
  const scrolled = await drawer.evaluate(node => {
    const style = getComputedStyle(node);
    const spacer = document.createElement('div');
    spacer.style.height = '1800px';
    node.appendChild(spacer);
    node.scrollTop = 360;
    const top = node.scrollTop;
    spacer.remove();
    return { top, overflowY: style.overflowY, scrollbarWidth: style.scrollbarWidth };
  });
  expect(scrolled.overflowY).toBe('auto');
  expect(scrolled.scrollbarWidth).not.toBe('none');
  expect(scrolled.top).toBeGreaterThan(0);
  await expectNoHorizontalOverflow(page);
});
