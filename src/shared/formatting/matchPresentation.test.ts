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

test('period matches explain playing time separately from the occupied window', () => {
  const arabic = presentMatch({
    ...kickoff,
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 5 },
  }, 'ar', new Date('2026-01-01T12:00:00Z'));
  assert.equal(arabic.timeRange, '7 – 8:05 مساءً');
  assert.equal(arabic.summary, '2 × 30 دقيقة');
  assert.equal(arabic.breakLine, 'استراحة 5 دقائق');
  assert.equal(arabic.playingLine, '60 دقيقة لعب');
  assert.equal(arabic.rows.length, 3);
  assert.equal(arabic.rows[1]?.kind, 'break');
  assert.equal(arabic.finishTime, '8:05 مساءً');

  const english = presentMatch({
    ...kickoff,
    timing: { mode: 'periods', periodCount: 3, periodMinutes: 20, breakMinutes: 5 },
  }, 'en', new Date('2026-01-01T12:00:00Z'));
  assert.equal(english.summary, '3 × 20 minutes');
  assert.match(english.breakLine || '', /between periods/);
  assert.equal(english.rows.filter((row) => row.kind === 'break').length, 2);

  const quiet = presentMatch({
    ...kickoff,
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 0 },
  }, 'ar');
  assert.equal(quiet.breakLine, null);
  assert.equal(quiet.timeRange, '7 – 8 مساءً');
});

test('notification copy uses the same spoken range', () => {
  const line = notificationWhen(kickoff, 'ar', new Date('2026-09-28T08:00:00Z'));
  assert.match(line, /اليوم/);
  assert.match(line, /7 – 8 مساءً/);
  assert.doesNotMatch(line, /19:00|20:00/);
});
