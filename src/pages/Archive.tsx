import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Plus, Search, Share2, Trophy } from 'lucide-react';
import type { Match, MatchType } from '../data/footballData';
import { listCurrentArchive } from '../services/archiveRepository';
import { canonicalStatus } from '../services/matchLifecycle';
import { archiveCopy, matchUiCopy } from '../i18n/translations';
import MatchCard from '../components/MatchCard';
import ArchiveDetailModal from '../components/ArchiveDetailModal';
import AddArchiveModal from '../components/AddArchiveModal';
import ResultEntryModal from '../components/ResultEntryModal';
import MatchShareModal from '../components/MatchShareModal';
import AdSlot from '../components/monetization/AdSlot';
import { RouteSkeleton } from '../components/RouteSkeleton';
import { pendingSectionStartsOpen } from './archivePending';

export default function Archive({language}:{language:'ar'|'en'}) {
  const copy=matchUiCopy[language];
  const types=archiveCopy[language];
  const[items,setItems]=useState<Match[]>([]);
  const[query,setQuery]=useState('');
  const[type,setType]=useState<'all'|MatchType>('all');
  const[selected,setSelected]=useState<Match|null>(null);
  const[resultMatch,setResultMatch]=useState<Match|null>(null);
  const[shareMatch,setShareMatch]=useState<Match|null>(null);
  const[showAdd,setShowAdd]=useState(false);
  const[ready,setReady]=useState(false);
  const load=useCallback(()=>listCurrentArchive().then(next=>{setItems(next);setReady(true)}).catch(()=>{setItems([]);setReady(true)}),[]);
  useEffect(()=>{
    void load();
    const refresh=()=>void load();
    window.addEventListener('taamen-matches-changed',refresh);
    return()=>window.removeEventListener('taamen-matches-changed',refresh);
  },[load]);
  const filtered=useMemo(()=>items.filter(match=>{
    const haystack=`${match.team1} ${match.team2} ${match.stadium||''} ${match.city||''}`.toLowerCase();
    return(!query||haystack.includes(query.toLowerCase()))&&(type==='all'||match.type===type);
  }),[items,query,type]);
  const pending=filtered.filter(match=>canonicalStatus(match.status)==='COMPLETED_PENDING_RESULT');
  const recorded=filtered.filter(match=>canonicalStatus(match.status)!=='COMPLETED_PENDING_RESULT');
  const pendingDismissed=useRef(false);
  const [pendingOpen,setPendingOpen]=useState(false);
  useEffect(()=>{
    if(!ready||pendingDismissed.current)return;
    setPendingOpen(pendingSectionStartsOpen(pending.length, false));
  },[ready,pending.length]);
  const typeLabel=(value:MatchType)=>({friendly:types.friendly,normal:types.normal,competitive:types.competitive,tournament:types.tournament,strong:types.strong})[value];
  if(!ready)return <RouteSkeleton page="archive"/>;
  const grid=(matches:Match[],empty:string,pendingResult=false)=>matches.length?<div className="archive-grid">{matches.map(match=><MatchCard key={match.id} match={match} language={language} onClick={()=>setSelected(match)} actions={<>
    {pendingResult&&<button className="primary-action compact" onClick={()=>setResultMatch(match)}><Trophy size={14}/>{copy.enterResult}</button>}
    {!pendingResult&&match.visibility!=='PRIVATE'&&<button className="dark-action compact" onClick={()=>setShareMatch(match)}><Share2 size={14}/>{copy.share}</button>}
  </>}/>)}</div>:<div className="empty-state archive-empty"><span>{empty}</span></div>;

  return <section className="page-content archive-page">
    <div className="page-heading">
      <div><span className="eyebrow">TAAMEN / ARCHIVE</span><h1>{copy.archive}</h1><p>{copy.archiveDesc}</p></div>
      <button className="primary-action" onClick={()=>setShowAdd(true)}><Plus size={15}/>{copy.addArchived}</button>
    </div>
    <div className="archive-source-note"><span>{copy.sourceLocal}</span><b>{items.length} {copy.records}</b></div>
    <div className="archive-toolbar">
      <label className="archive-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy.searchArchive}/></label>
      <select className="archive-type-select" value={type} onChange={event=>setType(event.target.value as 'all'|MatchType)} aria-label={copy.type}>
        <option value="all">{copy.allTypes}</option>
        {(['friendly','normal','competitive','tournament','strong'] as MatchType[]).map(value=><option key={value} value={value}>{typeLabel(value)}</option>)}
      </select>
    </div>
    <section className={`archive-lifecycle-section is-pending${pendingOpen?' is-open':''}`}>
      <header>
        <button type="button" className="archive-disclosure" aria-expanded={pendingOpen} onClick={()=>{
          setPendingOpen(open=>{
            const next=!open;
            if(!next)pendingDismissed.current=true;
            return next;
          });
        }}>
          <div><Clock3 size={19}/><span><h2>{copy.pendingSection}</h2><p>{pending.length?copy.pendingBody:copy.noPending}</p></span></div>
          <b>{pending.length}</b>
        </button>
      </header>
      {pendingOpen&&grid(pending,copy.noPending,true)}
    </section>
    <section className="archive-lifecycle-section is-recorded">
      <header><div><Trophy size={19}/><span><h2>{copy.recordedSection}</h2><p>{copy.recordedBody}</p></span></div><b>{recorded.length}</b></header>
      {grid(recorded,query?copy.trySearch:copy.noRecorded)}
    </section>
    <AdSlot placement="archive" />
    {recorded.length >= 3 && <AdSlot placement="archive-follow" />}
    {selected&&<ArchiveDetailModal match={selected} language={language} onClose={()=>setSelected(null)} onShare={()=>{setShareMatch(selected);setSelected(null)}}/>}
    {resultMatch&&<ResultEntryModal match={resultMatch} language={language} onClose={()=>setResultMatch(null)} onSaved={load}/>}
    {shareMatch&&<MatchShareModal match={shareMatch} language={language} onClose={()=>setShareMatch(null)}/>}
    {showAdd&&<AddArchiveModal language={language} onClose={()=>{setShowAdd(false);void load()}}/>}
  </section>;
}
