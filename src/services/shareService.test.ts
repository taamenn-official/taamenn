import assert from 'node:assert/strict';
import test from 'node:test';
import type { Match } from '../data/footballData.ts';
import { classifySharedImport, decodeMatchShare, encodeMatchShare, matchShareSvg, materializeSharedMatch, requireShareSave, sharedMatchFingerprint } from './shareService.ts';

const sample: Match = {
  id: 'LOCAL-1',
  type: 'friendly',
  team1: 'TAAMEN',
  team2: 'Guests',
  score1: 2,
  score2: 1,
  status: 'FINISHED',
  dateLabel: '1 January 2026',
  dateKey: 20260101,
  story: 'Local fixture',
  stadium: 'Al Ahli',
  city: 'Hebron',
  time: '19:00',
  visibility: 'LOCAL',
  source: 'local',
};

function tokenFrom(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

test('private matches cannot be encoded for public share', () => {
  assert.throws(
    () => encodeMatchShare({ ...sample, visibility: 'PRIVATE' }),
    /Private matches cannot be publicly shared/,
  );
});

test('decode rejects a private visibility payload', () => {
  const token = tokenFrom({
    v: 2,
    type: 'friendly',
    team1: 'A',
    team2: 'B',
    score1: 0,
    score2: 0,
    status: 'UPCOMING',
    dateLabel: 'x',
    dateKey: 20260101,
    visibility: 'PRIVATE',
  });
  assert.equal(decodeMatchShare(token), null);
});

test('v5 preserves match id and originId while v3 uses a SHARED fingerprint id', () => {
  const token = encodeMatchShare(sample, { allowSave: false });
  const payload = decodeMatchShare(token);
  assert.ok(payload);
  assert.equal(payload.v, 5);
  assert.equal(payload.id, 'LOCAL-1');
  assert.equal(payload.originId, 'LOCAL-1');
  assert.equal(payload.allowSave, false);
  const first = materializeSharedMatch(payload);
  const second = materializeSharedMatch(payload);
  assert.equal(first.id, 'LOCAL-1');
  assert.equal(first.originId, 'LOCAL-1');
  assert.equal(first.id, second.id);
  assert.equal(first.visibility, 'LOCAL');
  assert.equal(first.source, 'local');
  assert.equal('v' in first, false);

  const v3 = tokenFrom({
    v: 3, type: 'friendly', team1: 'A', team2: 'B', score1: 0, score2: 0, status: 'UPCOMING',
    dateLabel: '', dateKey: 20260101, visibility: 'PUBLIC', allowSave: true,
  });
  const old = decodeMatchShare(v3);
  assert.ok(old);
  const materialized = materializeSharedMatch(old);
  assert.match(materialized.id, /^SHARED-[0-9a-f]+$/);
  assert.match(materialized.originId || '', /^share:/);
});

test('v2 links remain saveable while v3 permissions are explicit', () => {
  const oldToken=tokenFrom({
    v:2,type:'friendly',team1:'A',team2:'B',score1:0,score2:0,status:'UPCOMING',
    dateLabel:'',dateKey:20260101,visibility:'PUBLIC',
  });
  assert.equal(decodeMatchShare(oldToken)?.allowSave,true);
  assert.equal(decodeMatchShare(encodeMatchShare(sample))?.allowSave,false);
  assert.equal(decodeMatchShare(encodeMatchShare(sample,{allowSave:true}))?.allowSave,true);
});

test('fingerprint distinguishes materially different records',()=>{
  const base={team1:'A',team2:'B',dateKey:20260101,time:'19:00',score1:1,score2:0,stadium:'S'};
  assert.notEqual(sharedMatchFingerprint({...base,title:'First'}),sharedMatchFingerprint({...base,title:'Second'}));
  assert.notEqual(sharedMatchFingerprint({...base,type:'friendly'}),sharedMatchFingerprint({...base,type:'tournament'}));
  assert.notEqual(sharedMatchFingerprint({...base,status:'UPCOMING'}),sharedMatchFingerprint({...base,status:'FINISHED'}));
});

test('share payloads never include email, phone, or profile identity', () => {
  const payload = decodeMatchShare(encodeMatchShare({ ...sample, visibility: 'PUBLIC' }, { allowSave: true }));
  assert.ok(payload);
  assert.equal('email' in payload, false);
  assert.equal('phone' in payload, false);
  assert.equal('avatarData' in payload, false);
  assert.equal(payload.visibility, 'PUBLIC');
});

test('the same public fields produce the same fingerprint', () => {
  const a = sharedMatchFingerprint({ team1: 'TAAMEN', team2: 'Guests', dateKey: 20260101, time: '19:00', score1: 2, score2: 1, stadium: 'Al Ahli' });
  const b = sharedMatchFingerprint({ team1: 'TAAMEN', team2: 'Guests', dateKey: 20260101, time: '19:00', score1: 2, score2: 1, stadium: 'Al Ahli' });
  const c = sharedMatchFingerprint({ team1: 'TAAMEN', team2: 'Guests', dateKey: 20260102, time: '19:00', score1: 2, score2: 1, stadium: 'Al Ahli' });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('re-import classifies same origin as up-to-date, edited content as update, and id clash as collision', () => {
  const payload = decodeMatchShare(encodeMatchShare({ ...sample, originId: 'LOCAL-1' }, { allowSave: true }));
  assert.ok(payload);
  const incoming = materializeSharedMatch(payload);
  assert.equal(classifySharedImport(incoming, [incoming]).kind, 'up-to-date');
  assert.equal(classifySharedImport({ ...incoming, score1: 9, sharedFingerprint: 'changed' }, [{ ...incoming }]).kind, 'update-available');
  assert.equal(
    classifySharedImport(incoming, [{ ...incoming, stadium: 'Dura Stadium', sharedFingerprint: incoming.sharedFingerprint }]).kind,
    'update-available',
  );
  assert.equal(
    classifySharedImport(incoming, [{ ...incoming, id: 'LOCAL-1', originId: 'OTHER-ORIGIN' }]).kind,
    'collision',
  );
  assert.equal(classifySharedImport(incoming, []).kind, 'new');
});

test('tampered or oversized match tokens fail closed', () => {
  assert.equal(decodeMatchShare('%%%'), null);
  assert.equal(decodeMatchShare('a'.repeat(20_000)), null);
  assert.equal(decodeMatchShare(tokenFrom({ v: 4, team1: 'A', team2: 'B', dateKey: 99, visibility: 'PUBLIC' })), null);
  assert.equal(decodeMatchShare(tokenFrom({ v: 4, team1: 'A', team2: 'B', dateKey: 20260101, visibility: 'PRIVATE' })), null);
});

test('match share svg escapes names, scores, and stadium text', () => {
  const svg = matchShareSvg({
    ...sample,
    status: 'ARCHIVED',
    team1: '<A&B>',
    score1: '1<2' as unknown as number,
    score2: 0,
    stadium: "O'Field",
  });
  assert.equal(svg.includes('<A&B>'), false);
  assert.equal(svg.includes('&lt;A&amp;B&gt;'), true);
  assert.equal(svg.includes('1&lt;2'), true);
  assert.equal(svg.includes('O&apos;Field'), true);
});

test('v5 shares keep period structure and v4 links stay continuous', () => {
  const period = encodeMatchShare({
    ...sample,
    time: '19:00',
    durationMinutes: 65,
    timing: { mode: 'periods', periodCount: 2, periodMinutes: 30, breakMinutes: 5 },
  }, { allowSave: true });
  const payload = decodeMatchShare(period);
  assert.ok(payload);
  assert.equal(payload.v, 5);
  assert.equal(payload.timing?.mode, 'periods');
  if (payload.timing?.mode === 'periods') {
    assert.equal(payload.timing.periodCount, 2);
    assert.equal(payload.timing.periodMinutes, 30);
    assert.equal(payload.timing.breakMinutes, 5);
  }
  const saved = materializeSharedMatch(payload);
  assert.equal(saved.durationMinutes, 65);
  assert.equal(saved.timing?.mode, 'periods');
  assert.equal('email' in payload, false);
  assert.equal('phone' in payload, false);

  const legacy = decodeMatchShare(tokenFrom({
    v: 4, type: 'friendly', team1: 'A', team2: 'B', score1: 0, score2: 0, status: 'UPCOMING',
    dateLabel: '', dateKey: 20260101, visibility: 'PUBLIC', allowSave: true, time: '19:00',
  }));
  assert.ok(legacy);
  assert.equal(legacy.timing, undefined);
  assert.equal(materializeSharedMatch(legacy).durationMinutes, 60);

  const broken = decodeMatchShare(tokenFrom({
    v: 5, type: 'friendly', team1: 'A', team2: 'B', score1: 0, score2: 0, status: 'UPCOMING',
    dateLabel: '', dateKey: 20260101, visibility: 'PUBLIC', allowSave: true, time: '19:00',
    timing: { mode: 'periods', periodCount: 0, periodMinutes: -4, breakMinutes: 'nope' },
    durationMinutes: 90,
  }));
  assert.ok(broken);
  assert.equal(broken.timing, undefined);
  assert.equal(materializeSharedMatch(broken).durationMinutes, 90);
});

test('view-only shares are refused by the application-level save gate', () => {
  const payload = decodeMatchShare(encodeMatchShare(sample, { allowSave: false }));
  assert.ok(payload);
  assert.throws(() => requireShareSave(payload), /share-view-only/);
  const writable = decodeMatchShare(encodeMatchShare(sample, { allowSave: true }));
  assert.ok(writable);
  assert.doesNotThrow(() => requireShareSave(writable));
});
