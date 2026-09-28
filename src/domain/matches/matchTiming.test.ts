import assert from 'node:assert/strict';
import test from 'node:test';
import { addClockMinutes, legacyDurationMinutes, scheduleFromMatch, scheduleFromTiming, timingFromDraft, timingIssues } from './matchTiming.ts';

test('a 60-minute continuous match ends an hour after kickoff', () => {
  const schedule = scheduleFromTiming({ mode: 'continuous', durationMinutes: 60 });
  assert.equal(schedule.playingMinutes, 60);
  assert.equal(schedule.scheduledMinutes, 60);
  assert.equal(schedule.totalBreakMinutes, 0);
  assert.deepEqual(addClockMinutes('19:00', schedule.scheduledMinutes), { minutesOfDay: 20 * 60, dayOffset: 0 });
});

test('2 x 30 with a 5 minute break occupies 65 minutes and one break', () => {
  const schedule = scheduleFromTiming({ mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 5 });
  assert.equal(schedule.playingMinutes, 60);
  assert.equal(schedule.totalBreakMinutes, 5);
  assert.equal(schedule.breakCount, 1);
  assert.equal(schedule.scheduledMinutes, 65);
  assert.equal(schedule.segments.filter((segment) => segment.kind === 'break').length, 1);
  assert.deepEqual(addClockMinutes('19:00', schedule.scheduledMinutes), { minutesOfDay: 20 * 60 + 5, dayOffset: 0 });
  assert.equal(schedule.segments[0]?.endOffset, 30);
  assert.equal(schedule.segments[1]?.startOffset, 30);
  assert.equal(schedule.segments[1]?.endOffset, 35);
  assert.equal(schedule.segments[2]?.startOffset, 35);
});

test('2 x 30 with a 10 minute break finishes at 20:10', () => {
  const schedule = scheduleFromTiming({ mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 10 });
  assert.equal(schedule.scheduledMinutes, 70);
  assert.deepEqual(addClockMinutes('19:00', schedule.scheduledMinutes), { minutesOfDay: 20 * 60 + 10, dayOffset: 0 });
});

test('3 x 20 with 5 minute breaks uses two breaks and finishes at 20:10', () => {
  const schedule = scheduleFromTiming({ mode: 'periods', periodCount: 3, periodMinutes: 20, breakMinutes: 5 });
  assert.equal(schedule.playingMinutes, 60);
  assert.equal(schedule.breakCount, 2);
  assert.equal(schedule.totalBreakMinutes, 10);
  assert.equal(schedule.scheduledMinutes, 70);
  assert.equal(schedule.segments.filter((segment) => segment.kind === 'break').length, 2);
  assert.equal(schedule.segments.at(-1)?.kind, 'period');
});

test('a zero break is omitted from the segment list', () => {
  const schedule = scheduleFromTiming({ mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 0 });
  assert.equal(schedule.scheduledMinutes, 60);
  assert.equal(schedule.segments.some((segment) => segment.kind === 'break'), false);
});

test('kickoff near midnight rolls the finish into the next day', () => {
  assert.deepEqual(addClockMinutes('23:30', 60), { minutesOfDay: 30, dayOffset: 1 });
  assert.deepEqual(addClockMinutes('23:30', 120), { minutesOfDay: 90, dayOffset: 1 });
  const split = scheduleFromTiming({ mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 10 });
  assert.equal(split.scheduledMinutes, 70);
  assert.deepEqual(addClockMinutes('23:30', split.scheduledMinutes), { minutesOfDay: 40, dayOffset: 1 });
  assert.deepEqual(addClockMinutes('00:00', 60), { minutesOfDay: 60, dayOffset: 0 });
});

test('legacy duration-only matches stay continuous', () => {
  const schedule = scheduleFromMatch({ durationMinutes: 60 });
  assert.equal(schedule.mode, 'continuous');
  assert.equal(schedule.playingMinutes, 60);
  assert.equal(schedule.scheduledMinutes, 60);
  assert.equal(legacyDurationMinutes(undefined), 60);
  assert.equal(legacyDurationMinutes('nope'), 60);
  assert.equal(scheduleFromMatch({ durationMinutes: 90, timing: { mode: 'nope' } }).playingMinutes, 90);
});

test('timing drafts reject empty, negative, and out-of-range values', () => {
  assert.deepEqual(timingIssues({ mode: 'continuous', duration: '0', periodCount: '2', periodMinutes: '30', breakMinutes: '5' }), ['duration']);
  assert.ok(timingIssues({ mode: 'periods', duration: '60', periodCount: '0', periodMinutes: '30', breakMinutes: '5' }).includes('periodCount'));
  assert.ok(timingIssues({ mode: 'periods', duration: '60', periodCount: '7', periodMinutes: '30', breakMinutes: '5' }).includes('periodCount'));
  assert.ok(timingIssues({ mode: 'periods', duration: '60', periodCount: '2', periodMinutes: '181', breakMinutes: '5' }).includes('periodMinutes'));
  assert.ok(timingIssues({ mode: 'periods', duration: '60', periodCount: '2', periodMinutes: '30', breakMinutes: '-1' }).includes('breakMinutes'));
  assert.ok(timingIssues({ mode: 'periods', duration: '60', periodCount: '2', periodMinutes: '30', breakMinutes: '61' }).includes('breakMinutes'));
  assert.equal(timingFromDraft({ mode: 'continuous', duration: 'abc', periodCount: '2', periodMinutes: '30', breakMinutes: '5' }), null);
  const parsed = timingFromDraft({ mode: 'periods', duration: '60', periodCount: '4', periodMinutes: '15', breakMinutes: '5' });
  assert.equal(parsed?.schedule.playingMinutes, 60);
  assert.equal(parsed?.schedule.breakCount, 3);
  assert.equal(parsed?.schedule.scheduledMinutes, 75);
});
