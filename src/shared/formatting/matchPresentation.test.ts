import assert from 'node:assert/strict';
import test from 'node:test';
import { formatClockRange, notificationWhen, presentMatch, presentMatchDate } from './matchPresentation.ts';

const kickoff = {
  dateISO: '2026-09-28',
  dateKey: 20260928,
  time: '19:00',
  durationMinutes: 60,
};

test('arabic and english dates keep a numeric day and a written day', () => {
  const arabic = presentMatchDate('2026-09-28', 20260928, 'ar', new Date('2026-01-01T12:00:00Z'));
  const english = presentMatchDate('2026-09-28', 20260928, 'en', new Date('2026-01-01T12:00:00Z'));
  assert.equal(arabic.numericDate, '28/09/2026');
  assert.equal(english.numericDate, '28/09/2026');
  assert.equal(arabic.writtenDate, 'الإثنين، 28 سبتمبر 2026');
  assert.equal(english.writtenDate, 'Monday, 28 September 2026');
  assert.equal(arabic.relative, null);
  const today = presentMatchDate('2026-09-28', 20260928, 'en', new Date('2026-09-28T12:00:00Z'));
  assert.equal(today.relative, 'today');
  assert.equal(today.relativeLabel, 'Today');
  const tomorrow = presentMatchDate('2026-09-28', 20260928, 'ar', new Date('2026-09-27T12:00:00Z'));
  assert.equal(tomorrow.relative, 'tomorrow');
  assert.equal(tomorrow.relativeLabel, 'غدًا');
});

test('leap-day and month boundaries stay on the civil date', () => {
  assert.equal(presentMatchDate('2024-02-29', 20240229, 'en').numericDate, '29/02/2024');
  assert.equal(presentMatchDate('2024-02-29', 20240229, 'en').writtenDate, 'Thursday, 29 February 2024');
  assert.equal(presentMatchDate('2025-12-31', 20251231, 'ar').numericDate, '31/12/2025');
  assert.equal(presentMatchDate('2026-01-01', 20260101, 'ar').writtenDate, 'الخميس، 1 يناير 2026');
});

test('spoken ranges collapse a shared day-part and keep minutes only when needed', () => {
  assert.equal(formatClockRange('19:00', 60, 'ar'), '7 – 8 مساءً');
  assert.equal(formatClockRange('19:30', 60, 'ar'), '7:30 – 8:30 مساءً');
  assert.equal(formatClockRange('19:30', 90, 'ar'), '7:30 – 9 مساءً');
  assert.equal(formatClockRange('22:30', 105, 'ar'), '10:30 مساءً – 12:15 بعد منتصف الليل');
  assert.equal(formatClockRange('19:00', 60, 'en'), '7 – 8 PM');
  assert.equal(formatClockRange('19:30', 60, 'en'), '7:30 – 8:30 PM');
  assert.equal(formatClockRange('23:30', 60, 'en'), '11:30 PM – 12:30 AM');
  assert.equal(formatClockRange('23:30', 60, 'ar'), '11:30 مساءً – 12:30 بعد منتصف الليل');
});

test('a continuous match stays a window, without period language', () => {
  const view = presentMatch(kickoff, 'en', new Date('2026-01-01T12:00:00Z'));
  assert.equal(view.timeRange, '7 – 8 PM');
  assert.equal(view.summary, null);
  assert.equal(view.shortSummary, null);
  assert.equal(view.detailRows.length, 0);
  assert.equal(view.equation, null);
  assert.doesNotMatch(view.aria, /period|half|continuous/i);
});

test('period matches lead with the occupied window and a compact structure', () => {
  const halves = presentMatch({
    ...kickoff,
    time: '20:00',
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 25, breakMinutes: 10 },
  }, 'en', new Date('2026-01-01T12:00:00Z'));
  assert.equal(halves.timeRange, '8 – 9 PM');
  assert.equal(halves.summary, '2 halves · 25 min each · 10 min break');
  assert.equal(halves.shortSummary, '2 halves · 25 min · 10 min break');
  assert.equal(halves.equation, '25 + 10 + 25');
  assert.equal(halves.schedule.scheduledMinutes, 60);
  assert.deepEqual(halves.detailRows.map((row) => row.duration), ['25 min', '10 min', '25 min']);
  assert.equal(halves.detailRows.at(-1)?.kind, 'period');

  const arabic = presentMatch({
    ...kickoff,
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 5 },
  }, 'ar', new Date('2026-01-01T12:00:00Z'));
  assert.equal(arabic.timeRange, '7 – 8:05 مساءً');
  assert.equal(arabic.summary, 'شوطان · 30 دقيقة لكل شوط · استراحة 5 دقائق');
  assert.equal(arabic.shortSummary, 'شوطان · 30 دقيقة · استراحة 5 دقائق');
  assert.equal(arabic.detailRows[1]?.kind, 'break');

  const three = presentMatch({
    ...kickoff,
    time: '20:00',
    timing: { mode: 'periods', periodCount: 3, periodMinutes: 20, breakMinutes: 5 },
  }, 'en', new Date('2026-01-01T12:00:00Z'));
  assert.equal(three.timeRange, '8 – 9:10 PM');
  assert.equal(three.summary, '3 periods · 20 min each · 5 min breaks');
  assert.equal(three.equation, '20 + 5 + 20 + 5 + 20');
  assert.equal(three.schedule.scheduledMinutes, 70);
  assert.equal(three.detailRows.filter((row) => row.kind === 'break').length, 2);

  const threeArabic = presentMatch({
    ...kickoff,
    time: '20:00',
    timing: { mode: 'periods', periodCount: 3, periodMinutes: 20, breakMinutes: 5 },
  }, 'ar', new Date('2026-01-01T12:00:00Z'));
  assert.equal(threeArabic.shortSummary, '3 أشواط · 20 دقيقة · استراحتان × 5 دقائق');

  const quiet = presentMatch({
    ...kickoff,
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 0 },
  }, 'en');
  assert.equal(quiet.summary, '2 halves · 30 min each');
  assert.equal(quiet.detailRows.some((row) => row.kind === 'break'), false);
  assert.equal(quiet.timeRange, '7 – 8 PM');
});

test('notification copy uses the spoken window and only a compact structure', () => {
  const line = notificationWhen(kickoff, 'ar', new Date('2026-09-28T08:00:00Z'));
  assert.match(line, /اليوم/);
  assert.match(line, /7 – 8 مساءً/);
  assert.doesNotMatch(line, /19:00|20:00|شوط|فترة/);
  const periods = notificationWhen({
    ...kickoff,
    time: '20:00',
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 25, breakMinutes: 10 },
  }, 'en', new Date('2026-01-01T12:00:00Z'));
  assert.match(periods, /8 – 9 PM/);
  assert.match(periods, /2 halves · 25 min · 10 min break/);
  assert.doesNotMatch(periods, /First half|Half 1/);
});
