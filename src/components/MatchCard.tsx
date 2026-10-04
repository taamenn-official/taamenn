import type { Match, MatchStatus } from '../data/footballData';
import type { ReactNode } from 'react';
import { archiveCopy, matchUiCopy } from '../i18n/translations';
import { canonicalStatus, hasRecordedResult } from '../services/matchLifecycle';
import MatchScheduleBlock from './MatchScheduleBlock';

function winnerFor(match: Match): 'team1'|'team2'|'draw' {
  if (match.score1 > match.score2) return 'team1';
  if (match.score2 > match.score1) return 'team2';
  return 'draw';
}

function typeLabel(type: Match['type'], ar: boolean) {
  const t=archiveCopy[ar?'ar':'en'];
  return ({friendly:t.friendly,normal:t.normal,competitive:t.competitive,tournament:t.tournament,strong:t.strong} as Record<string,string>)[type] || t.other;
}

export default function MatchCard({match,language,featured=false,onClick,actions}:{match:Match;language:'ar'|'en';featured?:boolean;onClick?:()=>void;actions?:ReactNode}) {
  const ar=language==='ar';
  const status=canonicalStatus(match.status);
  const recorded=hasRecordedResult(status);
  const winner=winnerFor(match);
  const accent=match.type;
  const confetti=!recorded||winner==='draw'?null:<div className={`winner-confetti ${winner}`} aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i} className={`confetti-piece piece-${i}`}/>)}</div>;
  const statusCopy:Record<MatchStatus,string>={UPCOMING:matchUiCopy[language].upcoming,ACTIVE:matchUiCopy[language].active,COMPLETED_PENDING_RESULT:matchUiCopy[language].resultPending,COMPLETED_WITH_RESULT:matchUiCopy[language].resultRecorded,ARCHIVED:matchUiCopy[language].archived};
  const meta=[
    match.stadium ? { text: match.stadium, secondary: false } : null,
    match.city ? { text: match.city, secondary: true } : null,
    match.id ? { text: `#${match.id}`, secondary: true } : null,
  ].filter((item): item is { text: string; secondary: boolean } => Boolean(item));
  return <article className={`match-card match-card-premium type-${accent} ${recorded?(winner!=='draw'?`has-winner winner-${winner}`:'is-draw'):'result-pending'} ${featured?'is-featured':''}`} onClick={onClick} tabIndex={onClick?0:undefined} onKeyDown={event=>{if(onClick&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onClick()}}} aria-label={`${match.team1} ${ar?'مقابل':'vs'} ${match.team2}${recorded?` - ${match.score1}:${match.score2}`:''}`} >
    {confetti}
    <div className="match-card-top">
      <span className={`match-type ${accent}`}>{typeLabel(match.type,ar)}</span>
      <span>{statusCopy[status]}</span>
    </div>
    <MatchScheduleBlock match={match} language={language} variant="compact">
    <div className="match-score-layout">
      <div className={`team-block ${recorded&&winner==='team1'?'is-winner':''} ${recorded&&winner==='team2'?'is-loser':''}`}>
        <strong>{match.team1}</strong>
        {recorded&&winner==='team1'&&<span className="winner-label">{archiveCopy[language].winner}</span>}
      </div>
      <div className="score-block" aria-label={recorded?`${match.score1} ${ar?'مقابل':'versus'} ${match.score2}`:matchUiCopy[language].resultPending}>
        {recorded?<><b>{match.score1}</b><i>:</i><b>{match.score2}</b></>:<span className="result-pending-label">{matchUiCopy[language].resultPending}</span>}
        {recorded&&winner==='draw'&&<span className="result-label">{archiveCopy[language].draw}</span>}
      </div>
      <div className={`team-block team-block-right ${recorded&&winner==='team2'?'is-winner':''} ${recorded&&winner==='team1'?'is-loser':''}`}>
        <strong>{match.team2}</strong>
        {recorded&&winner==='team2'&&<span className="winner-label">{archiveCopy[language].winner}</span>}
      </div>
    </div>
    </MatchScheduleBlock>
    {meta.length>0&&<div className="match-meta-row">{meta.map(item=><span key={item.text} className={item.secondary?'is-secondary':''}>{item.text}</span>)}</div>}
    {match.story&&<p className="match-story">{match.story}</p>}
    {match.details&&<div className="match-metrics">
      <span>{match.score1+match.score2}<small>{archiveCopy[language].goals}</small></span>
      <span>{match.details.team1.shots}<small>{archiveCopy[language].shots}</small></span>
      <span>{match.details.team2.shots}<small>{archiveCopy[language].oppShots}</small></span>
    </div>}
    {actions&&<div className="match-card-actions" onClick={event=>event.stopPropagation()}>{actions}</div>}
  </article>;
}

export { winnerFor };
