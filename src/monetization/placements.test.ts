import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AD_PLACEMENTS,
  PHASE1_MONETIZATION_ENABLED,
  RESTRICTED_AD_SURFACES,
  adsPreviewRequested,
  isPublisherId,
  placementEnabled,
  readAdConfig,
  resolvePlacement,
  surfaceAllowsAd,
} from './placements.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function publisherId(digits = 16): string {
  return `ca-pub-${'1'.repeat(digits)}`;
}

function slotId(): string {
  return '9'.repeat(10);
}

test('phase 1 does not enable any sponsored placement', () => {
  assert.equal(PHASE1_MONETIZATION_ENABLED, false);
  assert.equal(placementEnabled('AdSlot'), false);
  assert.equal(placementEnabled('SponsoredCard'), false);
  assert.equal(placementEnabled('SponsoredVenue'), false);
  assert.equal(placementEnabled('SponsoredMatch'), false);
  assert.equal(placementEnabled('PartnerCard'), false);
});

test('disabled ads render nothing and do not describe a network unit', () => {
  const resolved = resolvePlacement('home', {});
  assert.deepEqual(resolved, { mode: 'none' });
  assert.equal(resolvePlacement('stadiums', { VITE_ADSENSE_ENABLED: 'false' }).mode, 'none');
  assert.equal(resolvePlacement('archive', { VITE_ADS_PREVIEW: 'false' }).mode, 'none');
  assert.equal(resolvePlacement('archive', { VITE_ADS_PREVIEW: '1' }).mode, 'none');
});

test('preview renders only when VITE_ADS_PREVIEW is exactly true', () => {
  assert.equal(adsPreviewRequested({ VITE_ADS_PREVIEW: 'true' }), true);
  assert.equal(adsPreviewRequested({}), false);
  const resolved = resolvePlacement('home', { VITE_ADS_PREVIEW: 'true' });
  assert.deepEqual(resolved, { mode: 'preview' });
  assert.equal(resolved.mode === 'preview', true);
});

test('no fake publisher id is accepted or invented', () => {
  assert.equal(isPublisherId(undefined), false);
  assert.equal(isPublisherId(''), false);
  assert.equal(isPublisherId('ca-pub-'), false);
  assert.equal(isPublisherId('ca-pub-XXXXXXXXXXXXXXXX'), false);
  assert.equal(isPublisherId('pub-1234567890'), false);
  const config = readAdConfig({
    VITE_ADSENSE_ENABLED: 'true',
    VITE_ADSENSE_CLIENT_ID: 'ca-pub-',
    VITE_ADSENSE_HOME_SLOT: '1234567890',
  });
  assert.equal(config.enabled, false);
  assert.equal(config.clientId, undefined);
  assert.equal(resolvePlacement('home', {
    VITE_ADSENSE_ENABLED: 'true',
    VITE_ADSENSE_CLIENT_ID: 'not-a-publisher',
    VITE_ADSENSE_HOME_SLOT: '1234567890',
  }).mode, 'none');
});

test('adsense markup is returned only for a real publisher id and slot', () => {
  const clientId = publisherId();
  const homeSlot = slotId();
  const env = {
    VITE_ADSENSE_ENABLED: 'true',
    VITE_ADSENSE_CLIENT_ID: clientId,
    VITE_ADSENSE_HOME_SLOT: homeSlot,
  };
  const home = resolvePlacement('home', env);
  assert.equal(home.mode, 'adsense');
  if (home.mode === 'adsense') {
    assert.equal(home.clientId, clientId);
    assert.equal(home.slotId, homeSlot);
  }
  assert.equal(resolvePlacement('stadiums', env).mode, 'none');
  assert.equal(resolvePlacement('archive', { ...env, VITE_ADSENSE_ENABLED: 'yes' }).mode, 'none');
});

test('only home, stadiums, and archive are approved placements', () => {
  assert.deepEqual([...AD_PLACEMENTS], ['home', 'home-follow', 'stadiums', 'stadiums-follow', 'archive', 'archive-follow']);
  assert.equal(resolvePlacement('home-follow', { VITE_ADS_PREVIEW: 'true' }).mode, 'none');
  assert.equal(resolvePlacement('trophy', { VITE_ADS_PREVIEW: 'true' }).mode, 'none');
  assert.equal(surfaceAllowsAd('home'), true);
  assert.equal(surfaceAllowsAd('stadiums'), true);
  assert.equal(surfaceAllowsAd('archive'), true);
  for (const surface of RESTRICTED_AD_SURFACES) {
    assert.equal(surfaceAllowsAd(surface), false, surface);
    assert.equal(resolvePlacement(surface, { VITE_ADS_PREVIEW: 'true' }).mode, 'none', surface);
  }
  assert.equal(resolvePlacement('tactical', { VITE_ADS_PREVIEW: 'true' }).mode, 'none');
});

test('AdSlot is mounted only on home, stadiums, and archive', () => {
  const pages = path.join(root, 'src');
  const allowed = new Set([
    'src/pages/Home.tsx',
    'src/pages/Stadiums.tsx',
    'src/pages/Archive.tsx',
    'src/components/monetization/AdSlot.tsx',
  ]);
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx$/.test(entry.name) && fs.readFileSync(full, 'utf8').includes('<AdSlot ')) {
        hits.push(path.relative(root, full).replaceAll('\\', '/'));
      }
    }
  };
  walk(pages);
  assert.deepEqual(hits.sort(), [...allowed].filter(file => file.endsWith('.tsx') && file !== 'src/components/monetization/AdSlot.tsx').sort());
});

test('index.html contains the AdSense site-verification script exactly once', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = [
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7265269139254398"',
    '     crossorigin="anonymous"></script>',
  ].join('\n');
  assert.equal(html.split(script).length - 1, 1);
  assert.equal(html.indexOf(script) < html.indexOf('</head>'), true);
  assert.equal((html.match(/googlesyndication/g) ?? []).length, 1);
  assert.equal((html.match(/ca-pub-\d+/g) ?? []).join(','), 'ca-pub-7265269139254398');
  assert.equal(html.includes('enable_page_level_ads'), false);
  assert.equal(html.includes('data-ad-client'), false);
  assert.equal(html.includes('data-ad-slot'), false);
  assert.equal(html.includes('<AdSlot'), false);
});

const ADS_TXT_LINE = 'google.com, pub-7265269139254398, DIRECT, f08c47fec0942fa0';

test('public/ads.txt is the exact seller line and is not an SPA document', () => {
  const file = path.join(root, 'public/ads.txt');
  const text = fs.readFileSync(file, 'utf8');
  assert.equal(text, `${ADS_TXT_LINE}\n`);
  assert.equal(text.split('\n').filter(line => line.length > 0).length, 1);
  assert.equal(text.includes('<'), false);
  assert.equal(text.includes('ca-pub-'), false);
  assert.equal(fs.existsSync(path.join(root, 'ads.txt')), false);
  const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  const bypass = sw.indexOf("url.pathname==='/ads.txt'");
  const respond = sw.indexOf('event.respondWith');
  assert.equal(bypass > 0 && bypass < respond, true);
  assert.match(sw, /url\.pathname==='\/sitemap\.xml'/);
  assert.equal(sw.includes('pagead2.googlesyndication.com'), false);
  const wrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
  assert.match(wrangler, /"directory"\s*:\s*"dist\/client"/);
  assert.match(wrangler, /"not_found_handling"\s*:\s*"single-page-application"/);
  assert.match(wrangler, /"run_worker_first"\s*:\s*\[\s*"\/api\/\*"\s*\]/);
  assert.equal(wrangler.includes('ads.txt'), false);
  const fallback = fs.readFileSync(path.join(root, 'public/404.html'), 'utf8');
  assert.equal(fallback.includes('ads.txt'), false);
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.equal(/^\s*VITE_ADSENSE_ENABLED\s*=\s*true/m.test(example), false);
  assert.equal(example.includes('ca-pub-'), false);
  assert.equal(example.includes(ADS_TXT_LINE), false);
});

test('source and public files contain no extra publisher id', () => {
  const scan = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.test\.ts$/.test(entry.name)) continue;
      else if (/\.(ts|tsx|js|mjs|html|css|txt|json|jsonc|example)$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8');
        assert.equal(/ca-pub-\d/.test(text), false, full);
        assert.equal(text.includes('enable_page_level_ads'), false, full);
        if (text.includes('pagead2.googlesyndication.com')) {
          assert.equal(full.endsWith(`${path.sep}src${path.sep}monetization${path.sep}adsense.ts`), true, full);
        }
      }
    }
  };
  scan(path.join(root, 'src'));
  scan(path.join(root, 'public'));
});
