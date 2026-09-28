const TZ = 'Asia/Jerusalem';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dateKeyToISO(dateKey: number): string {
  if (dateKey > 99_999_999) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(dateKey));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  const value = String(Math.trunc(dateKey)).padStart(8, '0');
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

/** Backward-compatible name used by older callers. */
export const parseDateKey = dateKeyToISO;

export function dateISOToKey(date: string): number {
  const value = date.slice(0, 10);
  return DATE_RE.test(value) ? Number(value.replaceAll('-', '')) : 0;
}

export function todayInTimeZone(timeZone = TZ, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function timeZoneOffset(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value || 0);
  return Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second')) - timestamp;
}

/**
 * Converts a football fixture's local wall-clock date/time into an instant.
 * Iterating once handles DST boundaries in the configured IANA timezone.
 */
export function zonedDateTimeToEpoch(date: string, time = '00:00', timeZone = TZ): number {
  if (!DATE_RE.test(date) || !/^\d{2}:\d{2}$/.test(time)) return Number.NaN;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, 0);
  let result = wallClock - timeZoneOffset(wallClock, timeZone);
  result = wallClock - timeZoneOffset(result, timeZone);
  return result;
}

export function formatMatchDate(dateISO: string | undefined, dateKey: number, language: 'ar' | 'en') {
  const iso = DATE_RE.test(dateISO?.slice(0, 10) || '') ? dateISO!.slice(0, 10) : dateKeyToISO(dateKey);
  const [year, month, day] = iso.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12));
  const locale = language === 'ar' ? 'ar-PS' : 'en-GB';
  return {
    weekday: value.toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' }),
    date: value.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    compact: value.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' }),
  };
}

export function formatMatchTime(time: string | undefined) {
  return time || '—';
}

export const PALESTINE_TIMEZONE = TZ;
