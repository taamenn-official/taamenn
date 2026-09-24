import { useEffect, useRef, useState } from 'react';
import { Accessibility, Bell, Database, Globe2, Mail, Moon, Sun, RotateCcw, Smartphone, Trash2, Download, Upload, HardDrive, Wifi, BadgeCheck, LogOut, X, AlertTriangle, BookOpen, CheckCircle2, XCircle, LifeBuoy } from 'lucide-react';
import type { LocalProfile } from '../services/profileRepository';
import { saveProfile } from '../services/profileRepository';
import { clearNotifications } from '../services/notificationService';
import { getItem, putItem, exportTaamenBackup, importTaamenBackup, BackupError, isBackupFileTooLarge, readBackupFile } from '../services/localDb';
import { installService } from '../infrastructure/pwa/installService';
import { CaptureWallet } from '../components/CaptureWallet';
import FeaturedMember from '../components/FeaturedMember';
import HowToGuide from '../components/HowToGuide';
import type { Session } from '../services/apiClient';
import { resetTaamenComplete, type ResetResult } from '../services/resetService';
import Support from './Support';
import { shellCopy, uiCopy } from '../i18n/translations';
import { LanguageSwitch, ThemeToggle } from '../components/ShellControls';
import type { TaamenTheme } from '../theme/theme';
import { applyMotionPreference } from '../motion/prefersReduced';
import { syncAhrefsAnalytics } from '../services/analytics';
import { useOverlayPresence } from '../motion/useOverlayPresence';

type PrivacyPrefs={notifications?:boolean;analytics?:boolean;motion?:boolean};

export default function Settings({language,profile,onLanguage,theme,onTheme,onReset,onProfile,session=null,onSession,onSignOut}:{language:'ar'|'en';profile:LocalProfile;onLanguage:()=>void;theme:TaamenTheme;onTheme:()=>void;onReset:()=>void;onProfile:(p:LocalProfile)=>void;session?:Session|null;onSession:(s:Session)=>void;onSignOut:()=>void}){
 const ar=language==='ar';
 const copy=uiCopy[language];
 const recognized=session?.authMethod==='code';
 const [p,setP]=useState(profile); const [showRecognition,setShowRecognition]=useState(false);
 const [notify,setNotify]=useState(true); const [analytics,setAnalytics]=useState(false); const [motion,setMotion]=useState(true);
 const [status,setStatus]=useState(''); const restoreRef=useRef<HTMLInputElement>(null);
 const [showResetModal,setShowResetModal]=useState(false); const [resetting,setResetting]=useState(false);
 const [resetResult,setResetResult]=useState<ResetResult | null>(null);
 const [showGuide,setShowGuide]=useState(false);
 const [showSupport,setShowSupport]=useState(false);
 useEffect(()=>{setP(profile)},[profile]);
 useEffect(()=>{getItem<PrivacyPrefs&{id:string}>('settings','privacy').then(v=>{if(v){setNotify(v.notifications!==false);setAnalytics(v.analytics===true);setMotion(v.motion!==false)}})},[]);
 // The switch now drives real motion through html[data-taamen-motion].
 useEffect(()=>{applyMotionPreference(motion)},[motion]);
 useEffect(()=>{
  if(!showResetModal)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')closeResetModal()};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[showResetModal,resetting]);
 const persistPrefs=(next:PrivacyPrefs)=>putItem('settings',{id:'privacy',notifications:notify,analytics,motion,...next});
 const saveEmail=async(email:string)=>{const next=await saveProfile({...p,email:email.trim(),emailVerified:false,verifiedAt:undefined});setP(next);onProfile(next)};
 const backup=async()=>{try{const data=await exportTaamenBackup();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`taamen-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);setStatus(uiCopy[language].backupExported)}catch{setStatus(uiCopy[language].backupExportFailed)}};
 const restore=async(file?:File)=>{if(!file)return;try{if(isBackupFileTooLarge(file.size))throw new BackupError('invalid');await importTaamenBackup(await readBackupFile(file));setStatus(uiCopy[language].backupImported);setTimeout(()=>location.reload(),500)}catch(caught){setStatus(caught instanceof BackupError&&caught.code==='unsupported-version'?uiCopy[language].backupUnsupported:uiCopy[language].backupInvalid)}};
 const startReset=()=>{setShowResetModal(true);setResetting(false);setResetResult(null)};
 const resetOverlay=useOverlayPresence<HTMLDivElement,HTMLDivElement>('modal',()=>setShowResetModal(false),showResetModal);
 const closeResetModal=()=>{if(!resetting)resetOverlay.requestClose()};
 const handleBackdropClick=(e:React.MouseEvent)=>{if(e.target===e.currentTarget)closeResetModal()};
 const executeReset=async()=>{
  setResetting(true);
  try{
    const result=await resetTaamenComplete();
    setResetResult(result);
    if(result.success){
      await onReset();
      setShowResetModal(false);
      setTimeout(()=>location.reload(),100);
    }else{
      setResetting(false);
    }
  }catch{
    setResetResult({success:false,clearedStores:[],errors:[copy.resetModalUnexpected]});
    setResetting(false);
  }
};
 if(showRecognition&&!session)return <FeaturedMember language={language} onClose={()=>setShowRecognition(false)} onRecognized={next=>{onSession(next);setShowRecognition(false)}}/>;
 if(showSupport)return <Support language={language} profile={p} onBack={()=>setShowSupport(false)}/>;
 return <section className="page-content settings-page">
   <div className="page-heading"><div><p className="eyebrow">TAAMEN 2.0 / SETTINGS</p><h1>{ar?'الإعدادات':'Settings'}</h1><p className="subtitle">{ar?'تحكم بالتجربة والبيانات المحلية والخصوصية دون حساب للمستخدم العادي.':'Control your local TAAMEN experience, data and privacy without a normal-user account.'}</p></div><div className="setting-actions"><button className="dark-action" onClick={()=>setShowGuide(true)}><BookOpen size={15}/>{ar?'دليل الاستخدام':'How-to Guide'}</button></div></div>
   {status&&<div className="success-banner">{status}</div>}
   {showResetModal&&<div className="overlay" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title"><div ref={resetOverlay.backdropRef} className="overlay-backdrop" onClick={handleBackdropClick}/><div ref={resetOverlay.panelRef} className="modal-card danger-modal"><div className="panel-heading"><div><p className="eyebrow">SECURITY & DATA</p><h2 id="reset-modal-title">{copy.resetModalTitle}</h2></div><button className="icon-button" onClick={closeResetModal} disabled={resetting} aria-label={copy.resetModalCancel}><X/></button></div><div className="danger-modal-content">{!resetResult?<>
    <AlertTriangle size={28} className="danger-icon"/>
    <p>{copy.resetModalBody}</p>
    <div className="reset-scope">
      <strong>{copy.resetModalRemovedLabel}</strong>
      <p>{copy.resetModalRemoved}</p>
    </div>
    <div className="reset-not-removed">
      <strong>{copy.resetModalKeptLabel}</strong>
      <p>{copy.resetModalKept}</p>
    </div>
    <p className="danger-warning">{copy.resetModalWarning}</p>
    <div className="modal-actions">
      <button type="button" className="text-button" onClick={closeResetModal} disabled={resetting}>{copy.resetModalCancel}</button>
      <button type="button" className="primary-action danger" onClick={executeReset} disabled={resetting}>{copy.resetModalConfirm}</button>
    </div>
  </>:<>
    {resetResult.success?<><CheckCircle2 size={28} className="success-icon"/><p>{copy.resetModalSuccess}</p><p className="danger-warning">{copy.resetModalReloading}</p></>:<>
      <XCircle size={28} className="danger-icon"/><p>{copy.resetModalFailed}</p>
      {resetResult.errors.length>0&&<div className="error-list"><strong>{copy.resetModalErrors}</strong><ul>{resetResult.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
      <button type="button" className="primary-action" onClick={()=>setShowResetModal(false)}>{copy.closeViewer}</button>
    </>}
  </>}</div></div></div>}
   <HowToGuide language={language} open={showGuide} onClose={()=>setShowGuide(false)}/>
   <div className="settings-grid">
    <section className="panel settings-panel featured-setting-panel">
      <div className="panel-heading"><div><p className="eyebrow">TAAMEN / FEATURED</p><h2>{recognized?(ar?'وضع العضو المميز':'Featured member mode'):(ar?'هل أنت عضو مميز؟':'Are you a Featured Member?')}</h2></div><BadgeCheck size={18}/></div>
      {recognized&&session?<><div className="featured-active"><strong>{ar?(session.member.arabicName||session.member.displayName):session.member.displayName}</strong><span>{ar?'وصول للقراءة فقط إلى السجل التاريخي':'Read-only historical archive access'}</span></div><button className="dark-action" onClick={onSignOut}><LogOut size={15}/>{ar?'العودة للمستخدم العام':'Return to General User'}</button></>:<button className="primary-action" onClick={()=>setShowRecognition(true)}>{ar?'دخول أعضاء TAAMEN':'TAAMEN member access'}</button>}
    </section>
    <section className="panel settings-panel"><div className="panel-heading"><div><p className="eyebrow">PREFERENCES</p><h2>{ar?'المظهر واللغة':'Appearance & language'}</h2></div></div><div className="setting-row"><span><Globe2 size={16}/>{ar?'اللغة':'Language'}</span><LanguageSwitch language={language} onLanguage={onLanguage}/></div><div className="setting-row"><span>{theme==='dark'?<Moon size={16}/>:<Sun size={16}/>}{shellCopy[language].themeLabel}</span><span className="status-chip muted">{theme==='dark'?shellCopy[language].themeDark:shellCopy[language].themeLight}</span><ThemeToggle theme={theme} onTheme={onTheme} language={language}/></div><div className="setting-row"><span><Moon size={16}/>{ar?'الحركة':'Motion'}</span><input type="checkbox" checked={motion} onChange={e=>{setMotion(e.target.checked);persistPrefs({motion:e.target.checked})}}/></div><div className="setting-row"><span><Accessibility size={16}/>{ar?'إتاحة الوصول':'Accessibility'}</span><span className="status-chip muted">{ar?'مراعية للنظام':'System aware'}</span></div></section>
    <section className="panel settings-panel"><div className="panel-heading"><div><p className="eyebrow">NOTIFICATIONS & PRIVACY</p><h2>{ar?'التحكم المحلي':'Local controls'}</h2></div></div><div className="setting-row"><span><Bell size={16}/>{ar?'الإشعارات':'Notifications'}</span><input type="checkbox" checked={notify} onChange={e=>{setNotify(e.target.checked);persistPrefs({notifications:e.target.checked})}}/></div><div className="setting-row"><span>{ar?'التحليلات':'Analytics'}</span><input type="checkbox" checked={analytics} aria-label={ar?'التحليلات':'Analytics'} onChange={e=>{const next=e.target.checked;setAnalytics(next);persistPrefs({analytics:next});syncAhrefsAnalytics(next)}}/></div><p className="settings-note"><a className="policy-link" href="/privacy">{copy.privacyPolicyTitle}</a> · <a className="policy-link" href="/terms">{copy.termsTitle}</a></p><button className="text-button danger" onClick={()=>clearNotifications()}><Trash2 size={14}/>{ar?'حذف الإشعارات المحلية':'Clear local notifications'}</button></section>
    <section className="panel settings-panel"><div className="panel-heading"><div><p className="eyebrow">EMAIL</p><h2>{ar?'بريد الملف':'Profile email'}</h2></div><Mail size={17}/></div><label>{ar?'بريد الملف':'Profile email'} <span className="optional">{ar?'اختياري':'Optional'}</span><input type="email" value={p.email} onChange={e=>setP(x=>({...x,email:e.target.value,emailVerified:false,verifiedAt:undefined}))} onBlur={()=>saveEmail(p.email)}/></label><div className="profile-status-row"><span className={p.emailVerified?'status-chip':'status-chip muted'}>{p.emailVerified?(ar?'البريد مؤكد':'Email verified'):(p.email?(ar?'غير مؤكد':'Not verified'):(ar?'غير مضاف':'Not added'))}</span></div><div className="verify-box frozen"><div><strong>{ar?'التحقق من البريد — قريبًا':'Email verification — Coming Soon'}</strong><small>{ar?'ميزة التحقق مجمّدة حاليًا ولن تبدأ أي عملية وهمية. ستتوفر عند إعداد مسار التحقق الفعلي.':'Verification is frozen until a real verification flow is configured. No fake verification process will run.'}</small></div><button className="dark-action" disabled aria-disabled="true">{ar?'قريبًا':'Coming Soon'}</button></div><p className="settings-note">{ar?'لمراسلة فريق TAAMEN استخدم صفحة الدعم.':'To message the TAAMEN team, use the Support page.'}</p></section>
    <section className="panel settings-panel"><div className="panel-heading"><div><p className="eyebrow">STORAGE</p><h2>{ar?'البيانات والتثبيت':'Data & installation'}</h2></div><Database size={17}/></div><div className="setting-row"><span><HardDrive size={16}/>{ar?'التخزين المحلي':'Local storage'}</span><span className="status-chip">IndexedDB</span></div><div className="setting-row"><span><Wifi size={16}/>{ar?'الشبكة':'Network'}</span><span className="status-chip">{navigator.onLine?(ar?'متصل':'Online'):(ar?'دون اتصال':'Offline')}</span></div><div className="backup-actions"><button className="dark-action" onClick={backup}><Download size={14}/>{ar?'تصدير البيانات':'Export data'}</button><button className="dark-action" onClick={()=>restoreRef.current?.click()}><Upload size={14}/>{ar?'استيراد البيانات':'Import data'}</button><input ref={restoreRef} hidden type="file" accept="application/json,.json" onChange={e=>restore(e.target.files?.[0])}/></div><CaptureWallet language={language} embedded/><div className="setting-row"><span><Smartphone size={16}/>{ar?'تثبيت TAAMEN':'Install TAAMEN'}</span><span className="status-chip">{installService.getInstallationState()}</span></div>{installService.canPromptInstall()&&<button className="primary-action" onClick={()=>installService.promptInstall()}>{ar?'تثبيت الآن':'Install now'}</button>}</section>
    <section className="panel settings-panel support-entry-panel"><div className="panel-heading"><div><p className="eyebrow">SUPPORT</p><h2>{ar?'الدعم والتواصل':'Support & Contact'}</h2></div><LifeBuoy size={17}/></div><p>{ar?'تواصل مع فريق TAAMEN للحصول على المساعدة أو إرسال ملاحظاتك.':'Contact the TAAMEN team for help or send your feedback.'}</p><button className="primary-action" onClick={()=>setShowSupport(true)}><LifeBuoy size={15}/>{ar?'فتح الدعم والتواصل':'Open Support'}</button></section>
    <section className="panel settings-panel about-setting-panel"><div className="panel-heading"><div><p className="eyebrow">ABOUT</p><h2>{copy.acquisitionSettingsTitle}</h2></div></div><p>{copy.acquisitionSettingsBody}</p><a className="dark-action" href="/acquisition">{copy.acquisitionSettingsOpen}</a></section>
    <section className="panel settings-panel danger-zone"><div className="panel-heading"><div><p className="eyebrow">SECURITY & DATA</p><h2>{ar?'إعادة ضبط بيانات TAAMEN':'Reset TAAMEN Data'}</h2></div><RotateCcw size={18}/></div><p>{ar?'يحذف جميع بيانات TAAMEN المحلية من هذا المتصفح ويعيد التطبيق إلى حالته الأولية.':'Removes all TAAMEN local data from this browser and returns the application to its initial setup state.'}</p><p className="danger-zone-note">{ar?'لا يحذف بيانات المواقع الأخرى أو سجل المتصفح.':'Does not delete other websites\' data or browser history.'}</p><button className="danger-action" onClick={startReset}><RotateCcw size={15}/>{ar?'إعادة ضبط البيانات المحلية':'Reset local data'}</button></section>
   </div>
 </section>;
}
