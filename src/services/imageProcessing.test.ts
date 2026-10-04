import assert from 'node:assert/strict';
import test from 'node:test';
import { AVATAR_CROP_ASPECT, BANNER_CROP_ASPECT, canTryImageFile, cropSourceRect } from './imageProcessing.ts';

test('an empty file type can still be decoded, and a non-image type cannot', () => {
  assert.equal(canTryImageFile({ type: '' }), true);
  assert.equal(canTryImageFile({ type: 'image/jpeg' }), true);
  assert.equal(canTryImageFile({ type: 'application/pdf' }), false);
});

test('avatar crop at rest uses the centered square', () => {
  const rect = cropSourceRect(200, 100, { aspect: AVATAR_CROP_ASPECT, zoom: 1, panX: 0, panY: 0 });
  assert.equal(rect.sw, 100);
  assert.equal(rect.sh, 100);
  assert.equal(rect.sx, 50);
  assert.equal(rect.sy, 0);
});

test('pan moves the window without exposing canvas coordinates', () => {
  const left = cropSourceRect(200, 100, { aspect: AVATAR_CROP_ASPECT, zoom: 1, panX: -1, panY: 0 });
  const right = cropSourceRect(200, 100, { aspect: AVATAR_CROP_ASPECT, zoom: 1, panX: 1, panY: 0 });
  assert.equal(left.sx, 0);
  assert.equal(right.sx, 100);
});

test('zoom tightens a wide banner window', () => {
  const cover = cropSourceRect(340, 200, { aspect: BANNER_CROP_ASPECT, zoom: 1, panX: 0, panY: 0 });
  const zoomed = cropSourceRect(340, 200, { aspect: BANNER_CROP_ASPECT, zoom: 2, panX: 0, panY: 0 });
  assert.ok(cover.sw / cover.sh > 3);
  assert.ok(zoomed.sw < cover.sw);
  assert.ok(zoomed.sh < cover.sh);
});
