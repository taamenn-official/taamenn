import assert from 'node:assert/strict';
import test from 'node:test';
import { routeRegistry, routesForDesktopNav, routesForMobileNav } from './routes.ts';

test('tactical stays in the registry but leaves normal navigation', () => {
  const tactical = routeRegistry.find((route) => route.id === 'tactical');
  assert.ok(tactical);
  assert.equal(tactical.showInMobileNav, false);
  assert.equal(tactical.showInDesktopNav, false);
  assert.equal(routesForMobileNav('normal').some((route) => route.id === 'tactical'), false);
  assert.equal(routesForDesktopNav('normal').some((route) => route.id === 'tactical'), false);
});

test('stadiums is a mobile and desktop destination', () => {
  const stadiums = routeRegistry.find((route) => route.id === 'stadiums');
  assert.equal(stadiums?.showInMobileNav, true);
  assert.equal(stadiums?.showInDesktopNav, true);
  assert.equal(routesForMobileNav('normal').some((route) => route.id === 'stadiums'), true);
});
