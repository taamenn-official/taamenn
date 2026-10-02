import { Archive, ChevronRight, UserRound, Goal } from 'lucide-react';
import type { Match } from '../data/footballData';
import type { RouteId } from '../config/routes';
import MatchCard from '../components/MatchCard';
import { useEffect, useRef, useState } from 'react';
import { listCurrentArchive } from '../services/archiveRepository';
import { hasRecordedResult } from '../services/matchLifecycle';
import { api, type Session } from '../services/apiClient';
import { matchUiCopy, uiCopy } from '../i18n/translations';
import { useHomeEntrance, useHomeMatchReveal } from '../motion/useHomeEntrance';
import AdSlot from '../components/monetization/AdSlot';

export default function Home({language,go,profile,session=null}:{language:'ar'|'en';go:(p:RouteId)=>void;profile?:{firstName:string};session?:Session|null}) {
  const ar=language==='ar';
  const featured=session?.authMethod==='code';
  const [archive,setArchive]=useState<Match[]>([]);
  const [error,setError]=useState('');
  const root=useRef<HTMLElement>(null);

  useEffect(()=>{
    let active=true;
    setError('');
    const refresh=()=>{
      const load=featured?api.historicalMatches():listCurrentArchive();
      load.then(items=>{if(active)setArchive(items)}).catch(()=>{
        if(!active)return;
        setArchive([]);
        setError(ar?'تعذر تحميل السجل.':'The archive could not be loaded.');
      });
    };
    refresh();
    window.addEventListener('taamen-matches-changed',refresh);
    return()=>{active=false;window.removeEventListener('taamen-matches-changed',refresh)};
  },[featured,ar]);

  const latest=archive.filter(hasRecordedResult).slice(0,3);
  const recorded=archive.filter(m=>hasRecordedResult(m.status));
  const total=archive.length;
  const decided=recorded.filter(m=>m.score1!==m.score2).length;
  const draws=recorded.filter(m=>m.score1===m.score2).length;

  // `data-ta-motion` marks entrance groups, `data-ta-icons` marks the icon rise.
  useHomeEntrance(root);
  useHomeMatchReveal(root,latest.length);

  return <section className="page-content home-page" ref={root}>
    <div className="home-hero home-hero-single">
      <div className="home-hero-copy">
        <p className="eyebrow" data-ta-motion="greeting">TAAMEN 2.0 / HOME</p>
        <h1 data-ta-motion="greeting">{session ? (ar?`مرحبًا ${session.member.arabicName||session.member.displayName}`:`Welcome ${session.member.displayName}`) : (ar?`أهلًا ${profile?.firstName||''}`:`Welcome ${profile?.firstName||''}`)}</h1>
        <p data-ta-motion="greeting">{featured?(ar?'استكشف حضورك التاريخي في TAAMEN.':'Explore your historical TAAMEN presence.'):(ar?'كرة القدم كما يجب أن تُعرض: هادئة، واضحة، ومحلية أولًا.':'Football presented as it should be: calm, clear, and local-first.')}</p>
        <div className="home-actions" data-ta-motion="cta" data-ta-icons><button className="primary-action" onClick={()=>go(featured?'historical-match-center':'archive')}><Archive size={16}/>{featured?matchUiCopy[language].historicalTitle:(ar?'استكشف السجل':'Explore archive')}</button>{!featured&&<button className="dark-action" onClick={()=>go('profile')}><UserRound size={16}/>{ar?'الملف الشخصي':'Profile'}</button>}</div>
      </div>
    </div>
    {error&&<div className="error-banner" role="alert">{error}</div>}
    <div className="stats-grid home-stats">
      <button type="button" className="stat-card stat-dark" data-ta-motion="card" onClick={()=>go(featured?'historical-match-center':'archive')}>
        <span>{ar?'السجل':'Archive'}</span><strong>{total}</strong><small>{featured?(ar?'سجلات تاريخية':'historical records'):(ar?'سجلات متاحة':'available records')}</small>
      </button>
      <button type="button" className="stat-card stat-lime" data-ta-motion="card" onClick={()=>go(featured?'historical-match-center':'archive')}>
        <span>{ar?'المواجهات الحاسمة':'Decided matches'}</span><strong>{decided}</strong><small>{ar?'نتيجة غير متعادلة':'non-draw results'}</small>
      </button>
      <button type="button" className="stat-card stat-pale" data-ta-motion="card" onClick={()=>go(featured?'historical-match-center':'archive')}>
        <span>{ar?'التعادلات':'Draws'}</span><strong>{draws}</strong><small>{ar?'بدون فائز':'no winner'}</small>
      </button>
      <button type="button" className="stat-card stat-glass home-venues-card" data-ta-motion="card" onClick={()=>go('stadiums')} aria-label={uiCopy[language].openVenues}>
        <span className="home-venues-icon" data-ta-icons aria-hidden="true"><Goal size={18}/></span>
        <strong>{uiCopy[language].venuesTitle}</strong>
        <small>{uiCopy[language].venuesDesc}</small>
      </button>
    </div>
    <AdSlot placement="home" />
    <section className="panel archive-preview-panel" data-ta-motion="panel">
      <div className="panel-heading"><div><p className="eyebrow">{featured?'TAAMEN / HISTORY':(ar?'من السجل':'FROM THE ARCHIVE')}</p><h2>{ar?'أحدث المواجهات':'Latest matches'}</h2></div><button className="text-button" data-ta-icons onClick={()=>go(featured?'historical-match-center':'archive')}>{ar?'عرض الكل':'View all'}<ChevronRight size={15}/></button></div>
      <div className="home-match-list">{latest.map(m=><MatchCard key={m.id} match={m} language={language} featured={featured}/>)}</div>
    </section>
  </section>;
}
