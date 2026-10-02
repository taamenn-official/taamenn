import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('the service worker keeps caching and adds push delivery', () => {
  const sw = fs.readFileSync(fileURLToPath(new URL('../../public/sw.js', import.meta.url)), 'utf8');
  assert.match(sw, /VERSION='v9'/);
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw, /url\.pathname\.startsWith\('\/share\/'\)/);
  assert.match(sw, /ads\.txt/);
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /addEventListener\('notificationclick'/);
  assert.match(sw, /\/#match-center/);
  assert.equal(sw.includes('VAPID_PRIVATE'), false);
});

test('stadium navigation uses the goal icon', () => {
  const routes = fs.readFileSync(fileURLToPath(new URL('../config/routes.ts', import.meta.url)), 'utf8');
  assert.match(routes, /id:'stadiums',icon:Goal/);
  assert.equal(routes.includes('Landmark'), false);
});
