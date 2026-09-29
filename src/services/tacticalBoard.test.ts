import assert from 'node:assert/strict';
import test from 'node:test';
import { formations, genericTacticalPlayers } from '../data/tacticalPresets.ts';
import type { TacticalPlayer } from '../data/footballData.ts';
import {
  applyFormation, beginDrag, clampToPitch, derivedPosition, dragTo, endDrag,
  grabOffset, movePlayerTo, nudgePlayer, ownsDrag, PITCH_MAX, PITCH_MIN, pointWithGrab,
  pointerToPitchPercent, readStoredPlayers, renamePlayer, samePoint, setCaptain, snapPoint,
} from './tacticalBoard.ts';

const rect = { left: 100, top: 200, width: 400, height: 300 };
const squad = (): TacticalPlayer[] => applyFormation(genericTacticalPlayers.map(p => ({ ...p })), formations[0]);
const find = (players: TacticalPlayer[], id: string) => players.find(p => p.id === id)!;

test('coordinates are clamped to the full pitch range with no inset', () => {
  assert.equal(clampToPitch(-40), PITCH_MIN);
  assert.equal(clampToPitch(140), PITCH_MAX);
  assert.equal(clampToPitch(0), 0);
  assert.equal(clampToPitch(100), 100);
  assert.equal(clampToPitch(37.5), 37.5);
  // A non-finite value would otherwise poison the persisted plan.
  assert.equal(clampToPitch(Number.NaN), PITCH_MIN);
});

test('pointer positions map to pitch percentages', () => {
  assert.deepEqual(pointerToPitchPercent(300, 350, rect), { x: 50, y: 50 });
  assert.deepEqual(pointerToPitchPercent(100, 200, rect), { x: 0, y: 0 });
  assert.deepEqual(pointerToPitchPercent(500, 500, rect), { x: 100, y: 100 });
  // Outside the pitch is clamped rather than allowed to escape.
  assert.deepEqual(pointerToPitchPercent(-900, 900, rect), { x: 0, y: 100 });
  // A collapsed rect must not produce Infinity.
  assert.deepEqual(pointerToPitchPercent(300, 350, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 });
});

test('the position label is derived symmetrically for both teams', () => {
  assert.equal(derivedPosition({ team: 'home', x: 5, y: 50 }), 'GK');
  assert.equal(derivedPosition({ team: 'away', x: 95, y: 50 }), 'GK');
  assert.equal(derivedPosition({ team: 'home', x: 95, y: 50 }), 'ST');
  assert.equal(derivedPosition({ team: 'away', x: 5, y: 50 }), 'ST');
  assert.equal(derivedPosition({ team: 'home', x: 25, y: 10 }), 'LB');
  assert.equal(derivedPosition({ team: 'away', x: 75, y: 10 }), 'LB');
});

test('a formation change rewrites every coordinate and keeps player identity', () => {
  const before = squad();
  const renamed = before.map(p => (p.id === 'H1' ? { ...p, name: 'Keeper', captain: true } : p));
  const after = applyFormation(renamed, formations[1]);

  assert.deepEqual(after.map(p => p.id), before.map(p => p.id));
  assert.equal(find(after, 'H1').name, 'Keeper');
  assert.equal(find(after, 'H1').captain, true);
  for (const player of after) {
    const slots = formations[1].positions[player.team];
    assert.ok(slots.some(slot => slot.x === player.x && slot.y === player.y), `${player.id} sits on a formation slot`);
  }
});

test('moving a player leaves every other player untouched', () => {
  const before = squad();
  const after = movePlayerTo(before, 'H3', { x: 61.5, y: 12.25 });
  assert.deepEqual({ x: find(after, 'H3').x, y: find(after, 'H3').y }, { x: 61.5, y: 12.25 });
  for (const player of before) {
    if (player.id === 'H3') continue;
    assert.deepEqual(find(after, player.id), player);
  }
});

test('an out-of-bounds move is clamped instead of rejected', () => {
  const after = movePlayerTo(squad(), 'A2', { x: -30, y: 420 });
  assert.deepEqual({ x: find(after, 'A2').x, y: find(after, 'A2').y }, { x: 0, y: 100 });
});

test('captaincy is exclusive within a team and does not cross sides', () => {
  const withHomeCaptain = setCaptain(setCaptain(squad(), 'H1', true), 'H4', true);
  assert.equal(find(withHomeCaptain, 'H1').captain, false);
  assert.equal(find(withHomeCaptain, 'H4').captain, true);

  const withBoth = setCaptain(withHomeCaptain, 'A3', true);
  assert.equal(find(withBoth, 'H4').captain, true, 'the away captain does not unseat the home captain');
  assert.equal(find(withBoth, 'A3').captain, true);
  assert.equal(setCaptain(withBoth, 'A3', false).find(p => p.captain && p.team === 'away'), undefined);
});

test('a drag only starts for a player that exists', () => {
  const players = squad();
  assert.equal(beginDrag(players, 'nobody', 1), null);
  const drag = beginDrag(players, 'H2', 7);
  assert.equal(drag?.playerId, 'H2');
  assert.equal(drag?.pointerId, 7);
  assert.equal(drag?.before, players, 'the snapshot is the array as it was at pointerdown');
});

test('only the capturing pointer can move the token', () => {
  const players = squad();
  const drag = beginDrag(players, 'H2', 7);
  assert.equal(ownsDrag(drag, 7), true);
  assert.equal(ownsDrag(drag, 8), false);
  assert.equal(ownsDrag(null, 7), false);

  // A second touch arriving mid-drag must not drag anything.
  assert.equal(dragTo(drag, 8, players, { x: 90, y: 90 }), players);

  const moved = dragTo(drag, 7, players, { x: 90, y: 90 });
  assert.deepEqual({ x: find(moved, 'H2').x, y: find(moved, 'H2').y }, { x: 90, y: 90 });
});

test('a sequence of moves accumulates on the same player', () => {
  const drag = beginDrag(squad(), 'A1', 3)!;
  const path = [{ x: 10, y: 10 }, { x: 20, y: 40 }, { x: 55.5, y: 80 }];
  const final = path.reduce((players, point) => dragTo(drag, 3, players, point), drag.before);
  assert.deepEqual({ x: find(final, 'A1').x, y: find(final, 'A1').y }, { x: 55.5, y: 80 });
  assert.deepEqual({ x: find(drag.before, 'A1').x, y: find(drag.before, 'A1').y },
    { x: formations[0].positions.away[0].x, y: formations[0].positions.away[0].y },
    'the pointerdown snapshot is not mutated, so undo still works');
});

test('ending a drag settles once and returns the undo snapshot', () => {
  const players = squad();
  const drag = beginDrag(players, 'H5', 4)!;

  const foreign = endDrag(drag, 99);
  assert.equal(foreign.settled, false, 'a pointerup from another pointer does not end the drag');
  assert.equal(foreign.drag, drag);
  assert.equal(foreign.before, null);

  const done = endDrag(drag, 4);
  assert.equal(done.settled, true);
  assert.equal(done.drag, null);
  assert.equal(done.before, players);

  // lostpointercapture arriving after pointerup must not settle a second time.
  assert.deepEqual(endDrag(done.drag, 4), { drag: null, settled: false, before: null });
});

test('a grab keeps the player centre offset from the pointer', () => {
  const player = { x: 22, y: 40 };
  const pointer = { x: 30, y: 48 };
  const grab = grabOffset(player, pointer);
  assert.deepEqual(grab, { dx: -8, dy: -8 });
  assert.deepEqual(pointWithGrab(pointer, grab), player, 'the token does not jump on pickup');
  assert.deepEqual(pointWithGrab({ x: 10, y: 70 }, grab), { x: 2, y: 62 });
  assert.deepEqual(pointWithGrab({ x: 0, y: 0 }, grab), { x: 0, y: 0 }, 'the edge clamps without throwing the player outside');
});

test('soft snap only pulls a point that is already close to the grid', () => {
  assert.deepEqual(snapPoint({ x: 12.2, y: 40 }, 'off'), { x: 12.2, y: 40 });
  assert.deepEqual(snapPoint({ x: 19.2, y: 40.4 }, 'soft'), { x: 20, y: 40 });
  assert.deepEqual(snapPoint({ x: 12.2, y: 40 }, 'soft'), { x: 12.2, y: 40 });
});

test('keyboard nudges stay inside the pitch and leave other players alone', () => {
  const before = squad();
  const nudged = nudgePlayer(before, 'H1', -50, 3);
  assert.equal(find(nudged, 'H1').x, 0);
  assert.equal(find(nudged, 'H1').y, find(before, 'H1').y + 3);
  assert.equal(nudgePlayer(before, 'missing', 1, 1), before);
});

test('rename trims the name and falls back when the field is empty', () => {
  const renamed = renamePlayer(squad(), 'H2', '  سالم  ', 'Player');
  assert.equal(find(renamed, 'H2').name, 'سالم');
  assert.equal(find(renamePlayer(squad(), 'H2', '   ', 'لاعب'), 'H2').name, 'لاعب');
});

test('a broken stored plan falls back instead of clearing the board', () => {
  const fallback = squad();
  assert.equal(readStoredPlayers(null, fallback), fallback);
  assert.equal(readStoredPlayers([], fallback), fallback);
  assert.equal(readStoredPlayers([{ id: '', team: 'home' }], fallback), fallback);
  const loaded = readStoredPlayers([{ id: 'H9', team: 'home', name: '  ', x: 140, y: -4, captain: true }], fallback);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].x, 100);
  assert.equal(loaded[0].y, 0);
  assert.equal(loaded[0].captain, true);
  assert.equal(loaded[0].name, fallback[0].name);
  assert.equal(samePoint({ x: 10, y: 10 }, { x: 10.04, y: 9.97 }), true);
});

test('a cancelled drag keeps the applied position and still yields one undo entry', () => {
  const players = squad();
  const drag = beginDrag(players, 'H4', 5)!;
  const moved = dragTo(drag, 5, players, { x: 70, y: 30 });
  const cancelled = endDrag(drag, 5);

  assert.equal(cancelled.settled, true, 'cancellation goes through the same finalisation path');
  assert.deepEqual({ x: find(moved, 'H4').x, y: find(moved, 'H4').y }, { x: 70, y: 30 });
  assert.equal(cancelled.before, players);
  assert.equal(cancelled.drag, null, 'no drag is left in flight after cancellation');
});
