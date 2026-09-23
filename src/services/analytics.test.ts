import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  AHREFS_ANALYTICS_SRC,
  AHREFS_DATA_KEY,
  AHREFS_SCRIPT_ID,
  analyticsEnabled,
  resetAnalyticsForTests,
  syncAhrefsAnalytics,
  type AnalyticsDocument,
  type AnalyticsScriptElement,
} from './analytics.ts';

function fakeDocument(): AnalyticsDocument & { scripts: AnalyticsScriptElement[] } {
  const scripts: AnalyticsScriptElement[] = [];
  return {
    scripts,
    getElementById(id) {
      return scripts.find((script) => script.id === id) ?? null;
    },
    querySelector(selector) {
      if (selector === `script[src="${AHREFS_ANALYTICS_SRC}"]`) {
        return scripts.find((script) => script.src === AHREFS_ANALYTICS_SRC) ?? null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === `script[src="${AHREFS_ANALYTICS_SRC}"]`) {
        return scripts.filter((script) => script.src === AHREFS_ANALYTICS_SRC);
      }
      return [];
    },
    createElement() {
      return { id: '', src: '', async: false, dataset: {}, onerror: null };
    },
    head: {
      appendChild(node) {
        scripts.push(node);
      },
    },
  };
}

test('index.html does not load Ahrefs before the preference is known', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.equal(html.includes('analytics.ahrefs.com'), false);
  assert.equal(html.includes(AHREFS_DATA_KEY), false);
});

test('analytics stays off unless the stored preference is exactly true', () => {
  assert.equal(analyticsEnabled(undefined), false);
  assert.equal(analyticsEnabled({}), false);
  assert.equal(analyticsEnabled({ analytics: false }), false);
  assert.equal(analyticsEnabled({ analytics: 'true' }), false);
  assert.equal(analyticsEnabled({ analytics: true }), true);
});

test('disabled analytics does not insert a script', () => {
  resetAnalyticsForTests();
  const doc = fakeDocument();
  assert.equal(syncAhrefsAnalytics(false, doc), false);
  assert.equal(doc.scripts.length, 0);
});

test('enabled analytics inserts the Ahrefs script once across repeated calls', () => {
  resetAnalyticsForTests();
  const doc = fakeDocument();
  assert.equal(syncAhrefsAnalytics(true, doc), true);
  assert.equal(syncAhrefsAnalytics(true, doc), false);
  assert.equal(doc.scripts.length, 1);
  assert.equal(doc.scripts[0].id, AHREFS_SCRIPT_ID);
  assert.equal(doc.scripts[0].src, AHREFS_ANALYTICS_SRC);
  assert.equal(doc.scripts[0].async, true);
  assert.equal(doc.scripts[0].dataset.key, AHREFS_DATA_KEY);
  assert.equal(typeof doc.scripts[0].onerror, 'function');
  doc.scripts[0].onerror?.();
});

test('a second document lifecycle can insert once, and a failure does not throw', () => {
  resetAnalyticsForTests();
  const first = fakeDocument();
  assert.equal(syncAhrefsAnalytics(true, first), true);
  resetAnalyticsForTests();
  const second = fakeDocument();
  second.createElement = () => {
    throw new Error('blocked');
  };
  assert.equal(syncAhrefsAnalytics(true, second), false);
  assert.equal(second.scripts.length, 0);
  assert.equal(syncAhrefsAnalytics(true, fakeDocument()), true);
});
