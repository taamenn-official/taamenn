import type { MatchTiming } from '../../data/footballData.ts';

/** Recreational fixtures stay inside a day. Period rules follow the product limits. */
export const TIMING_LIMITS = {
  continuousMinutes: { min: 1, max: 1440 },
  periodCount: { min: 1, max: 6 },
  periodMinutes: { min: 1, max: 180 },
  breakMinutes: { min: 0, max: 60 },
} as const;

export const DEFAULT_CONTINUOUS_MINUTES = 60;
export const DEFAULT_PERIOD_COUNT = 2;
export const DEFAULT_PERIOD_MINUTES = 30;
export const DEFAULT_BREAK_MINUTES = 5;

export type TimingIssue = 'duration' | 'periodCount' | 'periodMinutes' | 'breakMinutes';

export type TimingDraft = {
  mode: 'continuous' | 'periods';
  duration: string;
  periodCount: string;
  periodMinutes: string;
  breakMinutes: string;
};

export type ScheduleSegment = {
  kind: 'period' | 'break';
  /** 1-based period index, or the break that follows that period. */
  index: number;
  startOffset: number;
  endOffset: number;
};

export type MatchSchedule = {
  mode: 'continuous' | 'periods';
  periodCount: number;
  periodMinutes: number;
  breakMinutesEach: number;
  /** Breaks sit between periods only, so this is always periodCount - 1 in period mode. */
  breakCount: number;
  playingMinutes: number;
  totalBreakMinutes: number;
  scheduledMinutes: number;
  segments: ScheduleSegment[];
};

const DAY_MINUTES = 24 * 60;

function readInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function inRange(value: number | null, min: number, max: number): value is number {
  return value !== null && value >= min && value <= max;
}

/** Legacy matches stored only `durationMinutes`. Invalid numbers fall back to 60. */
export function legacyDurationMinutes(value: unknown): number {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return DEFAULT_CONTINUOUS_MINUTES;
  const minutes = Math.trunc(numeric);
  if (minutes < TIMING_LIMITS.continuousMinutes.min) return DEFAULT_CONTINUOUS_MINUTES;
  if (minutes > TIMING_LIMITS.continuousMinutes.max) return TIMING_LIMITS.continuousMinutes.max;
  return minutes;
}

export function sanitizeStoredTiming(value: unknown): MatchTiming | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.mode === 'continuous') {
    const durationMinutes = readInt(raw.durationMinutes);
    if (!inRange(durationMinutes, TIMING_LIMITS.continuousMinutes.min, TIMING_LIMITS.continuousMinutes.max)) return null;
    return { mode: 'continuous', durationMinutes };
  }
  if (raw.mode === 'periods') {
    const periodCount = readInt(raw.periodCount);
    const periodMinutes = readInt(raw.periodMinutes);
    const breakMinutes = readInt(raw.breakMinutes);
    if (!inRange(periodCount, TIMING_LIMITS.periodCount.min, TIMING_LIMITS.periodCount.max)) return null;
    if (!inRange(periodMinutes, TIMING_LIMITS.periodMinutes.min, TIMING_LIMITS.periodMinutes.max)) return null;
    if (!inRange(breakMinutes, TIMING_LIMITS.breakMinutes.min, TIMING_LIMITS.breakMinutes.max)) return null;
    return { mode: 'periods', periodCount, periodMinutes, breakMinutes };
  }
  return null;
}

export function scheduleFromTiming(timing: MatchTiming): MatchSchedule {
  if (timing.mode === 'continuous') {
    const playingMinutes = timing.durationMinutes ?? DEFAULT_CONTINUOUS_MINUTES;
    return {
      mode: 'continuous',
      periodCount: 1,
      periodMinutes: playingMinutes,
      breakMinutesEach: 0,
      breakCount: 0,
      playingMinutes,
      totalBreakMinutes: 0,
      scheduledMinutes: playingMinutes,
      segments: [{ kind: 'period', index: 1, startOffset: 0, endOffset: playingMinutes }],
    };
  }
  const periodCount = timing.periodCount ?? DEFAULT_PERIOD_COUNT;
  const periodMinutes = timing.periodMinutes ?? DEFAULT_PERIOD_MINUTES;
  const breakMinutesEach = timing.breakMinutes ?? 0;
  const breakCount = Math.max(0, periodCount - 1);
  const playingMinutes = periodCount * periodMinutes;
  const totalBreakMinutes = breakCount * breakMinutesEach;
  const segments: ScheduleSegment[] = [];
  let cursor = 0;
  for (let index = 1; index <= periodCount; index += 1) {
    segments.push({ kind: 'period', index, startOffset: cursor, endOffset: cursor + periodMinutes });
    cursor += periodMinutes;
    if (index < periodCount && breakMinutesEach > 0) {
      segments.push({ kind: 'break', index, startOffset: cursor, endOffset: cursor + breakMinutesEach });
      cursor += breakMinutesEach;
    }
  }
  return {
    mode: 'periods',
    periodCount,
    periodMinutes,
    breakMinutesEach,
    breakCount,
    playingMinutes,
    totalBreakMinutes,
    scheduledMinutes: playingMinutes + totalBreakMinutes,
    segments,
  };
}

export function scheduleFromMatch(match: { durationMinutes?: number; timing?: unknown }): MatchSchedule {
  const timing = sanitizeStoredTiming(match.timing);
  if (timing) return scheduleFromTiming(timing);
  return scheduleFromTiming({ mode: 'continuous', durationMinutes: legacyDurationMinutes(match.durationMinutes) });
}

/** Wall-clock minutes from midnight, wrapping through subsequent days. */
export function addClockMinutes(time: string, minutes: number): { minutesOfDay: number; dayOffset: number } | null {
  if (!/^\d{2}:\d{2}$/.test(time) || !Number.isInteger(minutes)) return null;
  const [hour, minute] = time.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;
  const total = hour * 60 + minute + minutes;
  return {
    dayOffset: Math.floor(total / DAY_MINUTES),
    minutesOfDay: ((total % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES,
  };
}

export function blankTimingDraft(): TimingDraft {
  return {
    mode: 'continuous',
    duration: String(DEFAULT_CONTINUOUS_MINUTES),
    periodCount: String(DEFAULT_PERIOD_COUNT),
    periodMinutes: String(DEFAULT_PERIOD_MINUTES),
    breakMinutes: String(DEFAULT_BREAK_MINUTES),
  };
}

export function timingDraftFromMatch(match: { durationMinutes?: number; timing?: unknown }): TimingDraft {
  const timing = sanitizeStoredTiming(match.timing);
  if (timing?.mode === 'periods') {
    return {
      mode: 'periods',
      duration: String((timing.periodCount ?? DEFAULT_PERIOD_COUNT) * (timing.periodMinutes ?? DEFAULT_PERIOD_MINUTES)),
      periodCount: String(timing.periodCount),
      periodMinutes: String(timing.periodMinutes),
      breakMinutes: String(timing.breakMinutes),
    };
  }
  const minutes = timing?.mode === 'continuous' ? timing.durationMinutes : legacyDurationMinutes(match.durationMinutes);
  return { ...blankTimingDraft(), mode: 'continuous', duration: String(minutes) };
}

export function timingIssues(draft: TimingDraft): TimingIssue[] {
  if (draft.mode === 'continuous') {
    return inRange(readInt(draft.duration), TIMING_LIMITS.continuousMinutes.min, TIMING_LIMITS.continuousMinutes.max) ? [] : ['duration'];
  }
  const issues: TimingIssue[] = [];
  if (!inRange(readInt(draft.periodCount), TIMING_LIMITS.periodCount.min, TIMING_LIMITS.periodCount.max)) issues.push('periodCount');
  if (!inRange(readInt(draft.periodMinutes), TIMING_LIMITS.periodMinutes.min, TIMING_LIMITS.periodMinutes.max)) issues.push('periodMinutes');
  if (!inRange(readInt(draft.breakMinutes), TIMING_LIMITS.breakMinutes.min, TIMING_LIMITS.breakMinutes.max)) issues.push('breakMinutes');
  return issues;
}

export function timingFromDraft(draft: TimingDraft): { timing: MatchTiming; schedule: MatchSchedule } | null {
  if (timingIssues(draft).length) return null;
  if (draft.mode === 'continuous') {
    const timing: MatchTiming = { mode: 'continuous', durationMinutes: readInt(draft.duration)! };
    return { timing, schedule: scheduleFromTiming(timing) };
  }
  const timing: MatchTiming = {
    mode: 'periods',
    periodCount: readInt(draft.periodCount)!,
    periodMinutes: readInt(draft.periodMinutes)!,
    breakMinutes: readInt(draft.breakMinutes)!,
  };
  return { timing, schedule: scheduleFromTiming(timing) };
}

/** Stable share/fingerprint token. Empty means "same as a legacy duration-only match". */
export function timingFingerprint(timing: unknown): string {
  const clean = sanitizeStoredTiming(timing);
  if (!clean) return '';
  if (clean.mode === 'continuous' && clean.durationMinutes === DEFAULT_CONTINUOUS_MINUTES) return '';
  if (clean.mode === 'continuous') return `c:${clean.durationMinutes}`;
  return `p:${clean.periodCount}x${clean.periodMinutes}+${clean.breakMinutes}`;
}
