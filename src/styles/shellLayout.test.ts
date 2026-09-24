import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shellCss = fs.readFileSync(path.join(root, 'src/styles/taamen-2.1.css'), 'utf8');
const indicator = fs.readFileSync(path.join(root, 'src/motion/NavActiveIndicator.tsx'), 'utf8');

function section(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  assert.ok(from >= 0, start);
  return source.slice(from, to === -1 ? source.length : to);
}

test('ad slot cannot force horizontal overflow', () => {
  const ad = section(shellCss, '.ad-slot {', '.ad-slot-kicker');
  assert.match(ad, /width:\s*100%/);
  assert.match(ad, /max-width:\s*100%/);
  assert.match(ad, /box-sizing:\s*border-box/);
  assert.equal(ad.includes('!important'), false);
});

test('collapsed tooltip uses the physical content-facing edge', () => {
  const ltr = section(shellCss, 'html[dir="ltr"] .app-shell > .sidebar.is-collapsed .tooltip', 'html[dir="rtl"]');
  const rtl = section(shellCss, 'html[dir="rtl"] .app-shell > .sidebar.is-collapsed .tooltip', '.app-shell > .sidebar.is-collapsed .nav-item:hover');
  assert.match(ltr, /left:\s*calc\(100% \+ 10px\)/);
  assert.match(ltr, /right:\s*auto/);
  assert.match(rtl, /right:\s*calc\(100% \+ 10px\)/);
  assert.match(rtl, /left:\s*auto/);
  assert.equal(ltr.includes('!important'), false);
  assert.equal(rtl.includes('!important'), false);
  assert.match(shellCss, /\.nav-item:hover \.tooltip/);
  assert.match(shellCss, /\.nav-item:focus-visible \.tooltip/);
});

test('main content width is the space beside the sidebar', () => {
  const desktop = section(shellCss, '@media (min-width: 901px) {\n  .app-shell > .main-content {', '/* ---------- Collapsed sidebar tooltips');
  assert.match(desktop, /width:\s*calc\(100% - var\(--sidebar-width\)\)/);
  assert.match(desktop, /width:\s*calc\(100% - var\(--sidebar-collapsed\)\)/);
  assert.match(desktop, /margin-inline-start:\s*var\(--sidebar-width\)/);
  assert.match(desktop, /margin-inline-start:\s*var\(--sidebar-collapsed\)/);
  assert.match(desktop, /right:\s*0/);
  assert.equal(desktop.includes('!important'), false);
  assert.equal(/margin(?:-inline)?\s*:\s*-/.test(desktop), false);
  const mobile = section(shellCss, '@media (max-width: 900px) {\n  .app-shell > .main-content', '@media (min-width: 901px)');
  assert.match(mobile, /width:\s*100%/);
  assert.match(mobile, /margin-inline-start:\s*0/);
  assert.match(mobile, /margin-inline-end:\s*0/);
});

test('only the root scrollbar is hidden', () => {
  assert.match(shellCss, /html \{\s*text-size-adjust:\s*100%;\s*scrollbar-width:\s*none;\s*overflow-x:\s*clip;/);
  assert.match(shellCss, /html::-webkit-scrollbar \{\s*width:\s*0;\s*height:\s*0;/);
  assert.equal(/\.notification-drawer[^{]*\{[^}]*scrollbar-width:\s*none/.test(shellCss), false);
  assert.equal(/\.modal-card[^{]*\{[^}]*scrollbar-width:\s*none/.test(shellCss), false);
  assert.equal(/\.archive-detail[^{]*\{[^}]*scrollbar-width:\s*none/.test(shellCss), false);
  const globalCss = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
  assert.match(globalCss, /\.notification-drawer\{[^}]*overflow:auto/);
});

test('mobile chrome keeps tap targets and drops the tap flash', () => {
  assert.match(shellCss, /-webkit-tap-highlight-color:\s*transparent/);
  assert.match(shellCss, /max-width:\s*calc\(100vw - 20px\)/);
  assert.match(shellCss, /touch-action:\s*none/);
  const globalCss = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
  assert.match(globalCss, /button:focus-visible/);
  assert.match(globalCss, /\.pitch \{\s*touch-action:\s*none/);
});

test('active indicator stays on physical coordinates', () => {
  assert.match(indicator, /itemBox\.left - navBox\.left/);
  assert.match(indicator, /itemBox\.top - navBox\.top/);
  assert.equal(indicator.includes('insetInlineStart'), false);
  assert.equal(indicator.includes('marginInline'), false);
});
