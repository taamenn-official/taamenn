import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultPushPrefs, planReminderFacts, reminderJobId } from './pushSchedule.ts';

const kickoff = Date.parse('2026-10-02T19:00:00Z');

test('reminder ids are deterministic', () => {
  assert.equal(
    reminderJobId('LOCAL-1', 'remind-30', kickoff - 30 * 60_000, 'sub-1'),
    `LOCAL-1:remind-30:${kickoff - 30 * 60_000}:sub-1`,
  );
});

test('planning keeps 30 and 10 minute reminders and skips a disabled category', () => {
  const prefs = { ...defaultPushPrefs(), matchCreated: false };
  const facts = planReminderFacts({
    matchId: 'LOCAL-1',
    team1: 'Team A',
    team2: 'Team B',
    kickoff,
    endAt: kickoff + 60 * 60_000,
    status: 'UPCOMING',
    event: 'created',
    prefs,
    now: kickoff - 2 * 60 * 60_000,
  });
  assert.deepEqual(facts.map(item => item.type), ['remind-30', 'remind-10']);
});

test('a completed match does not schedule another kickoff reminder', () => {
  const facts = planReminderFacts({
    matchId: 'LOCAL-1',
    team1: 'Real Madrid',
    team2: 'Barcelona',
    kickoff,
    endAt: kickoff + 60 * 60_000,
    status: 'ARCHIVED',
    event: 'sync',
    prefs: defaultPushPrefs(),
    now: kickoff - 60 * 60_000,
  });
  assert.deepEqual(facts, []);
});
