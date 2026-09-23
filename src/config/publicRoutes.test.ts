import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { legalDocumentForPath, PUBLIC_ORIGIN, PUBLIC_SITEMAP_PATHS, publicPageUrl } from './publicRoutes.ts';

test('legal paths resolve and other app paths do not', () => {
  assert.equal(legalDocumentForPath('/privacy'), 'privacy');
  assert.equal(legalDocumentForPath('/privacy/'), 'privacy');
  assert.equal(legalDocumentForPath('/terms'), 'terms');
  assert.equal(legalDocumentForPath('/acquisition'), null);
  assert.equal(legalDocumentForPath('/share/match/abc'), null);
  assert.equal(legalDocumentForPath('/api/health'), null);
});

test('sitemap lists only the real public pages', () => {
  const robots = fs.readFileSync('public/robots.txt', 'utf8');
  const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
  assert.match(robots, new RegExp(`Sitemap: ${PUBLIC_ORIGIN}/sitemap.xml`));
  for (const pathname of PUBLIC_SITEMAP_PATHS) {
    assert.match(sitemap, new RegExp(`<loc>${publicPageUrl(pathname)}</loc>`));
  }
  assert.doesNotMatch(sitemap, /\/api\//);
  assert.doesNotMatch(sitemap, /\/share\//);
  assert.equal(sitemap.match(/<loc>/g)?.length, PUBLIC_SITEMAP_PATHS.length);
});
