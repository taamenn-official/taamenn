import { useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import type { Match } from '../data/footballData';
import { shareUiCopy, type Language } from '../i18n/translations';
import { useOverlayPresence } from '../motion/useOverlayPresence';
import { shareMatch } from '../services/shareService';
import MatchScheduleBlock from './MatchScheduleBlock';

export default function MatchShareModal({match,language,onClose}:{match:Match;language:Language;onClose:()=>void}){
  const copy=shareUiCopy[language];
  const[allowSave,setAllowSave]=useState(false);
  const[includeContributions,setIncludeContributions]=useState(false);
  const[busy,setBusy]=useState(false);
  const[url,setUrl]=useState('');
  const[status,setStatus]=useState<{kind:'ok'|'err';text:string}|null>(null);
  const hasContributions=Boolean(match.playerContributions?.team1.length||match.playerContributions?.team2.length);
  const{backdropRef,panelRef,requestClose}=useOverlayPresence<HTMLButtonElement,HTMLElement>('modal',onClose);
  const send=async()=>{
    setBusy(true);setStatus(null);
    try{
      const result=await shareMatch(match,{allowSave,includeContributions:hasContributions&&includeContributions});
      setUrl(result.url);
      setStatus({kind:'ok',text:result.method==='shared'?copy.shared:result.method==='copied'?copy.copied:copy.linkReady});
    }catch{setStatus({kind:'err',text:copy.failed})}finally{setBusy(false)}
  };
  return <div className="overlay match-share-overlay" role="dialog" aria-modal="true" aria-labelledby="share-match-title">
    <button ref={backdropRef} className="overlay-backdrop" onClick={requestClose} aria-label={copy.returnHome}/>
    <aside ref={panelRef} className="modal-card match-share-modal">
      <header className="panel-heading"><div><p className="eyebrow">TAAMEN / SHARE</p><h2 id="share-match-title">{copy.title}</h2></div><button className="icon-button" onClick={requestClose} aria-label={copy.returnHome}><X/></button></header>
      <div className="share-football-motion" aria-hidden="true"><i/><i/><i/><i/><i/></div>
      <section className="share-match-preview">
        <small>{copy.preview}</small>
        <MatchScheduleBlock match={match} language={language} variant="compact">
          <div><strong>{match.team1}</strong><span>{match.score1} : {match.score2}</span><strong>{match.team2}</strong></div>
        </MatchScheduleBlock>
      </section>
      <label className="share-permission-card">
        <input type="checkbox" checked={allowSave} onChange={event=>setAllowSave(event.target.checked)}/>
        <span><strong>{copy.allowSave}</strong><small>{allowSave?copy.allowSaveOn:copy.allowSaveOff}</small></span>
        <em>{allowSave?copy.viewAndSave:copy.viewOnly}</em>
      </label>
      {hasContributions&&<label className="share-permission-card compact">
        <input type="checkbox" checked={includeContributions} onChange={event=>setIncludeContributions(event.target.checked)}/>
        <span><strong>{copy.contributions}</strong><small>{copy.includesContributions}</small></span>
      </label>}
      {url&&<label className="share-link-field">{copy.linkLabel}<input readOnly value={url} onFocus={event=>event.currentTarget.select()}/></label>}
      {status&&<div className={status.kind==='ok'?'success-banner':'error-banner'} role={status.kind==='err'?'alert':'status'}><Check size={15}/>{status.text}</div>}
      <div className="modal-actions"><button className="dark-action" onClick={requestClose}>{copy.returnHome}</button><button className="primary-action" onClick={send} disabled={busy}><Share2 size={15}/>{busy?copy.generating:copy.generate}</button></div>
    </aside>
  </div>;
}
