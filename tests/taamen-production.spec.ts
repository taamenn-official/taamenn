import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function featuredMemberCode() {
  const source = fs.readFileSync(path.join(process.cwd(), 'backend/src/featuredMembers.mjs'), 'utf8');
  const match = source.match(/memberCode: '(user#[A-Z0-9]+)'/);
  if (!match) throw new Error('server Featured Member directory is missing');
  return match[1];
}

function encodeToken(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  bytes.forEach((byte) => (bin += String.fromCharCode(byte)));
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

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

test.describe('TAAMEN production path', () => {
  test('A startup, language, and shell', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await completeSetup(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await useEnglish(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { name: /Welcome Omar/ })).toBeVisible();
    const connectivity = page.locator('.connectivity-status');
    await expect(connectivity).toHaveCount(1);
    await expect(connectivity).toHaveClass(/online|offline/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('B profile save and C public profile share in a new tab', async ({ page, context }) => {
    await completeSetup(page, 'Lina');
    await useEnglish(page);
    await page.goto('/#profile');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Public share' })).toHaveCount(0);
    await expect(page.locator('.profile-inline-save')).toHaveCount(1);
    await page.getByRole('textbox', { name: /Family/ }).fill('Nasser');
    await page.locator('.profile-inline-save').click();
    await expect(page.getByText(/Profile saved|تم حفظ الملف/)).toBeVisible();
    const token = btoa(JSON.stringify({ v: 2, type: 'profile', displayName: 'Lina' })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const url = `/share/profile/${token}`;

    const sharePage = await context.newPage();
    await sharePage.goto(url);
    await expect(sharePage.getByText('PUBLIC PROFILE')).toBeVisible();
    await expect(sharePage.getByRole('heading', { name: 'Lina' })).toBeVisible();
    await sharePage.reload();
    await expect(sharePage.getByRole('heading', { name: 'Lina' })).toBeVisible();
    await sharePage.close();

    const malformed = await context.newPage();
    await malformed.goto('/share/profile/not-a-valid-token');
    await expect(malformed.getByRole('heading', { name: 'Invalid share link' })).toBeVisible();
    await malformed.close();
  });

  test('D support contact validates and does not fake success', async ({ page }) => {
    await completeSetup(page);
    await useEnglish(page);
    await page.goto('/#support');
    await expect(page.getByRole('heading', { name: 'Support', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('alert')).toContainText(/check the entered information/i);
    await page.getByPlaceholder('name@example.com').fill('person@example.com');
    await page.getByPlaceholder('Write your message…').fill('Please help with a real TAAMEN question.');
    await page.getByRole('button', { name: /Send message|Try again/ }).click();
    const banner = page.locator('.error-banner, .success-banner.contact-sent, .contact-status');
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(banner).not.toHaveText(/Sending…/);
  });

  test('E featured members reject invalid ids and persist a server session', async ({ page }) => {
    await completeSetup(page);
    await useEnglish(page);
    await page.goto('/#settings');
    await page.getByRole('button', { name: 'TAAMEN member access' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('alert')).toContainText(/Enter the member identifier/i);
    await page.locator('.featured-code-label input').fill('not-a-member');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('alert')).toContainText(/Invalid member ID/i);

    await page.locator('.featured-code-label input').fill(featuredMemberCode());
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: 'Return to General User' })).toBeVisible({ timeout: 20_000 });
    await page.goto('/#historical-match-center');
    await expect(page.getByRole('heading', { name: 'Historical Match Center' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Historical Match Center' })).toBeVisible();
    await page.getByRole('button', { name: 'Return to General User' }).click();
    await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible({ timeout: 15_000 });
  });

  test('F match create + share preview, G tactical board', async ({ page, context }) => {
    await completeSetup(page);
    await useEnglish(page);
    await page.goto('/#match-center');
    await page.getByRole('button', { name: /Create match|Create first match/ }).first().click();
    await page.getByRole('textbox', { name: /Team 2/ }).fill('Guests');
    await page.getByRole('textbox', { name: /Stadium/ }).fill('Al Ahli');
    await page.getByRole('textbox', { name: /City/ }).fill('Hebron');
    // Default kickoff is today 20:00 Asia/Jerusalem for 60 minutes. After 21:00
    // there, lifecycle moves it out of Match Center before Share can appear.
    const kickoff = await page.evaluate(() => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).formatToParts(new Date(Date.now() + 26 * 60 * 60 * 1000));
      const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
      return { month: `${get('month')} ${get('year')}`, day: get('day') };
    });
    await page.getByRole('button', { name: 'Open calendar' }).click();
    const calendar = page.getByRole('dialog', { name: 'Open calendar' });
    for (let step = 0; step < 14; step += 1) {
      const label = await calendar.locator('header strong').innerText();
      if (label.includes(kickoff.month)) break;
      await calendar.getByRole('button', { name: 'Next month' }).click();
    }
    await calendar.getByRole('button', { name: kickoff.day, exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Share' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Share' }).first().click();
    await page.getByRole('button', { name: 'Generate share link' }).click();
    const matchUrl = page.locator('.share-link-field input');
    await expect(matchUrl).toHaveValue(/\/share\/match\//);
    const href = await matchUrl.inputValue();
    const preview = await context.newPage();
    await preview.goto(href);
    await expect(preview.getByText(/View only|عرض فقط/)).toBeVisible();
    await expect(preview.getByRole('button', { name: /Save match|حفظ/ })).toHaveCount(0);
    await preview.close();

    await page.goto('/#tactical');
    await expect(page.getByRole('heading', { name: /Tactical Board|لوح التكتيك/ })).toBeVisible();
    await page.locator('.player-token').first().click();
    await expect(page.locator('.player-inspector')).toBeVisible();
  });

  test('acquisition page is branded and bilingual', async ({ page }) => {
    await page.goto('/acquisition');
    await expect(page).toHaveTitle(/Acquisition dossier|ملف الاستحواذ/);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Open TAAMEN|افتح TAAMEN/ }).first()).toBeVisible();
    await page.getByRole('button', { name: /English|العربية/ }).first().click();
    await expect(page.locator('#acquisition-contact')).toBeVisible();
    await expect(page.locator('#acquisition-contact').getByText(/No fake checkout|لا يوجد دفع وهمي/i)).toBeVisible();
  });

  test('responsive viewports keep the shell usable', async ({ page }) => {
    await completeSetup(page);
    for (const width of [375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/#home');
      await expect(page.locator('.app-shell').first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow at ${width}`).toBeLessThan(32);
    }
  });
});

test('share tokens work without original React state', async ({ page }) => {
  const matchToken = encodeToken({
    v: 4,
    id: 'LOCAL-E2E',
    originId: 'LOCAL-E2E',
    allowSave: true,
    type: 'friendly',
    team1: 'TAAMEN',
    team2: 'Guests',
    score1: 1,
    score2: 0,
    status: 'FINISHED',
    dateLabel: '1 January 2026',
    dateKey: 20260101,
    visibility: 'PUBLIC',
  });
  await page.goto(`/share/match/${matchToken}`);
  await expect(page.getByRole('button', { name: /Import match|استيراد المباراة|Save match|حفظ المباراة/ })).toBeVisible();

  const profileToken = encodeToken({
    v: 2,
    type: 'profile',
    displayName: 'Nour',
  });
  await page.goto(`/share/profile/${profileToken}`);
  await expect(page.getByRole('heading', { name: 'Nour' })).toBeVisible();
  await expect(page.getByText(/hidden@example.com/)).toHaveCount(0);
});
