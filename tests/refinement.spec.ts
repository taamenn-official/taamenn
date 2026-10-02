import { expect, test, type Page } from '@playwright/test';

async function completeSetup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.getByRole('heading', { name: /أهلًا|Welcome/ })).toBeVisible({ timeout: 20_000 });
}

async function useEnglish(page: Page) {
  const toggle = page.getByRole('button', { name: 'English' });
  if (await toggle.count()) await toggle.first().click();
}

test('stadium navigation uses a goal icon on desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await completeSetup(page);
  await useEnglish(page);
  await expect(page.locator('.side-nav [data-route="stadiums"] .lucide-goal')).toBeVisible();
  await expect(page.locator('.home-venues-card .lucide-goal')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.bottom-nav [data-route="stadiums"] .lucide-goal')).toBeVisible();
  await page.goto('/#stadiums');
  await expect(page.locator('.stadiums-page .lucide-goal, .page-heading .lucide-goal').first()).toBeVisible();
});

test('contact actions share one layout and the real destinations', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await completeSetup(page);
  await useEnglish(page);
  await page.goto('/#support');
  const actions = page.locator('.contact-action');
  await expect(actions).toHaveCount(3);
  await expect(actions.nth(0)).toHaveAttribute('href', 'https://www.instagram.com/taamenn.official/');
  await expect(actions.nth(1)).toHaveAttribute('href', /wa\.me\/970594054750/);
  await expect(actions.nth(2)).toHaveAttribute('href', 'https://whatsapp.com/channel/0029VbDL3R2I1rcpDnMnlQ09');
  for (const action of await actions.all()) {
    await expect(action).toHaveAttribute('target', '_blank');
    await expect(action).toHaveAttribute('rel', /noopener/);
  }
  const heights = await actions.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);
  await page.setViewportSize({ width: 320, height: 700 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('the gallery sits on the settings page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeSetup(page);
  await useEnglish(page);
  await page.goto('/#settings');
  await expect(page.locator('.settings-gallery')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open wallet' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
