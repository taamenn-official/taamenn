import type { Match } from '../../data/footballData.ts';
import {
  addClockMinutes,
  scheduleFromMatch,
  type MatchSchedule,
  type ScheduleSegment,
} from '../../domain/matches/matchTiming.ts';
import { scheduleCopy, type Language } from '../../i18n/translations.ts';
import { dateKeyToISO, todayInTimeZone } from './dateTime.ts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DASH = '\u2013';

const WEEKDAYS = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
} as const;

const MONTHS = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const;

type ArabicPeriod = 'midnight' | 'morning' | 'noon' | 'afternoon' | 'evening';
type EnglishPeriod = 'AM' | 'PM';

export type ScheduleRow = {
  kind: 'period' | 'break';
  label: string;
  range: string;
};

export type MatchPresentation = {
  numericDate: string;
  writtenDate: string;
  weekday: string;
  relative: 'today' | 'tomorrow' | null;
  relativeLabel: string | null;
  timeRange: string;
  timeParts: ClockRangeParts | null;
  summary: string;
  breakLine: string | null;
  playingLine: string | null;
  rows: ScheduleRow[];
  finishLabel: string;
  finishTime: string;
  aria: string;
  schedule: MatchSchedule;
};

function isoFromMatch(dateISO: string | undefined, dateKey: number): string {
  const slice = dateISO?.slice(0, 10) || '';
  return DATE_RE.test(slice) ? slice : dateKeyToISO(dateKey);
}

function shiftISODate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function minutePhrase(count: number, language: Language): string {
  const copy = scheduleCopy[language];
  if (language === 'en') return count === 1 ? `1 ${copy.minuteOne}` : `${count} ${copy.minuteMany}`;
  if (count === 1) return `1 ${copy.minuteOne}`;
  if (count === 2) return `2 ${copy.minuteTwo}`;
  if (count >= 3 && count <= 10) return `${count} ${copy.minuteFew}`;
  return `${count} ${copy.minuteMany}`;
}

function clockFace(minutesOfDay: number): string {
  const hour24 = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  const hour12 = hour24 % 12 || 12;
  return minute === 0 ? String(hour12) : `${hour12}:${pad(minute)}`;
}

function arabicPeriod(minutesOfDay: number): ArabicPeriod {
  const hour = Math.floor(minutesOfDay / 60);
  if (hour === 0) return 'midnight';
  if (hour < 12) return 'morning';
  if (hour < 15) return 'noon';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function englishPeriod(minutesOfDay: number): EnglishPeriod {
  return Math.floor(minutesOfDay / 60) < 12 ? 'AM' : 'PM';
}

function periodWord(minutesOfDay: number, language: Language): string {
  const copy = scheduleCopy[language];
  if (language === 'ar') return copy.periodsWord[arabicPeriod(minutesOfDay)];
  return englishPeriod(minutesOfDay) === 'AM' ? copy.am : copy.pm;
}

export function formatClockPoint(time: string, language: Language): string {
  const point = addClockMinutes(time, 0);
  if (!point) return '—';
  return `${clockFace(point.minutesOfDay)} ${periodWord(point.minutesOfDay, language)}`;
}

export type ClockRangeParts = {
  startClock: string;
  endClock: string;
  startPeriod: string;
  endPeriod: string;
  samePeriod: boolean;
};

export function clockRangeParts(start: string, scheduledMinutes: number, language: Language): ClockRangeParts | null {
  const from = addClockMinutes(start, 0);
  const to = addClockMinutes(start, scheduledMinutes);
  if (!from || !to) return null;
  const samePeriod = language === 'ar'
    ? arabicPeriod(from.minutesOfDay) === arabicPeriod(to.minutesOfDay)
    : englishPeriod(from.minutesOfDay) === englishPeriod(to.minutesOfDay);
  return {
    startClock: clockFace(from.minutesOfDay),
    endClock: clockFace(to.minutesOfDay),
    startPeriod: periodWord(from.minutesOfDay, language),
    endPeriod: periodWord(to.minutesOfDay, language),
    samePeriod,
  };
}

export function formatClockRange(start: string, scheduledMinutes: number, language: Language): string {
  const parts = clockRangeParts(start, scheduledMinutes, language);
  if (!parts) return '—';
  if (parts.samePeriod) return `${parts.startClock} ${DASH} ${parts.endClock} ${parts.startPeriod}`;
  return `${parts.startClock} ${parts.startPeriod} ${DASH} ${parts.endClock} ${parts.endPeriod}`;
}

function formatOffsetRange(start: string, segment: ScheduleSegment, language: Language): string {
  const from = addClockMinutes(start, segment.startOffset);
  const to = addClockMinutes(start, segment.endOffset);
  if (!from || !to) return '—';
  const startClock = clockFace(from.minutesOfDay);
  const endClock = clockFace(to.minutesOfDay);
  const startPeriod = periodWord(from.minutesOfDay, language);
  const endPeriod = periodWord(to.minutesOfDay, language);
  const same = language === 'ar'
    ? arabicPeriod(from.minutesOfDay) === arabicPeriod(to.minutesOfDay)
    : englishPeriod(from.minutesOfDay) === englishPeriod(to.minutesOfDay);
  if (same) return `${startClock} ${DASH} ${endClock} ${startPeriod}`;
  return `${startClock} ${startPeriod} ${DASH} ${endClock} ${endPeriod}`;
}

export function presentMatchDate(dateISO: string | undefined, dateKey: number, language: Language, now = new Date()) {
  const iso = isoFromMatch(dateISO, dateKey);
  const [year, month, day] = iso.split('-').map(Number);
  const stamp = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(Date.UTC(year, (month || 1) - 1, day || 1))
    : new Date(Date.UTC(1970, 0, 1));
  const safeYear = stamp.getUTCFullYear();
  const safeMonth = stamp.getUTCMonth();
  const safeDay = stamp.getUTCDate();
  const weekday = WEEKDAYS[language][stamp.getUTCDay()];
  const monthName = MONTHS[language][safeMonth];
  const numericDate = `${pad(safeDay)}/${pad(safeMonth + 1)}/${safeYear}`;
  const writtenDate = language === 'ar'
    ? `${weekday}، ${safeDay} ${monthName} ${safeYear}`
    : `${weekday}, ${safeDay} ${monthName} ${safeYear}`;
  const today = todayInTimeZone('Asia/Jerusalem', now);
  const relative = iso === today ? 'today' : iso === shiftISODate(today, 1) ? 'tomorrow' : null;
  const copy = scheduleCopy[language];
  return {
    numericDate,
    writtenDate,
    weekday,
    relative: relative as 'today' | 'tomorrow' | null,
    relativeLabel: relative === 'today' ? copy.today : relative === 'tomorrow' ? copy.tomorrow : null,
  };
}

function periodLabel(index: number, count: number, language: Language): string {
  const copy = scheduleCopy[language];
  if (count === 2 && index <= 2) return index === 1 ? copy.firstHalf : copy.secondHalf;
  return copy.period.replace('{n}', String(index));
}

function summaryFor(schedule: MatchSchedule, language: Language): { summary: string; breakLine: string | null; playingLine: string | null } {
  const copy = scheduleCopy[language];
  if (schedule.mode === 'continuous') {
    return {
      summary: `${copy.continuous} • ${minutePhrase(schedule.playingMinutes, language)}`,
      breakLine: null,
      playingLine: null,
    };
  }
  const structure = `${schedule.periodCount} × ${minutePhrase(schedule.periodMinutes, language)}`;
  if (schedule.breakMinutesEach <= 0) {
    return { summary: structure, breakLine: null, playingLine: minutePhrase(schedule.playingMinutes, language) };
  }
  const breakText = schedule.breakCount > 1
    ? `${copy.break} ${minutePhrase(schedule.breakMinutesEach, language)} ${copy.betweenPeriods}`
    : `${copy.break} ${minutePhrase(schedule.breakMinutesEach, language)}`;
  return {
    summary: structure,
    breakLine: breakText,
    playingLine: `${minutePhrase(schedule.playingMinutes, language)} ${copy.playing}`,
  };
}

export function presentMatch(match: Pick<Match, 'dateISO' | 'dateKey' | 'time' | 'durationMinutes' | 'timing' | 'stadium' | 'city'>, language: Language, now = new Date()): MatchPresentation {
  const schedule = scheduleFromMatch(match);
  const date = presentMatchDate(match.dateISO, match.dateKey, language, now);
  const copy = scheduleCopy[language];
  const timeParts = match.time ? clockRangeParts(match.time, schedule.scheduledMinutes, language) : null;
  const timeRange = timeParts ? formatClockRange(match.time!, schedule.scheduledMinutes, language) : '—';
  const finish = match.time ? addClockMinutes(match.time, schedule.scheduledMinutes) : null;
  const finishTime = finish ? `${clockFace(finish.minutesOfDay)} ${periodWord(finish.minutesOfDay, language)}` : '—';
  const text = summaryFor(schedule, language);
  const rows: ScheduleRow[] = match.time
    ? schedule.segments.map((segment) => ({
      kind: segment.kind,
      label: segment.kind === 'period' ? periodLabel(segment.index, schedule.periodCount, language) : copy.break,
      range: formatOffsetRange(match.time!, segment, language),
    }))
    : [];
  const aria = [date.relativeLabel, date.numericDate, date.writtenDate, timeRange, text.summary, text.breakLine].filter(Boolean).join(' · ');
  return {
    ...date,
    timeRange,
    timeParts,
    summary: text.summary,
    breakLine: text.breakLine,
    playingLine: text.playingLine,
    rows: schedule.mode === 'periods' ? rows : [],
    finishLabel: copy.expectedFinish,
    finishTime,
    aria,
    schedule,
  };
}

/** Notification line: relative day when it helps, always with the spoken time range. */
export function notificationWhen(match: Pick<Match, 'dateISO' | 'dateKey' | 'time' | 'durationMinutes' | 'timing'>, language: Language, now = new Date()): string {
  const view = presentMatch(match, language, now);
  const day = view.relativeLabel || view.numericDate;
  return `${day} · ${view.timeRange}`;
}
