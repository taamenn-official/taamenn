import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Download, Trophy } from 'lucide-react';
import { decodeMatchShare, materializeSharedMatch } from '../services/shareService';
import { decodeProfileShare } from '../services/profileShareService';
import { importSharedMatch, inspectSharedMatch } from '../services/matchRepository';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from '../config/branding';
import { shareUiCopy, uiCopy, type Language } from '../i18n/translations';
import { isArchiveStatus } from '../services/matchLifecycle';
import type { SharedImportKind } from '../services/shareService';
import { LanguageSwitch } from './ShellControls';
import MatchScheduleBlock from './MatchScheduleBlock';

function ReturnHome({label,onHome}:{label:string;onHome:()=>void}){
  return <button type="button" className="return-home" onClick={onHome} aria-label={label}><ArrowLeft size={16} aria-hidden="true"/><span>{label}</span></button>;
}

export default function PublicSharePreview({language,kind,token,onHome,onLanguage}:{language:Language;kind:'match'|'profile';token:string;onHome:()=>void;onLanguage:()=>void}){
  const copy=uiCopy[language];
  const shareCopy=shareUiCopy[language];
  const payload=useMemo(()=>kind==='match'?decodeMatchShare(token):null,[kind,token]);
  const profile=useMemo(()=>kind==='profile'?decodeProfileShare(token):null,[kind,token]);
  const match=useMemo(()=>payload?materializeSharedMatch(payload):null,[payload]);
  const destination: 'match-center'|'archive' = payload && isArchiveStatus(payload.status) ? 'archive' : 'match-center';
  const [importing,setImporting]=useState(false);
  const [result,setResult]=useState<'created'|'up-to-date'|'updated'|null>(null);
  const [inspectKind,setInspectKind]=useState<SharedImportKind|'loading'>('loading');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!payload?.allowSave){
      setInspectKind('new');
      return;
    }
    let active=true;
    inspectSharedMatch(payload).then((decision)=>{
      if(active)setInspectKind(decision.kind);
    }).catch(()=>{
      if(active)setInspectKind('new');
    });
    return()=>{active=false};
  },[payload]);

  const shell=(body:ReactNode)=> <div className="access-screen"><div className="access-card share-preview-screen">
    <header className="share-page-header">
      <ReturnHome label={shareCopy.returnToTaamen} onHome={onHome}/>
      <LanguageSwitch language={language} onLanguage={onLanguage}/>
    </header>
    <div className="access-brand"><div className="brand-mark"><img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT}/></div><div><b>TAAMEN 2.0</b><small>{kind==='profile'?'PROFILE':'MATCH'}</small></div></div>
    {body}
  </div></div>;

  if(kind==='match'&&!match)return shell(<><h1>{copy.shareInvalid}</h1><p>{copy.shareInvalidBody}</p></>);
  if(kind==='profile'&&!profile)return shell(<><h1>{copy.shareInvalid}</h1><p>{copy.shareInvalidBody}</p></>);

  if(result)return shell(<>
    <h1>{result==='up-to-date'?copy.shareUpToDateTitle:result==='updated'?copy.shareUpdatedTitle:copy.shareSuccess}</h1>
    <p>{result==='up-to-date'?copy.shareUpToDateBody:result==='updated'?copy.shareUpdatedBody:copy.shareSuccessBody}</p>
  </>);

  const add=async(options?:{replace?:boolean;saveAsNew?:boolean})=>{
    if(!match)return;
    setImporting(true);
    setError('');
    try{
      if(!payload)throw new Error('invalid-share');
      const status=await importSharedMatch(payload,destination,options);
      if(status==='collision'||status==='update-available'){
        setInspectKind(status);
        return;
      }
      setResult(status==='updated'||status==='up-to-date'||status==='created'?status:'created');
    }catch{
      setError(copy.shareFailure);
    }finally{
      setImporting(false);
    }
  };

  const hasContributions=Boolean(match?.playerContributions&&(match.playerContributions.team1.length>0||match.playerContributions.team2.length>0));
  const canSave=Boolean(payload?.allowSave);

  return shell(<>
    {kind==='profile'&&profile?<div className="shared-profile-card">{profile.bannerData&&<div className="shared-profile-banner" style={{backgroundImage:`url(${profile.bannerData})`}}/>}{profile.avatarData&&<img className="shared-profile-avatar" src={profile.avatarData} alt=""/>}<span className="eyebrow">PUBLIC PROFILE</span><h1>{profile.displayName}</h1>{profile.publicRole&&<span className="status-chip">{profile.publicRole}</span>}<p className="settings-note">{language==='ar'?'هذه معاينة عامة آمنة؛ لا تحتوي البريد أو الهاتف أو بيانات الفريق الخاص.':'Safe public preview. Email, phone and private team data are excluded.'}</p></div>
    :match&&<div className="shared-match-layout">
      <span className="eyebrow">{String(match.type||'normal').toUpperCase()}</span>
      <h1>{match.title||`${match.team1} × ${match.team2}`}</h1>
      <MatchScheduleBlock match={match} language={language} variant="share"/>
      <div className="shared-vs">
        <strong>{match.team1}</strong>
        <b>{match.status==='UPCOMING'||match.status==='ACTIVE'?'VS':`${match.score1} : ${match.score2}`}</b>
        <strong>{match.team2}</strong>
      </div>
      {(match.stadium||match.city)&&<p className="schedule-venue">{match.stadium}{match.stadium&&match.city?' · ':''}{match.city}</p>}
      <span className={`share-mode-badge ${payload?.allowSave?'can-save':'view-only'}`}>{payload?.allowSave?shareCopy.viewAndSave:shareCopy.viewOnly}</span>
      {hasContributions&&<div className="contributions-note"><Trophy size={14} aria-hidden="true"/><span>{shareCopy.includesContributions}</span></div>}
      {canSave&&inspectKind==='new'&&<p className="settings-note">{isArchiveStatus(match.status)?copy.shareArchive:copy.shareMatchCenter}</p>}
      {canSave&&inspectKind==='up-to-date'&&<p className="settings-note">{copy.shareUpToDateBody}</p>}
      {canSave&&inspectKind==='update-available'&&<p className="settings-note">{copy.shareUpdateAvailableBody}</p>}
      {canSave&&inspectKind==='collision'&&<p className="settings-note">{copy.shareCollisionBody}</p>}
      {error&&<div className="error-banner" role="alert">{error}</div>}
      <div className="share-actions">
        {canSave&&inspectKind==='loading'&&<button className="primary-action" disabled>{copy.shareInspecting}</button>}
        {canSave&&inspectKind==='new'&&<button className="primary-action" onClick={()=>void add()} disabled={importing}><Download className="icon-import" size={15}/>{importing?copy.shareSaving:shareCopy.importMatch}</button>}
        {canSave&&inspectKind==='up-to-date'&&<button className="primary-action" disabled>{copy.shareUpToDateTitle}</button>}
        {canSave&&inspectKind==='update-available'&&<>
          <button className="dark-action" onClick={onHome} disabled={importing}>{copy.shareKeepCurrent}</button>
          <button className="primary-action" onClick={()=>void add({replace:true})} disabled={importing}>{importing?copy.shareSaving:copy.shareReplace}</button>
        </>}
        {canSave&&inspectKind==='collision'&&<button className="primary-action" onClick={()=>void add({saveAsNew:true})} disabled={importing}>{importing?copy.shareSaving:copy.shareSaveAsNew}</button>}
      </div>
      <p className="settings-note">{canSave?copy.shareConfirmNote:shareCopy.saveBlocked}</p>
    </div>}
  </>);
}
