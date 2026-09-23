import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ADSENSE_SCRIPT_BASE,
  ADSENSE_SCRIPT_ID,
  adsenseScriptUrl,
  ensureAdSenseScript,
  pushAdSenseUnit,
  resetAdSenseForTests,
  type AdSenseDocument,
  type AdSenseScriptElement,
} from './adsense.ts';

function fakeDocument(): AdSenseDocument & { nodes: AdSenseScriptElement[] } {
  const nodes: AdSenseScriptElement[] = [];
  return {
    nodes,
    getElementById(id) {
      return nodes.find(node => node.id === id) ?? null;
    },
    querySelector(selector) {
      const src = selector.match(/script\[src\^="([^"]+)"\]/)?.[1];
      if (!src) return null;
      return nodes.find(node => node.src.startsWith(src)) ?? null;
    },
    createElement() {
      return { id: '', src: '', async: false, crossOrigin: '', onerror: null };
    },
    head: {
      appendChild(node) {
        nodes.push(node);
      },
    },
  };
}

test('no external ad script when the publisher id is missing or invalid', () => {
  resetAdSenseForTests();
  const doc = fakeDocument();
  assert.equal(ensureAdSenseScript(undefined, doc), false);
  assert.equal(ensureAdSenseScript('ca-pub-', doc), false);
  assert.equal(ensureAdSenseScript('ca-pub-XXXXXXXXXXXXXXXX', doc), false);
  assert.equal(doc.nodes.length, 0);
  assert.equal(adsenseScriptUrl('ca-pub-'), null);
});

test('a real publisher id loads the official script once', () => {
  resetAdSenseForTests();
  const doc = fakeDocument();
  const clientId = `ca-pub-${'1'.repeat(16)}`;
  assert.equal(ensureAdSenseScript(clientId, doc), true);
  assert.equal(ensureAdSenseScript(clientId, doc), false);
  assert.equal(doc.nodes.length, 1);
  assert.equal(doc.nodes[0].id, ADSENSE_SCRIPT_ID);
  assert.equal(doc.nodes[0].async, true);
  assert.equal(doc.nodes[0].crossOrigin, 'anonymous');
  assert.equal(doc.nodes[0].src, `${ADSENSE_SCRIPT_BASE}?client=${clientId}`);
  assert.equal(doc.nodes[0].src.includes('analytics.ahrefs.com'), false);
});

test('a failed ad push does not throw', () => {
  const win = {
    get adsbygoogle(): unknown[] {
      throw new Error('adsense blocked');
    },
    set adsbygoogle(_value: unknown[]) {
      throw new Error('adsense blocked');
    },
  };
  assert.equal(pushAdSenseUnit(win), false);
});

test('the loader is separate from the analytics toggle', () => {
  const loader = fs.readFileSync(fileURLToPath(new URL('./adsense.ts', import.meta.url)), 'utf8');
  const slot = fs.readFileSync(fileURLToPath(new URL('../components/monetization/AdSlot.tsx', import.meta.url)), 'utf8');
  for (const text of [loader, slot]) {
    assert.equal(/from\s+['"][^'"]*analytics/.test(text), false);
    assert.equal(text.includes('syncAhrefs'), false);
    assert.equal(text.includes('AHREFS'), false);
  }
});
