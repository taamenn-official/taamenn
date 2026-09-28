import assert from 'node:assert/strict';
import test from 'node:test';
import type { Match } from '../data/footballData.ts';
import { dateISOToKey, zonedDateTimeToEpoch } from '../shared/formatting/dateTime.ts';
import { canonicalStatus, hasRecordedResult, matchEndTime, normalizeMatch, projectedStatus, statusAfterResult } from './matchLifecycle.ts';

const fixture=(patch:Partial<Match>={}):Match=>{
  const base:Match={
    id:'LOCAL-1',type:'friendly',team1:'A',team2:'B',score1:0,score2:0,status:'UPCOMING',
    dateLabel:'',dateISO:'2026-09-15',dateKey:20260915,time:'20:00',timezone:'Asia/Jerusalem',
    durationMinutes:60,visibility:'LOCAL',source:'local',story:'',
  };
  return {...base,...patch,story:patch.story??base.story};
};

test('legacy status and millisecond date keys migrate to the canonical model',()=>{
  const migrated=normalizeMatch(fixture({status:'FINISHED',dateISO:undefined,dateKey:Date.UTC(2026,8,15,12)}));
  assert.equal(migrated.status,'COMPLETED_WITH_RESULT');
  assert.equal(migrated.dateKey,20260915);
  assert.equal(migrated.dateISO,'2026-09-15');
  assert.equal(migrated.originId,'LOCAL-1');
});

test('schedule drives upcoming, active, and result-pending transitions',()=>{
  const match=fixture();
  const start=zonedDateTimeToEpoch('2026-09-15','20:00','Asia/Jerusalem');
  assert.equal(projectedStatus(match,start-1),'UPCOMING');
  assert.equal(projectedStatus(match,start),'ACTIVE');
  assert.equal(projectedStatus(match,start+60*60_000),'COMPLETED_PENDING_RESULT');
});

test('pending scores are not recorded results, and recording does not demote archived matches',()=>{
  assert.equal(hasRecordedResult('COMPLETED_PENDING_RESULT'),false);
  assert.equal(hasRecordedResult('COMPLETED_WITH_RESULT'),true);
  assert.equal(hasRecordedResult('ARCHIVED'),true);
  assert.equal(statusAfterResult('COMPLETED_PENDING_RESULT'),'COMPLETED_WITH_RESULT');
  assert.equal(statusAfterResult('ARCHIVED'),'ARCHIVED');
});

test('period breaks extend full time without counting as playing time', () => {
  const match = fixture({
    time: '19:00',
    durationMinutes: 60,
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 5 },
  });
  const normalized = normalizeMatch(match);
  assert.equal(normalized.durationMinutes, 65);
  assert.equal(normalized.timing?.mode, 'periods');
  const start = zonedDateTimeToEpoch('2026-09-15', '19:00', 'Asia/Jerusalem');
  assert.equal(matchEndTime(match) - start, 65 * 60_000);
  assert.equal(projectedStatus(match, start + 60 * 60_000), 'ACTIVE');
  assert.equal(projectedStatus(match, start + 65 * 60_000), 'COMPLETED_PENDING_RESULT');
  const legacy = normalizeMatch(fixture({ durationMinutes: 60, timing: undefined }));
  assert.equal(legacy.durationMinutes, 60);
  assert.equal(legacy.timing, undefined);
});

test('recorded and archived states never regress during reconciliation',()=>{
  assert.equal(projectedStatus(fixture({status:'COMPLETED_WITH_RESULT'}),Date.now()),'COMPLETED_WITH_RESULT');
  assert.equal(projectedStatus(fixture({status:'ARCHIVED'}),Date.now()),'ARCHIVED');
  assert.equal(canonicalStatus('انتهت'),'COMPLETED_WITH_RESULT');
  assert.equal(dateISOToKey('2026-09-15'),20260915);
});
