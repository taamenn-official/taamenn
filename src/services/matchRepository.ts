import type { Match, MatchTiming, MatchType } from '../data/footballData';
import { sanitizeStoredTiming, scheduleFromTiming, legacyDurationMinutes } from '../domain/matches/matchTiming';
import { getAll, getItem, putItem, deleteItem } from './localDb';
import { emitMatchNotification } from './notificationService';
import {
  canonicalStatus,
  hasRecordedResult,
  isArchiveStatus,
  matchStartTime,
  normalizeMatch,
  projectedStatus,
  statusAfterResult,
  validScore,
} from './matchLifecycle';
import { dateISOToKey, formatMatchDate, PALESTINE_TIMEZONE } from '../shared/formatting/dateTime';
import { classifySharedImport, materializeSharedMatch, requireShareSave, type MatchSharePayload, type SharedImportDecision, type SharedImportKind } from './shareService';
import { nextLifecycleDelay } from '../domain/matches/lifecycleSchedule.ts';

let repositoryReady: Promise<void> | null = null;

/** Migration and normalization run once per page lifecycle, including after a failed attempt. */
export function ensureMatchRepositoryReady() {
  if (!repositoryReady) {
    repositoryReady = initMatchRepository().catch(error => {
      repositoryReady = null;
      throw error;
    });
  }
  return repositoryReady;
}

export function resetMatchRepositoryReadyForTests() {
  repositoryReady = null;
}

function announceChange(){
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('taamen-matches-changed'));
}

async function putCanonical(match:Match){
  const value=normalizeMatch(match);
  await putItem('matches',value);
  announceChange();
  return value;
}

/** Moves old archive-only records into the one canonical collection, then removes the duplicate. */
export async function migrateLegacyArchiveRecords(){
  const archived=await getAll<Match>('archive');
  for(const record of archived){
    const existing=await getItem<Match>('matches',record.id);
    if(!existing)await putItem('matches',normalizeMatch(record));
    await deleteItem('archive',record.id);
  }
}

export async function initMatchRepository(){
  await migrateLegacyArchiveRecords();
  const records=await getAll<Match>('matches');
  for(const record of records){
    const normalized=normalizeMatch(record);
    if(JSON.stringify(normalized)!==JSON.stringify(record))await putItem('matches',normalized);
  }
}

function queuePush(match: Match, event: 'created' | 'updated' | 'result-pending' | 'sync') {
  void import('./pushScheduleClient.ts').then(mod => mod.scheduleMatchPush(match, event)).catch(() => undefined);
}

export async function listMatches():Promise<Match[]>{
  await ensureMatchRepositoryReady();
  return (await getAll<Match>('matches'))
    .map(normalizeMatch)
    .sort((a,b)=>(b.dateKey-a.dateKey)||(Number(b.createdAt||0)-Number(a.createdAt||0)));
}

export async function createLocalUpcomingMatch(input:{title?:string;team1:string;team2:string;stadium:string;city:string;date:string;time:string;durationMinutes?:number;timing?:MatchTiming;note?:string;type?:MatchType;visibility?:'LOCAL'|'PUBLIC'}) {
  const dateKey=dateISOToKey(input.date); if(!dateKey)throw new Error('Invalid date/time');
  const timing=input.timing?sanitizeStoredTiming(input.timing):sanitizeStoredTiming({mode:'continuous',durationMinutes:legacyDurationMinutes(input.durationMinutes)});
  if(!timing)throw new Error('invalid-timing');
  const now=Date.now(); const id=`LOCAL-${now}-${Math.random().toString(36).slice(2,9)}`;
  const match:Match={id,originId:id,type:input.type||'normal',team1:input.team1||'TAAMEN',team2:input.team2||'Opponent',score1:0,score2:0,status:'UPCOMING',dateLabel:formatMatchDate(input.date,dateKey,'en').date,dateISO:input.date,dateKey,story:input.note||'',title:input.title||`${input.team1} × ${input.team2}`,stadium:input.stadium,city:input.city,time:input.time,timezone:PALESTINE_TIMEZONE,durationMinutes:scheduleFromTiming(timing).scheduledMinutes,timing,visibility:input.visibility||'LOCAL',source:'local',createdAt:now,updatedAt:now};
  const value=await putCanonical(match);
  await emitMatchNotification(value,'created',now);
  queuePush(value,'created');
  void import('./challengeQueue.ts').then(mod => mod.rememberChallengeEvent('match_created', value.id, { localMatchId: value.id })).catch(() => undefined);
  return value;
}

export async function updateMatch(match:Match){
  const value=await putCanonical({...match,updatedAt:Date.now()});
  await emitMatchNotification(value,'edited');
  queuePush(value,'updated');
  return value;
}

export async function deleteMatch(id:string){
  await deleteItem('matches',id);
  await deleteItem('archive',id);
  announceChange();
  void import('./pushScheduleClient.ts').then(mod => mod.cancelMatchPush(id)).catch(() => undefined);
}

export async function archiveMatch(id:string){
  const current=(await listMatches()).find(x=>x.id===id);
  if(!current)throw new Error('Match not found');
  if(!hasRecordedResult(current.status))throw new Error('result-required');
  const now=Date.now();
  const archived=await putCanonical({...current,status:'ARCHIVED',archivedAt:now,updatedAt:now,source:'local'});
  await emitMatchNotification(archived,'archived',now);
  return archived;
}

export async function recordMatchResult(id:string,score1:number,score2:number,story?:string,playerContributions?:Match['playerContributions'],matchFormat?:Match['matchFormat']){
  if(!validScore(score1)||!validScore(score2))throw new Error('invalid-score');
  const current=(await listMatches()).find(x=>x.id===id);
  if(!current)throw new Error('Match not found');
  if(!isArchiveStatus(current.status))throw new Error('match-not-completed');
  const now=Date.now();
  const format=matchFormat==='7v7'?'7v7':'5v5';
  const cap=format==='7v7'?7:5;
  const clipped=playerContributions?{team1:playerContributions.team1.slice(0,cap),team2:playerContributions.team2.slice(0,cap)}:undefined;
  const value=await putCanonical({...current,score1,score2,story:story??current.story,playerContributions:clipped,matchFormat:format,status:statusAfterResult(current.status),resultRecordedAt:now,updatedAt:now});
  await emitMatchNotification(value,'result-recorded',now);
  return value;
}

/** Backward-compatible repository API. */
export async function finishMatch(id:string,score1:number,score2:number,story=''){
  return recordMatchResult(id,score1,score2,story);
}

export async function createArchivedMatch(input:{team1:string;team2:string;score1:number;score2:number;date:string;time:string;stadium?:string;city?:string;type?:MatchType;timing?:MatchTiming}){
  if(!validScore(input.score1)||!validScore(input.score2)||!dateISOToKey(input.date))throw new Error('invalid-archive-match');
  const timing=input.timing===undefined
    ? {mode:'continuous' as const,durationMinutes:60}
    : sanitizeStoredTiming(input.timing);
  if(!timing)throw new Error('invalid-timing');
  const now=Date.now();
  const id=`LOCAL-${now}-${Math.random().toString(36).slice(2,9)}`;
  const match:Match={
    id,
    originId:id,
    type:input.type||'friendly',
    team1:input.team1,
    team2:input.team2,
    score1:input.score1,
    score2:input.score2,
    status:'ARCHIVED',
    dateISO:input.date,
    dateKey:dateISOToKey(input.date),
    dateLabel:formatMatchDate(input.date,dateISOToKey(input.date),'en').date,
    time:input.time,
    timezone:PALESTINE_TIMEZONE,
    durationMinutes:scheduleFromTiming(timing).scheduledMinutes,
    timing,
    stadium:input.stadium,
    city:input.city,
    story:'',
    visibility:'LOCAL',
    source:'local',
    createdAt:now,
    updatedAt:now,
    completedAt:now,
    resultRecordedAt:now,
    archivedAt:now,
  };
  const value=await putCanonical(match);
  await emitMatchNotification(value,'archived',now);
  return value;
}

export async function reconcileMatchLifecycle(now=Date.now()){
  const matches=await listMatches();
  let changed=false;
  const roster:Match[]=[];
  for(const match of matches){
    const current=canonicalStatus(match.status);
    const next=projectedStatus(match,now);
    const start=matchStartTime(match);
    if(current==='UPCOMING'&&start-now>0&&start-now<=24*60*60*1000)await emitMatchNotification(match,'approaching',now);
    if(next!==current){
      const value=await putCanonical({
        ...match,
        status:next,
        completedAt:next==='COMPLETED_PENDING_RESULT'?now:match.completedAt,
        updatedAt:now,
      });
      changed=true;
      if(next==='ACTIVE')await emitMatchNotification(value,'started',now);
      if(next==='COMPLETED_PENDING_RESULT'){await emitMatchNotification(value,'result-pending',now);queuePush(value,'result-pending');}
      roster.push(value);
    } else roster.push(match);
  }
  return { changed, nextDelayMs: nextLifecycleDelay(roster, now) };
}

export async function findLocalMatch(id:string){
  await ensureMatchRepositoryReady();
  const inMatches=await getItem<Match>('matches',id);
  if(inMatches)return {store:'matches' as const,match:inMatches};
  return null;
}

export type SharedImportResult = SharedImportKind | 'created' | 'updated';

export async function inspectSharedMatch(payload:MatchSharePayload):Promise<SharedImportDecision>{
  return classifySharedImport(materializeSharedMatch(payload), await listMatches());
}

export async function importSharedMatch(
  payload:MatchSharePayload,
  destination:'match-center'|'archive',
  options?:{replace?:boolean;saveAsNew?:boolean},
):Promise<SharedImportResult>{
  // Application-level gate only: a crafted token can flip this flag.
  requireShareSave(payload);
  const incoming=materializeSharedMatch(payload);
  if(incoming.visibility==='PRIVATE'||incoming.source==='legacy')throw new Error('invalid-current-record');
  const locals=await listMatches();
  const decision=classifySharedImport(incoming,locals);
  const resolvedDestination=isArchiveStatus(incoming.status)?'archive':'match-center';
  if(destination==='archive'&&resolvedDestination!=='archive')throw new Error('invalid-destination');
  const now=Date.now();
  const asRecord=(match:Match,id:string,createdAt?:number):Match=>({
    ...match,
    id,
    originId:match.originId,
    visibility:'LOCAL',
    source:'local',
    createdAt:createdAt||match.createdAt||now,
    updatedAt:now,
    status:resolvedDestination==='archive'&&hasRecordedResult(match.status)?'ARCHIVED':canonicalStatus(match.status),
  });
  if(decision.kind==='up-to-date')return 'up-to-date';
  if(decision.kind==='update-available'){
    if(!options?.replace)return 'update-available';
    const local=decision.local!;
    const value=await putCanonical(asRecord(incoming,local.id,local.createdAt));
    await emitMatchNotification(value,'shared-imported',now);
    return 'updated';
  }
  if(decision.kind==='collision'){
    if(!options?.saveAsNew)return 'collision';
    const id=`LOCAL-${now}-${Math.random().toString(36).slice(2,9)}`;
    const value=await putCanonical(asRecord(incoming,id));
    await emitMatchNotification(value,'shared-imported',now);
    return 'created';
  }
  const value=await putCanonical(asRecord(incoming,incoming.id));
  await emitMatchNotification(value,'shared-imported',now);
  return 'created';
}
