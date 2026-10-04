import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('textbox', { name: /First name|الاسم الأول/ }).fill('Omar');
  await page.locator('#consent-checkbox').check();
  await page.getByRole('button', { name: /Continue|متابعة/ }).click();
  await expect(page.getByRole('heading', { name: /أهلًا|Welcome/ })).toBeVisible({ timeout: 20_000 });
}

test('trophy stays out of navigation and shows the pre-campaign state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const order = await page.locator('.bottom-nav [data-route]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-route')));
  expect(order.filter(id => id !== 'settings')).toEqual(['home', 'match-center', 'archive', 'stadiums', 'profile']);
  expect(order).not.toContain('trophy');
  await expect(page.locator('a[href="/trophy"]')).toHaveCount(0);
  await page.goto('/trophy');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Join the challenge|شارك في الفعالية/ })).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).toHaveCount(0);
});
