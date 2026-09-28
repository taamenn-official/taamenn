import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, Edit3, Plus, Share2, Trash2, X } from 'lucide-react';
import type { Match, MatchType } from '../data/footballData';
import {
  createLocalUpcomingMatch,
  deleteMatch,
  listMatches,
  reconcileMatchLifecycle,
  updateMatch,
} from '../services/matchRepository';
import { canonicalStatus, isMatchCenterStatus, matchEndTime, matchStartTime, projectedStatus } from '../services/matchLifecycle';
import { archiveCopy, matchUiCopy } from '../i18n/translations';
import { dateISOToKey, formatMatchDate, PALESTINE_TIMEZONE, todayInTimeZone, zonedDateTimeToEpoch } from '../shared/formatting/dateTime';
import TaamenDatePicker from '../components/TaamenDatePicker';
import MatchShareModal from '../components/MatchShareModal';
import MatchScheduleBlock from '../components/MatchScheduleBlock';
import MatchTimingFields from '../components/MatchTimingFields';
import { blankTimingDraft, timingDraftFromMatch, timingFromDraft, type TimingDraft } from '../domain/matches/matchTiming';
import { scheduleCopy } from '../i18n/translations';
import { useOverlayPresence } from '../motion/useOverlayPresence';

type Draft={title:string;team1:string;team2:string;stadium:string;city:string;date:string;time:string;timing:TimingDraft;note:string;type:MatchType;visibility:'LOCAL'|'PUBLIC'};
const blank=():Draft=>({title:'',team1:'TAAMEN',team2:'',stadium:'',city:'',date:todayInTimeZone(),time:'20:00',timing:blankTimingDraft(),note:'',type:'normal',visibility:'LOCAL'});

function MatchEditor({language,initial,onClose,onSaved}:{language:'ar'|'en';initial:Match|null;onClose:()=>void;onSaved:()=>void}){
  const copy=matchUiCopy[language];
  const types=archiveCopy[language];
  const[draft,setDraft]=useState<Draft>(()=>initial?{
    title:initial.title||'',team1:initial.team1,team2:initial.team2,stadium:initial.stadium||'',city:initial.city||'',
    date:initial.dateISO?.slice(0,10)||'',time:initial.time||'',timing:timingDraftFromMatch(initial),note:initial.story||'',type:initial.type,
    visibility:initial.visibility==='PUBLIC'?'PUBLIC':'LOCAL',
  }:blank());
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);
  const{backdropRef,panelRef,requestClose}=useOverlayPresence<HTMLButtonElement,HTMLElement>('modal',onClose);
  const set=<K extends keyof Draft>(key:K,value:Draft[K])=>setDraft(current=>({...current,[key]:value}));
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(!draft.team1.trim()||!draft.team2.trim()||!draft.stadium.trim()||!draft.city.trim()||!draft.date||!draft.time){setError(copy.required);return}
    if(!Number.isFinite(zonedDateTimeToEpoch(draft.date,draft.time,PALESTINE_TIMEZONE))){setError(copy.invalidDate);return}
    const timing=timingFromDraft(draft.timing);
    if(!timing){setError(scheduleCopy[language].invalidTiming);return}
    setBusy(true);setError('');
    try{
      if(initial){
        const dateKey=dateISOToKey(draft.date);
        await updateMatch({...initial,title:draft.title.trim()||`${draft.team1} × ${draft.team2}`,team1:draft.team1.trim(),team2:draft.team2.trim(),stadium:draft.stadium.trim(),city:draft.city.trim(),dateISO:draft.date,dateKey,dateLabel:formatMatchDate(draft.date,dateKey,'en').date,time:draft.time,durationMinutes:timing.schedule.scheduledMinutes,timing:timing.timing,story:draft.note.trim(),type:draft.type,visibility:draft.visibility});
      }else await createLocalUpcomingMatch({title:draft.title.trim(),team1:draft.team1.trim(),team2:draft.team2.trim(),stadium:draft.stadium.trim(),city:draft.city.trim(),date:draft.date,time:draft.time,durationMinutes:timing.schedule.scheduledMinutes,timing:timing.timing,note:draft.note.trim(),type:draft.type,visibility:draft.visibility});
      onSaved();onClose();
    }catch{setError(copy.invalidDate)}finally{setBusy(false)}
  };
  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="match-editor-title">
    <button ref={backdropRef} className="overlay-backdrop" onClick={requestClose} aria-label={copy.cancel}/>
    <aside ref={panelRef} className="modal-card match-editor-modal">
      <header className="panel-heading"><div><p className="eyebrow">TAAMEN / MATCH</p><h2 id="match-editor-title">{initial?copy.editTitle:copy.createTitle}</h2></div><button className="icon-button" onClick={requestClose} aria-label={copy.cancel}><X/></button></header>
      <form className="match-form" onSubmit={save}>
        <div className="form-grid"><label>{copy.team1} *<input value={draft.team1} onChange={event=>set('team1',event.target.value)} required/></label><label>{copy.team2} *<input value={draft.team2} onChange={event=>set('team2',event.target.value)} required/></label></div>
        <label>{copy.matchTitle}<input value={draft.title} onChange={event=>set('title',event.target.value)}/></label>
        <div className="form-grid"><label>{copy.stadium} *<input value={draft.stadium} onChange={event=>set('stadium',event.target.value)} required/></label><label>{copy.city} *<input value={draft.city} onChange={event=>set('city',event.target.value)} required/></label></div>
        <div className="form-grid"><label>{copy.date} *<TaamenDatePicker value={draft.date} onChange={value=>set('date',value)} language={language} required/></label><label>{copy.time} *<input type="time" value={draft.time} onChange={event=>set('time',event.target.value)} required/></label></div>
        <MatchTimingFields language={language} date={draft.date} time={draft.time} draft={draft.timing} onChange={value=>set('timing',value)}/>
        <label>{copy.type}<select value={draft.type} onChange={event=>set('type',event.target.value as MatchType)}>{(['normal','friendly','competitive','tournament','strong'] as MatchType[]).map(value=><option key={value} value={value}>{({normal:types.normal,friendly:types.friendly,competitive:types.competitive,tournament:types.tournament,strong:types.strong})[value]}</option>)}</select></label>
        <label>{copy.visibility}<select value={draft.visibility} onChange={event=>set('visibility',event.target.value as Draft['visibility'])}><option value="LOCAL">{copy.local}</option><option value="PUBLIC">{copy.public}</option></select></label>
        <label className="form-span-2">{copy.note}<textarea rows={3} value={draft.note} onChange={event=>set('note',event.target.value)}/></label>
        {error&&<div className="error-banner" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="dark-action" onClick={requestClose}>{copy.cancel}</button><button className="primary-action" disabled={busy}>{busy?copy.saving:copy.save}</button></div>
      </form>
    </aside>
  </div>;
}

function Countdown({match,language,now}:{match:Match;language:'ar'|'en';now:number}){
  const copy=matchUiCopy[language];
  const target=canonicalStatus(match.status)==='ACTIVE'?matchEndTime(match):matchStartTime(match);
  const seconds=Math.max(0,Math.floor((target-now)/1000));
  const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;
  return <div className="match-countdown" aria-live="off"><span><b>{days}</b><small>{copy.day}</small></span><span><b>{hours}</b><small>{copy.hours}</small></span><span><b>{minutes}</b><small>{copy.minutes}</small></span><span><b>{secs}</b><small>{copy.seconds}</small></span></div>;
}

export default function Matches({language}:{language:'ar'|'en'}){
  const copy=matchUiCopy[language];
  const[matches,setMatches]=useState<Match[]>([]);
  const[editor,setEditor]=useState<{open:boolean;match:Match|null}>({open:false,match:null});
  const[share,setShare]=useState<Match|null>(null);
  const[now,setNow]=useState(Date.now());
  const[msg,setMsg]=useState('');
  const matchesRef=useRef(matches);
  matchesRef.current=matches;
  const load=useCallback(async()=>{await reconcileMatchLifecycle();setMatches((await listMatches()).filter(match=>isMatchCenterStatus(match.status)))},[]);
  useEffect(()=>{
    void load();
    const tick=window.setInterval(()=>{
      const t=Date.now();
      setNow(t);
      if(matchesRef.current.some(match=>projectedStatus(match,t)!==canonicalStatus(match.status))) void load();
    },1000);
    const refresh=()=>void load();
    window.addEventListener('taamen-matches-changed',refresh);
    return()=>{clearInterval(tick);window.removeEventListener('taamen-matches-changed',refresh)};
  },[load]);
  const active=matches.filter(match=>canonicalStatus(match.status)==='ACTIVE');
  const upcoming=matches.filter(match=>canonicalStatus(match.status)==='UPCOMING').sort((a,b)=>matchStartTime(a)-matchStartTime(b));
  const next=upcoming[0]||active[0];
  const remove=async(match:Match)=>{if(!window.confirm(copy.deleteConfirm))return;await deleteMatch(match.id);setMsg('');await load()};
  const card=(match:Match,hero=false)=>{
    return <article className={`current-match-card${hero?' is-next':''}${canonicalStatus(match.status)==='ACTIVE'?' is-active':''}`} key={match.id}>
      <div className="current-match-top"><span className={`status-pill ${canonicalStatus(match.status).toLowerCase()}`}>{canonicalStatus(match.status)==='ACTIVE'?copy.active:copy.upcoming}</span></div>
      <MatchScheduleBlock match={match} language={language} variant="card" showVenue now={new Date(now)}>
        <div className="current-match-teams"><strong>{match.team1}</strong><b>VS</b><strong>{match.team2}</strong></div>
      </MatchScheduleBlock>
      <Countdown match={match} language={language} now={now}/>
      <div className="current-match-actions"><button className="dark-action compact" onClick={()=>setEditor({open:true,match})}><Edit3 size={14}/>{copy.edit}</button><button className="dark-action compact" onClick={()=>setShare(match)}><Share2 className="icon-share" size={14}/>{copy.share}</button><button className="icon-button danger" onClick={()=>void remove(match)} aria-label={copy.delete}><Trash2 size={15}/></button></div>
    </article>;
  };
  const remaining=matches.filter(match=>match.id!==next?.id);
  return <section className="page-content matches-page">
    <div className="page-heading"><div><span className="eyebrow">TAAMEN / MATCH CENTER</span><h1>{copy.matchCenter}</h1><p>{copy.matchCenterDesc}</p></div><button className="primary-action" onClick={()=>setEditor({open:true,match:null})}><Plus size={16}/>{copy.create}</button></div>
    {msg&&<div className="success-banner">{msg}</div>}
    {next&&<section className="next-match-section"><header><CalendarClock size={18}/><h2>{copy.nextMatch}</h2></header>{card(next,true)}</section>}
    {(active.length>0||remaining.length>0)&&<section className="matches-list-section"><h2>{copy.yourMatches}</h2><div className="current-match-grid">{remaining.map(match=>card(match))}</div></section>}
    {!matches.length&&<div className="empty-state"><CalendarClock size={25}/><strong>{copy.noMatches}</strong><span>{copy.noMatchesBody}</span><button className="primary-action" onClick={()=>setEditor({open:true,match:null})}>{copy.createFirst}</button></div>}
    {editor.open&&<MatchEditor language={language} initial={editor.match} onClose={()=>setEditor({open:false,match:null})} onSaved={()=>{setMsg(copy.saved);void load()}}/>}
    {share&&<MatchShareModal match={share} language={language} onClose={()=>setShare(null)}/>}
  </section>;
}
