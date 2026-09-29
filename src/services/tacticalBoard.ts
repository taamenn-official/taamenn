import type { TacticalPlayer } from '../data/footballData';
import type { Formation } from '../data/tacticalPresets';

/**
 * Tactical board rules, with no DOM or React involvement so they can be tested directly.
 *
 * There is exactly one coordinate model: `TacticalPlayer.x` and `.y` are percentages of
 * the pitch bounds. Nothing else stores a position. Tokens are centred on their
 * coordinate by CSS, so the full 0..100 range is addressable and there is no inset.
 */
export const PITCH_MIN = 0;
export const PITCH_MAX = 100;

export type PitchRect = { left: number; top: number; width: number; height: number };
export type PitchPoint = { x: number; y: number };

export function clampToPitch(value: number): number {
  if (!Number.isFinite(value)) return PITCH_MIN;
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, value));
}

/** Translate a viewport pointer position into pitch percentages. */
export function pointerToPitchPercent(clientX: number, clientY: number, rect: PitchRect): PitchPoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: PITCH_MIN, y: PITCH_MIN };
  return {
    x: clampToPitch(((clientX - rect.left) / rect.width) * 100),
    y: clampToPitch(((clientY - rect.top) / rect.height) * 100),
  };
}

/**
 * Position label derived from where the player stands. `depth` is measured from the
 * player's own goal, so the same thresholds apply to both teams.
 */
export function derivedPosition(player: Pick<TacticalPlayer, 'team' | 'x' | 'y'>): string {
  const depth = player.team === 'home' ? player.x : PITCH_MAX - player.x;
  const lateral = player.y;

  if (depth <= 12) return 'GK';
  if (depth <= 35) {
    if (lateral < 30) return 'LB';
    if (lateral > 70) return 'RB';
    return 'CB';
  }
  if (depth <= 60) {
    if (lateral < 20) return 'LW';
    if (lateral > 80) return 'RW';
    return 'CM';
  }
  if (depth <= 80) {
    if (lateral < 25) return 'LM';
    if (lateral > 75) return 'RM';
    return 'CAM';
  }
  return 'ST';
}

/** Write formation coordinates into the players themselves; nothing else holds a position. */
export function applyFormation(players: TacticalPlayer[], formation: Formation): TacticalPlayer[] {
  const used = { home: 0, away: 0 };
  return players.map(player => {
    const slots = formation.positions[player.team];
    const slot = slots[used[player.team] % slots.length];
    used[player.team] += 1;
    return { ...player, x: clampToPitch(slot.x), y: clampToPitch(slot.y) };
  });
}

export function movePlayerTo(players: TacticalPlayer[], playerId: string, point: PitchPoint): TacticalPlayer[] {
  return players.map(player => player.id === playerId
    ? { ...player, x: clampToPitch(point.x), y: clampToPitch(point.y) }
    : player);
}

/**
 * Assign captaincy within one team only, so each side has at most one captain and the
 * other side is untouched.
 */
export function setCaptain(players: TacticalPlayer[], playerId: string, captain: boolean): TacticalPlayer[] {
  const target = players.find(player => player.id === playerId);
  if (!target) return players;
  return players.map(player => {
    if (player.id === playerId) return { ...player, captain };
    if (captain && player.team === target.team) return { ...player, captain: false };
    return player;
  });
}

// ---------------------------------------------------------------------------
// Drag state machine
//
// One pointer drags one player. The pointer id is part of the state so a second
// touch cannot hijack an in-flight drag, and so a stale pointerup for a different
// pointer cannot end it.
// ---------------------------------------------------------------------------

export type Drag = {
  pointerId: number;
  playerId: string;
  /** Snapshot taken at pointerdown, used as the single undo entry for the whole drag. */
  before: TacticalPlayer[];
};

export function beginDrag(players: TacticalPlayer[], playerId: string, pointerId: number): Drag | null {
  if (!players.some(player => player.id === playerId)) return null;
  return { pointerId, playerId, before: players };
}

/** True when this pointer owns the active drag. */
export function ownsDrag(drag: Drag | null, pointerId: number): boolean {
  return drag !== null && drag.pointerId === pointerId;
}

/** Returns the updated players, or the same array when the pointer does not own the drag. */
export function dragTo(
  drag: Drag | null,
  pointerId: number,
  players: TacticalPlayer[],
  point: PitchPoint,
): TacticalPlayer[] {
  if (!ownsDrag(drag, pointerId)) return players;
  return movePlayerTo(players, drag!.playerId, point);
}

/**
 * Finish a drag. Returns `settled: true` only when this pointer owned it, which is the
 * signal to record undo history and persist. Cancellation goes through the same path,
 * so a cancelled drag keeps the position already applied rather than being left mid-flight.
 */
export function endDrag(drag: Drag | null, pointerId: number): { drag: Drag | null; settled: boolean; before: TacticalPlayer[] | null } {
  if (!ownsDrag(drag, pointerId)) return { drag, settled: false, before: null };
  return { drag: null, settled: true, before: drag!.before };
}

/** How far the player centre sits from the pointer at grab time. Keeps the token from jumping under the finger. */
export type GrabOffset = { dx: number; dy: number };
export type SnapMode = 'off' | 'soft';

export function grabOffset(player: PitchPoint, pointer: PitchPoint): GrabOffset {
  return {
    dx: clampToPitch(player.x) - clampToPitch(pointer.x),
    dy: clampToPitch(player.y) - clampToPitch(pointer.y),
  };
}

/**
 * Place the player so the original grab point stays under the pointer, then clamp to the pitch.
 * Soft snap pulls a point onto a 5% grid only when it is already close, and never forces a landing.
 */
export function pointWithGrab(pointer: PitchPoint, grab: GrabOffset, mode: SnapMode = 'off'): PitchPoint {
  return snapPoint({ x: pointer.x + grab.dx, y: pointer.y + grab.dy }, mode);
}

export function snapPoint(point: PitchPoint, mode: SnapMode): PitchPoint {
  const raw = { x: clampToPitch(point.x), y: clampToPitch(point.y) };
  if (mode !== 'soft') return raw;
  const grid = 5;
  const threshold = 1.5;
  const axis = (value: number) => {
    const nearest = Math.round(value / grid) * grid;
    return Math.abs(nearest - value) <= threshold ? clampToPitch(nearest) : value;
  };
  return { x: axis(raw.x), y: axis(raw.y) };
}

export function samePoint(a: PitchPoint, b: PitchPoint, epsilon = 0.05): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}

/** Keyboard nudge in pitch percentages. The pitch stays physical: left decreases x. */
export function nudgePlayer(players: TacticalPlayer[], playerId: string, dx: number, dy: number): TacticalPlayer[] {
  const player = players.find(item => item.id === playerId);
  if (!player) return players;
  return movePlayerTo(players, playerId, { x: player.x + dx, y: player.y + dy });
}

export function renamePlayer(players: TacticalPlayer[], playerId: string, name: string, fallback: string): TacticalPlayer[] {
  const next = name.trim() || fallback;
  return players.map(player => player.id === playerId ? { ...player, name: next } : player);
}

/** Older or partial plans must not wipe the board. Unknown fields fall back; bad rows are skipped. */
export function readStoredPlayers(value: unknown, fallback: TacticalPlayer[]): TacticalPlayer[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const parsed: TacticalPlayer[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<TacticalPlayer>;
    if (typeof row.id !== 'string' || !row.id.trim()) continue;
    if (row.team !== 'home' && row.team !== 'away') continue;
    const x = Number(row.x);
    const y = Number(row.y);
    parsed.push({
      id: row.id,
      team: row.team,
      name: typeof row.name === 'string' && row.name.trim() ? row.name : fallback[0]?.name || 'Player',
      x: clampToPitch(x),
      y: clampToPitch(y),
      teamRole: typeof row.teamRole === 'string' ? row.teamRole : '',
      instruction: typeof row.instruction === 'string' ? row.instruction : '',
      captain: row.captain === true,
    });
  }
  return parsed.length ? parsed : fallback;
}
