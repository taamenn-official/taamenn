import { expect, test, type Page } from '@playwright/test';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
  'base64',
);

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

test('home cards navigate and the venues card has no beta mark', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await completeSetup(page);
  await useEnglish(page);
  await expect(page.locator('.beta-badge')).toHaveCount(0);
  await expect(page.locator('.home-venues-card')).toBeVisible();
  const stats = page.locator('.home-stats');
  await stats.getByRole('button', { name: /Decided matches/ }).click();
  await expect(page).toHaveURL(/#archive/);
  await page.goto('/#home');
  await stats.getByRole('button', { name: /Draws/ }).click();
  await expect(page).toHaveURL(/#archive/);
  await page.goto('/#home');
  await page.getByRole('button', { name: 'Open venues' }).click();
  await expect(page).toHaveURL(/#stadiums/);
  await expect(page.getByRole('heading', { name: 'Stadiums', exact: true })).toBeVisible();
});

test('profile crop can cancel and confirm, and the banner stays short', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await completeSetup(page);
  await useEnglish(page);
  await page.goto('/#profile');
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  const banner = page.locator('.profile-banner');
  const height = await banner.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThanOrEqual(110);
  const avatarInput = page.locator('.profile-page input[type=file]').nth(1);
  await avatarInput.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG });
  const crop = page.getByRole('dialog', { name: /Crop photo/ });
  await expect(crop).toBeVisible();
  await crop.locator('button.dark-action').click();
  await expect(crop).toBeHidden();
  await expect(page.locator('.profile-avatar-button img')).toHaveCount(0);
  await avatarInput.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG });
  await expect(crop).toBeVisible();
  await crop.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('.profile-avatar-button img')).toBeVisible();
});

test('how-to guide shows a real example and archive select follows the theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeSetup(page);
  await useEnglish(page);
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'How-to Guide' }).click();
  const guide = page.getByRole('dialog', { name: 'How-to Guide' });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Team A × Team B, Friday 19:00, normal match, stadium');
  await expect(guide).toContainText('Real Madrid 3 × 2 Barcelona, recorded, archived');
  await guide.locator('.guide-modal').getByRole('button', { name: 'Close' }).click();
  await page.goto('/#archive');
  const select = page.locator('.archive-type-select');
  await expect(select).toBeVisible();
  const selectStyle = await select.evaluate((el) => {
    const style = getComputedStyle(el);
    return { radius: style.borderRadius, background: style.backgroundColor, color: style.color };
  });
  expect(selectStyle.radius).not.toBe('0px');
  expect(selectStyle.background).not.toBe('rgba(0, 0, 0, 0)');
  const panel = page.locator('.archive-page, .panel, .archive-search').first();
  const background = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgb(255, 255, 255)');
});

test('a new match emits one toast with the real title', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await completeSetup(page);
  await useEnglish(page);
  await expect(page.locator('.notification-toast')).toHaveCount(0);
  await page.goto('/#match-center');
  await page.locator('.page-heading').getByRole('button', { name: 'Create match' }).click();
  await page.getByRole('textbox', { name: /Team 2/ }).fill('Visitors');
  await page.getByRole('textbox', { name: /Stadium/ }).fill('Local pitch');
  await page.getByRole('textbox', { name: /City/ }).fill('Ramallah');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const toast = page.locator('.notification-toast');
  await expect(toast).toHaveCount(1);
  await expect(toast).not.toContainText('New notification');
  await expect(toast.locator('strong')).not.toHaveText('');
  await expect(toast).toBeHidden({ timeout: 5000 });
  await expect(page.locator('.notification-toast')).toHaveCount(0);
});
